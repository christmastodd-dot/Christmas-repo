"""Web-based Basketball Franchise Manager — Flask application."""

from __future__ import annotations

import json
import os
import pickle
import random
import uuid
import threading
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, Response

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
    proposed_contract, negotiate_counter,
)
from basketball_gm.config import ROSTER_SIZE, SALARY_CAP, MID_LEVEL_EXCEPTION
from basketball_gm.trade import (
    TradeProposal, validate_trade, ai_accepts_trade,
    execute_trade, player_trade_value,
)
from basketball_gm.development import develop_players, compute_awards
from basketball_gm.game_sim import accumulate_player_stats
from basketball_gm.stats import get_league_leaders
from basketball_gm.player import get_rookie_salary, Contract
from basketball_gm.save_load import save_game as save_game_json, load_game as load_game_json, list_saves, delete_save
from basketball_gm.playoffs import PlayoffBracket

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = "basketball-gm-secret-key-change-in-production"
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_HTTPONLY"] = True


@app.after_request
def no_cache(response):
    """Prevent browser from caching dynamic pages (fixes stale roster after cuts)."""
    if "text/html" in response.content_type:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


# ── Game state persistence ─────────────────────────────────────────
# In-memory cache + disk persistence so state survives restarts

SAVE_DIR = os.environ.get("GAME_SAVE_DIR", "/tmp/basketball_gm_saves")
os.makedirs(SAVE_DIR, exist_ok=True)

_cache: dict[str, dict] = {}
_lock = threading.Lock()


def _save_path(gid: str) -> str:
    # Sanitize to prevent path traversal
    safe = gid.replace("/", "").replace("..", "")
    return os.path.join(SAVE_DIR, f"{safe}.pkl")


def _persist(gid: str, game: dict) -> None:
    """Save game state to disk."""
    try:
        with open(_save_path(gid), "wb") as f:
            pickle.dump(game, f, protocol=pickle.HIGHEST_PROTOCOL)
    except Exception as e:
        app.logger.error("Failed to persist game %s: %s", gid, e)


def _load_from_disk(gid: str) -> dict | None:
    """Try loading game state from disk."""
    try:
        path = _save_path(gid)
        if os.path.exists(path):
            with open(path, "rb") as f:
                return pickle.load(f)
    except Exception:
        pass
    return None


def get_game() -> dict | None:
    """Retrieve game state: memory first, then disk."""
    gid = session.get("game_id")
    if not gid:
        return None
    with _lock:
        if gid in _cache:
            return _cache[gid]
    # Try disk
    game = _load_from_disk(gid)
    if game:
        with _lock:
            _cache[gid] = game
        return game
    return None


def persist_current_game() -> None:
    """Persist current game to disk. Call after any state mutation."""
    gid = session.get("game_id")
    if not gid:
        return
    with _lock:
        game = _cache.get(gid)
    if game:
        _persist(gid, game)


def store_game(gid: str, game: dict) -> None:
    """Store a new game in cache and persist to disk."""
    with _lock:
        _cache[gid] = game
    _persist(gid, game)


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
    game = create_game_state(league, rng)
    store_game(gid, game)
    session["game_id"] = gid

    # Render select_team directly instead of redirecting.
    # This avoids mobile browsers dropping the session cookie on 302.
    teams_data = []
    for t in league.teams:
        teams_data.append({
            "id": t.id, "full_name": t.full_name, "abbr": t.abbr,
            "conference": t.conference, "division": t.division,
            "overall": t.team_overall(),
        })
    return render_template("select_team.html", teams=teams_data)


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
        persist_current_game()
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

    persist_current_game()
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
    fa_data = []
    for p in agents:
        sal, yrs = proposed_contract(p)
        fa_data.append({
            "id": p.id, "name": p.name, "position": p.position,
            "overall": p.overall, "potential": p.potential, "age": p.age,
            "asking_salary": f"${sal/1e6:.1f}M",
            "asking_years": yrs,
            "asking_salary_raw": round(sal / 1e6, 1),
        })
    team = league.user_team
    return render_template("free_agents.html", agents=fa_data, team=team, league=league)


@app.route("/sign_fa", methods=["POST"])
def sign_fa():
    """Accept a free agent's proposed contract directly."""
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

    persist_current_game()
    return redirect(url_for("free_agents_view"))


@app.route("/negotiate/<int:player_id>")
def negotiate_view(player_id):
    """Show negotiation page for a specific free agent."""
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    league = game["league"]
    team = league.user_team

    player = None
    for p in league.free_agents:
        if p.id == player_id:
            player = p
            break
    if not player:
        game["messages"].append("Player not found.")
        return redirect(url_for("free_agents_view"))

    sal, yrs = proposed_contract(player)
    nego = game.get("negotiation", {})

    # If there's an active counter from the player, show it
    if nego.get("player_id") == player_id and nego.get("counter_salary"):
        counter_sal = nego["counter_salary"]
        counter_yrs = nego["counter_years"]
        status = nego.get("status", "counter")
    else:
        counter_sal = sal
        counter_yrs = yrs
        status = "initial"
        game["negotiation"] = {
            "player_id": player_id,
            "counter_salary": sal,
            "counter_years": yrs,
            "status": "initial",
        }

    p_data = {
        "id": player.id, "name": player.name, "position": player.position,
        "overall": player.overall, "potential": player.potential, "age": player.age,
        "asking_salary": f"${sal/1e6:.1f}M", "asking_years": yrs,
        "counter_salary": round(counter_sal / 1e6, 1),
        "counter_salary_str": f"${counter_sal/1e6:.1f}M",
        "counter_years": counter_yrs,
    }

    return render_template("negotiate.html", player=p_data, team=team,
                           league=league, status=status,
                           messages=game.pop("nego_messages", []))


@app.route("/negotiate/<int:player_id>/offer", methods=["POST"])
def negotiate_offer(player_id):
    """Submit a counter-offer to a free agent."""
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    league = game["league"]
    team = league.user_team

    player = None
    for p in league.free_agents:
        if p.id == player_id:
            player = p
            break
    if not player:
        game["messages"].append("Player not found.")
        return redirect(url_for("free_agents_view"))

    salary_m = float(request.form["salary"])
    years = int(request.form["years"])
    salary = int(salary_m * 1_000_000)

    # Check cap/roster before negotiating
    if len(team.roster) >= ROSTER_SIZE:
        game["nego_messages"] = ["Roster is full (15 players). Release someone first."]
        return redirect(url_for("negotiate_view", player_id=player_id))
    if team.payroll + salary > SALARY_CAP and salary > MID_LEVEL_EXCEPTION:
        game["nego_messages"] = [f"Not enough cap space. Need ${salary_m:.1f}M, have ${team.cap_space/1e6:.1f}M."]
        return redirect(url_for("negotiate_view", player_id=player_id))

    result, counter_sal, counter_yrs = negotiate_counter(
        player, salary, years, rng=game["rng"]
    )

    if result == "accept":
        ok, msg = sign_player(team, player, league, salary, years)
        game["messages"].append(msg)
        game.pop("negotiation", None)
        persist_current_game()
        return redirect(url_for("free_agents_view"))

    elif result == "reject":
        game["nego_messages"] = [
            f"{player.name} found your offer insulting and is no longer interested."
        ]
        game.pop("negotiation", None)
        persist_current_game()
        return redirect(url_for("free_agents_view"))

    else:  # counter
        game["negotiation"] = {
            "player_id": player_id,
            "counter_salary": counter_sal,
            "counter_years": counter_yrs,
            "status": "counter",
        }
        game["nego_messages"] = [
            f"{player.name} counters with ${counter_sal/1e6:.1f}M x {counter_yrs} yr(s)."
        ]
        persist_current_game()
        return redirect(url_for("negotiate_view", player_id=player_id))


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
    persist_current_game()
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
        persist_current_game()
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
    if gid:
        with _lock:
            _cache.pop(gid, None)
        try:
            os.remove(_save_path(gid))
        except OSError:
            pass
    session.clear()
    return redirect(url_for("index"))


# ── Save / Load ────────────────────────────────────────────────────


def _build_save_data(game: dict) -> dict:
    """Build a JSON-serializable save dict from game state."""
    league = game["league"]
    data = {"league": league.to_dict()}
    season_obj = game.get("season_obj")
    if season_obj:
        data["season_data"] = season_obj.to_dict()
    bracket = game.get("bracket")
    if bracket:
        data["bracket"] = bracket.to_dict()
    return data


def _restore_game_from_save(data: dict) -> dict:
    """Reconstruct full game state from a save dict."""
    league = League.from_dict(data["league"])
    rng = random.Random(data["league"].get("season", 1))
    game = create_game_state(league, rng)
    if data.get("season_data"):
        game["season_obj"] = Season.from_dict(data["season_data"], league)
    if data.get("bracket"):
        game["bracket"] = PlayoffBracket.from_dict(data["bracket"])
    return game


@app.route("/save_load")
def save_load_view():
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    saves = list_saves()
    return render_template("save_load.html", saves=saves,
                           league=game["league"],
                           messages=game.pop("save_messages", []))


@app.route("/save_game", methods=["POST"])
def save_game_route():
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    slot = int(request.form.get("slot", 1))
    league = game["league"]
    season_data = None
    season_obj = game.get("season_obj")
    if season_obj:
        season_data = season_obj.to_dict()

    # Build extended save with bracket
    save_data = _build_save_data(game)
    # Use save_load module for file writing (writes league + season_data)
    save_game_json(league, slot=slot, season_data=season_data)

    # Also write bracket data into the save file directly
    from basketball_gm.save_load import SAVE_DIR as JSON_SAVE_DIR, ensure_save_dir
    ensure_save_dir()
    filepath = os.path.join(JSON_SAVE_DIR, f"save_{slot}.json")
    with open(filepath, "r") as f:
        full = json.load(f)
    bracket = game.get("bracket")
    if bracket:
        full["bracket"] = bracket.to_dict()
    with open(filepath, "w") as f:
        json.dump(full, f, separators=(",", ":"))

    game["save_messages"] = [f"Game saved to slot {slot}!"]
    persist_current_game()
    return redirect(url_for("save_load_view"))


@app.route("/load_game", methods=["POST"])
def load_game_route():
    slot = int(request.form.get("slot", 1))
    result = load_game_json(slot)
    if not result:
        game = get_game()
        if game:
            game["save_messages"] = ["Save file not found."]
        return redirect(url_for("save_load_view"))

    league, season_data = result

    # Read bracket from save file
    from basketball_gm.save_load import SAVE_DIR as JSON_SAVE_DIR
    bracket_data = None
    filepath = os.path.join(JSON_SAVE_DIR, f"save_{slot}.json")
    try:
        with open(filepath, "r") as f:
            full = json.load(f)
        bracket_data = full.get("bracket")
    except Exception:
        pass

    rng = random.Random(league.season)
    game = create_game_state(league, rng)
    if season_data:
        game["season_obj"] = Season.from_dict(season_data, league)
    if bracket_data:
        game["bracket"] = PlayoffBracket.from_dict(bracket_data)

    gid = str(uuid.uuid4())
    store_game(gid, game)
    session["game_id"] = gid
    game["messages"] = [f"Game loaded from slot {slot}!"]
    persist_current_game()
    return redirect(url_for("dashboard"))


@app.route("/delete_save", methods=["POST"])
def delete_save_route():
    slot = int(request.form.get("slot", 1))
    deleted = delete_save(slot)
    game = get_game()
    if game:
        game["save_messages"] = [f"Save slot {slot} deleted." if deleted else "Save not found."]
    return redirect(url_for("save_load_view"))


@app.route("/download_save")
def download_save():
    """Download current game as a JSON file."""
    game = get_game()
    if not game:
        return redirect(url_for("index"))
    data = _build_save_data(game)
    league = game["league"]
    filename = f"basketball_gm_s{league.season}_{league.user_team.abbr}.json"
    return Response(
        json.dumps(data, separators=(",", ":")),
        mimetype="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.route("/upload_save", methods=["POST"])
def upload_save():
    """Upload a JSON save file to restore game."""
    f = request.files.get("savefile")
    if not f:
        game = get_game()
        if game:
            game["save_messages"] = ["No file selected."]
        return redirect(url_for("save_load_view"))

    try:
        data = json.load(f)
        game = _restore_game_from_save(data)
        gid = str(uuid.uuid4())
        store_game(gid, game)
        session["game_id"] = gid
        game["messages"] = ["Game loaded from uploaded file!"]
        persist_current_game()
        return redirect(url_for("dashboard"))
    except Exception as e:
        game = get_game()
        if game:
            game["save_messages"] = [f"Invalid save file: {e}"]
        return redirect(url_for("save_load_view"))


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


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
