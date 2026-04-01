"""Web-based Basketball Franchise Manager — Flask application."""

from __future__ import annotations

import random
import uuid
from flask import Flask, render_template, request, redirect, url_for, session, jsonify

from basketball_gm.league import League, create_league
from basketball_gm.season import Season
from basketball_gm.playoffs import (
    PlayoffBracket, create_playoff_bracket, sim_series_game,
    sim_playoff_round, sim_full_playoffs, _pick_finals_mvp,
)
from basketball_gm.draft import generate_draft_class, run_draft_lottery, run_draft
from basketball_gm.free_agency import (
    get_free_agents_sorted, desired_salary, sign_player,
    release_player, ai_free_agency, expire_contracts,
)
from basketball_gm.trade import (
    TradeProposal, validate_trade, ai_accepts_trade,
    execute_trade, player_trade_value,
)
from basketball_gm.development import develop_players, compute_awards
from basketball_gm.game_sim import accumulate_player_stats
from basketball_gm.stats import get_league_leaders

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = "basketball-gm-secret-key-change-in-production"

# In-memory game state (keyed by session)
games: dict[str, dict] = {}


def get_game() -> dict | None:
    gid = session.get("game_id")
    if gid and gid in games:
        return games[gid]
    return None


def create_game_state(league: League, rng: random.Random) -> dict:
    return {
        "league": league,
        "season_obj": None,
        "bracket": None,
        "rng": rng,
        "messages": [],
        "draft_class": None,
        "draft_order": None,
    }


# ── Routes ──────────────────────────────────────────────────────────


@app.route("/")
def index():
    game = get_game()
    if game:
        return redirect(url_for("dashboard"))
    return render_template("index.html")


@app.route("/new_game", methods=["POST"])
def new_game():
    seed = random.randint(0, 999999)
    league = create_league(seed=seed)
    rng = random.Random(seed)
    gid = str(uuid.uuid4())
    games[gid] = create_game_state(league, rng)
    session["game_id"] = gid
    return redirect(url_for("select_team"))


@app.route("/select_team", methods=["GET", "POST"])
def select_team():
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    league = game["league"]

    if request.method == "POST":
        team_id = int(request.form["team_id"])
        league.user_team_id = team_id
        league.phase = "preseason"
        return redirect(url_for("dashboard"))

    teams_data = []
    for t in league.teams:
        teams_data.append({
            "id": t.id, "full_name": t.full_name, "abbr": t.abbr,
            "conference": t.conference, "division": t.division,
            "overall": t.team_overall(),
        })
    return render_template("select_team.html", teams=teams_data)


@app.route("/dashboard")
def dashboard():
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    league = game["league"]
    team = league.user_team
    if not team:
        return redirect(url_for("select_team"))

    phase = league.phase
    season_obj = game.get("season_obj")
    messages = game.get("messages", [])
    game["messages"] = []  # clear after display

    # Build context
    ctx = {
        "team": team,
        "league": league,
        "phase": phase,
        "messages": messages,
        "season": league.season,
    }

    if season_obj:
        ctx["games_played"] = season_obj.games_played
        ctx["total_games"] = len(season_obj.schedule)
        ctx["current_day"] = season_obj.current_day
        ctx["season_complete"] = season_obj.season_complete

    if game.get("bracket"):
        bracket = game["bracket"]
        ctx["bracket"] = bracket
        ctx["playoffs_complete"] = bracket.playoffs_complete

    return render_template("dashboard.html", **ctx)


@app.route("/action/<action>", methods=["POST"])
def do_action(action):
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    league = game["league"]
    rng = game["rng"]

    if action == "start_season":
        season_obj = Season(league=league)
        season_obj.initialize(seed=rng.randint(0, 999999))
        game["season_obj"] = season_obj
        league.phase = "regular_season"
        game["messages"].append(f"Season {league.season} has begun!")

    elif action == "sim_day":
        season_obj = game.get("season_obj")
        if season_obj and not season_obj.season_complete:
            results = season_obj.sim_day()
            user_id = league.user_team_id
            for r in results:
                if r.home_team_id == user_id or r.away_team_id == user_id:
                    home = league.get_team(r.home_team_id)
                    away = league.get_team(r.away_team_id)
                    ot = f" (OT{r.overtime_periods})" if r.overtime_periods else ""
                    game["messages"].append(
                        f"{away.abbr} {r.away_score} @ {home.abbr} {r.home_score}{ot}")
            _check_season_end(game)

    elif action == "sim_week":
        season_obj = game.get("season_obj")
        if season_obj and not season_obj.season_complete:
            results = season_obj.sim_week()
            team = league.user_team
            user_results = [r for r in results
                            if r.home_team_id == team.id or r.away_team_id == team.id]
            wins = sum(1 for r in user_results if r.winner_id == team.id)
            losses = len(user_results) - wins
            game["messages"].append(f"Week simulated: {wins}-{losses} this week, {team.record} overall")
            _check_season_end(game)

    elif action == "sim_month":
        season_obj = game.get("season_obj")
        if season_obj and not season_obj.season_complete:
            results = season_obj.sim_days(30)
            team = league.user_team
            game["messages"].append(f"Month simulated: {team.record}")
            _check_season_end(game)

    elif action == "sim_rest":
        season_obj = game.get("season_obj")
        if season_obj and not season_obj.season_complete:
            season_obj.sim_rest_of_season()
            game["messages"].append(f"Regular season complete! {league.user_team.record}")
            league.phase = "playoffs"

    elif action == "start_playoffs":
        bracket = create_playoff_bracket(league)
        game["bracket"] = bracket
        league.phase = "playoffs"
        game["messages"].append("Playoffs have begun!")

    elif action == "sim_playoff_round":
        bracket = game.get("bracket")
        if bracket and not bracket.playoffs_complete:
            sim_playoff_round(bracket, league, rng)
            if bracket.round_complete:
                if bracket.current_round == 3:
                    finals = bracket.current_series_list[0]
                    bracket.champion_id = finals.winner_id
                    bracket.finals_mvp_id = _pick_finals_mvp(finals, league)
                else:
                    bracket.advance_round(league)
            _check_playoffs_end(game)

    elif action == "sim_all_playoffs":
        bracket = game.get("bracket")
        if bracket and not bracket.playoffs_complete:
            sim_full_playoffs(bracket, league, rng)
            _check_playoffs_end(game)

    elif action == "start_offseason":
        _run_offseason(game)

    elif action == "start_draft":
        _run_draft_auto(game)

    elif action == "start_free_agency":
        _run_free_agency(game)

    elif action == "next_season":
        league.season += 1
        league.phase = "preseason"
        game["season_obj"] = None
        game["bracket"] = None
        for team in league.teams:
            team.reset_season()
        game["messages"].append(f"Welcome to Season {league.season}!")

    return redirect(url_for("dashboard"))


def _check_season_end(game):
    season_obj = game.get("season_obj")
    league = game["league"]
    if season_obj and season_obj.season_complete:
        game["messages"].append("Regular season complete!")
        league.phase = "playoffs"


def _check_playoffs_end(game):
    bracket = game.get("bracket")
    league = game["league"]
    if bracket and bracket.playoffs_complete:
        champ = league.get_team(bracket.champion_id)
        mvp_player, _ = league.find_player(bracket.finals_mvp_id) if bracket.finals_mvp_id else (None, None)
        game["messages"].append(f"CHAMPION: {champ.full_name}!")
        if mvp_player:
            game["messages"].append(f"Finals MVP: {mvp_player.name}")
        league.history.append({
            "season": league.season,
            "champion": champ.full_name,
            "champion_record": champ.record,
            "finals_mvp": mvp_player.name if mvp_player else "Unknown",
        })
        league.phase = "offseason"


def _run_offseason(game):
    league = game["league"]
    rng = game["rng"]

    awards = compute_awards(league)
    msgs = []
    for award, data in awards.items():
        if award != "All-NBA First Team":
            msgs.append(f"{award}: {data['name']} ({data['team']}) - {data['stats']}")

    for t in league.teams:
        for p in t.roster:
            p.archive_season(league.season)
    for p in league.free_agents:
        p.archive_season(league.season)

    dev = develop_players(league, rng)
    msgs.append(f"Development: {len(dev['improved'])} improved, {len(dev['declined'])} declined, {len(dev['retired'])} retired")

    expired = expire_contracts(league)
    msgs.append(f"{len(expired)} contracts expired")

    game["messages"] = msgs
    league.phase = "draft"


def _run_draft_auto(game):
    league = game["league"]
    rng = game["rng"]

    draft_class = generate_draft_class(rng=rng)
    draft_order = run_draft_lottery(league, rng)

    # Auto-draft for all teams (including user for web version)
    msgs = []
    available = list(draft_class)
    pick_num = 0
    for round_num in range(1, 3):
        for team_id in draft_order:
            if not available:
                break
            team = league.get_team(team_id)
            if not team:
                continue
            pick_num += 1

            # Best available by scouted overall with some need-based adjustment
            best = available[0]
            for prospect in available[:5]:
                if prospect.scouted_overall > best.scouted_overall:
                    best = prospect

            salary = get_rookie_salary(pick_num)
            from basketball_gm.player import Contract
            best.player.contract = Contract(salary=salary, years=min(4, 5 - round_num))
            best.player.draft_year = league.season
            best.player.draft_pick = pick_num
            team.add_player(best.player)
            available.remove(best)

            if team_id == league.user_team_id:
                msgs.append(f"You drafted {best.player.name} ({best.player.position}, OVR {best.player.overall}) with pick #{pick_num}")

    game["messages"] = msgs
    league.phase = "free_agency"


def _run_free_agency(game):
    league = game["league"]
    rng = game["rng"]

    log = ai_free_agency(league, rng)
    game["messages"] = [f"Free agency: {len(log)} signings made"]
    league.phase = "next_season"


# ── Data endpoints ──────────────────────────────────────────────────


@app.route("/standings")
def standings():
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    league = game["league"]

    east = [{"rank": i+1, "name": t.full_name, "abbr": t.abbr, "wins": t.wins,
             "losses": t.losses, "pct": f"{t.win_pct:.3f}", "is_user": t.id == league.user_team_id}
            for i, t in enumerate(league.standings("Eastern"))]
    west = [{"rank": i+1, "name": t.full_name, "abbr": t.abbr, "wins": t.wins,
             "losses": t.losses, "pct": f"{t.win_pct:.3f}", "is_user": t.id == league.user_team_id}
            for i, t in enumerate(league.standings("Western"))]

    return render_template("standings.html", east=east, west=west, league=league)


@app.route("/roster")
@app.route("/roster/<int:team_id>")
def roster(team_id=None):
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    league = game["league"]
    if team_id is None:
        team_id = league.user_team_id
    team = league.get_team(team_id)
    if not team:
        return redirect(url_for("dashboard"))

    players = []
    starters = team.get_starters()
    starter_ids = {p.id for p in starters}
    for p in starters:
        players.append(_player_dict(p, True))
    bench = [p for p in team.roster if p.id not in starter_ids]
    bench.sort(key=lambda p: p.overall, reverse=True)
    for p in bench:
        players.append(_player_dict(p, False))

    all_teams = [{"id": t.id, "full_name": t.full_name, "abbr": t.abbr, "record": t.record}
                 for t in league.teams]

    return render_template("roster.html", team=team, players=players,
                           all_teams=all_teams, league=league)


@app.route("/leaders")
def leaders():
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    league = game["league"]

    all_players = league.all_players()
    team_lookup = {}
    for t in league.teams:
        for p in t.roster:
            team_lookup[p.id] = t.abbr

    categories = {}
    for cat in ["ppg", "rpg", "apg", "spg", "bpg"]:
        top = get_league_leaders(all_players, cat, top_n=10, min_games=3)
        categories[cat] = [
            {"name": p.name, "team": team_lookup.get(p.id, "???"),
             "position": p.position, "gp": p.season_stats.games,
             "value": f"{val:.1f}"}
            for p, val in top
        ]

    cat_labels = {"ppg": "Points", "rpg": "Rebounds", "apg": "Assists",
                  "spg": "Steals", "bpg": "Blocks"}
    return render_template("leaders.html", categories=categories,
                           cat_labels=cat_labels, league=league)


@app.route("/playoffs_view")
def playoffs_view():
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    league = game["league"]
    bracket = game.get("bracket")

    if not bracket:
        return redirect(url_for("dashboard"))

    rounds_data = []
    round_names = ["First Round", "Conference Semifinals", "Conference Finals", "NBA Finals"]
    for rd_idx, rd_series in enumerate(bracket.rounds):
        rd_name = round_names[rd_idx] if rd_idx < len(round_names) else f"Round {rd_idx+1}"
        series_list = []
        for s in rd_series:
            h = league.get_team(s.higher_seed_id)
            l = league.get_team(s.lower_seed_id)
            series_list.append({
                "higher": h.full_name if h else "TBD",
                "higher_abbr": h.abbr if h else "?",
                "higher_seed": s.higher_seed_rank,
                "lower": l.full_name if l else "TBD",
                "lower_abbr": l.abbr if l else "?",
                "lower_seed": s.lower_seed_rank,
                "higher_wins": s.higher_wins,
                "lower_wins": s.lower_wins,
                "complete": s.complete,
                "status": s.status_str(league),
                "conference": s.conference,
            })
        rounds_data.append({"name": rd_name, "series": series_list,
                            "is_current": rd_idx == bracket.current_round})

    champ = None
    mvp_name = None
    if bracket.champion_id:
        c = league.get_team(bracket.champion_id)
        champ = c.full_name if c else None
        if bracket.finals_mvp_id:
            mvp, _ = league.find_player(bracket.finals_mvp_id)
            mvp_name = mvp.name if mvp else None

    return render_template("playoffs.html", rounds=rounds_data, champ=champ,
                           mvp=mvp_name, league=league)


@app.route("/history")
def history():
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    return render_template("history.html", history=game["league"].history,
                           league=game["league"])


@app.route("/free_agents")
def free_agents_view():
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    league = game["league"]
    agents = get_free_agents_sorted(league)[:50]
    fa_data = [{
        "id": p.id, "name": p.name, "position": p.position,
        "overall": p.overall, "potential": p.potential, "age": p.age,
        "asking": f"${desired_salary(p)/1e6:.1f}M",
    } for p in agents]
    team = league.user_team
    return render_template("free_agents.html", agents=fa_data, team=team, league=league)


@app.route("/sign_fa", methods=["POST"])
def sign_fa():
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    league = game["league"]
    team = league.user_team

    player_id = int(request.form["player_id"])
    salary_m = float(request.form["salary"])
    years = int(request.form["years"])
    salary = int(salary_m * 1_000_000)

    player = None
    for p in league.free_agents:
        if p.id == player_id:
            player = p
            break

    if player:
        ok, msg = sign_player(team, player, league, salary, years)
        game["messages"].append(msg)
    else:
        game["messages"].append("Player not found.")

    return redirect(url_for("free_agents_view"))


@app.route("/release_player", methods=["POST"])
def release_player_route():
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    league = game["league"]
    team = league.user_team
    player_id = int(request.form["player_id"])
    ok, msg = release_player(team, player_id, league)
    game["messages"].append(msg)
    return redirect(url_for("roster"))


@app.route("/trade", methods=["GET", "POST"])
def trade_view():
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    league = game["league"]
    team = league.user_team

    if request.method == "POST":
        partner_id = int(request.form["partner_id"])
        offer_ids = [int(x) for x in request.form.getlist("offer")]
        request_ids = [int(x) for x in request.form.getlist("request")]

        if offer_ids and request_ids:
            proposal = TradeProposal(
                team1_id=team.id, team2_id=partner_id,
                team1_players=offer_ids, team2_players=request_ids,
            )
            valid, msg = validate_trade(proposal, league)
            if valid:
                accepted, msg = ai_accepts_trade(proposal, partner_id, league, game["rng"])
                if accepted:
                    result = execute_trade(proposal, league)
                    game["messages"].append(result)
                else:
                    game["messages"].append(msg)
            else:
                game["messages"].append(f"Invalid trade: {msg}")
        return redirect(url_for("trade_view"))

    other_teams = [{"id": t.id, "full_name": t.full_name, "abbr": t.abbr,
                    "record": t.record} for t in league.teams if t.id != team.id]

    # Selected partner
    partner_id = request.args.get("partner_id", type=int)
    partner = league.get_team(partner_id) if partner_id else None
    partner_players = []
    if partner:
        for p in partner.roster:
            partner_players.append(_player_dict(p, False))

    my_players = [_player_dict(p, False) for p in team.roster]

    return render_template("trade.html", team=team, other_teams=other_teams,
                           partner=partner, partner_players=partner_players,
                           my_players=my_players, league=league,
                           messages=game.get("messages", []))


@app.route("/quit_game", methods=["POST"])
def quit_game():
    gid = session.get("game_id")
    if gid and gid in games:
        del games[gid]
    session.clear()
    return redirect(url_for("index"))


def _player_dict(p, is_starter):
    return {
        "id": p.id, "name": p.name, "position": p.position,
        "overall": p.overall, "potential": p.potential, "age": p.age,
        "height": p.height_str, "weight": p.weight,
        "salary": p.salary_str(), "years": p.contract.years,
        "ppg": f"{p.season_stats.ppg:.1f}",
        "rpg": f"{p.season_stats.rpg:.1f}",
        "apg": f"{p.season_stats.apg:.1f}",
        "gp": p.season_stats.games,
        "is_starter": is_starter,
        "value": f"{player_trade_value(p):.0f}",
    }


# Import for draft
from basketball_gm.player import get_rookie_salary


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
