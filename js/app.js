(function () {
  "use strict";

  const STORAGE_START_DATE = "c2t_start_date";
  const STORAGE_COMPLETED = "c2t_completed";
  const STORAGE_PRS = "c2t_prs";

  const DISCIPLINE_ICON = {
    run: "\u{1F3C3}",
    bike: "\u{1F6B4}",
    swim: "\u{1F3CA}",
    strength: "\u{1F4AA}",
    brick: "\u{1F501}",
    race: "\u{1F3C1}",
  };

  const DISCIPLINE_LABEL = { run: "Run", bike: "Bike", swim: "Swim", brick: "Brick" };

  // Disciplines that can log an actual time/distance result.
  const LOGGABLE_DISCIPLINES = ["run", "bike", "swim", "brick"];
  const DISTANCE_PR_DISCIPLINES = ["run", "bike", "swim"];
  const DURATION_PR_DISCIPLINES = ["run", "bike", "swim", "brick"];

  // Standard race-distance checkpoints, matched within a tolerance against a logged distance.
  const STANDARD_DISTANCES = [
    { id: "run-5k", discipline: "run", label: "5K", meters: 5000, tolerance: 0.03 },
    { id: "run-10k", discipline: "run", label: "10K", meters: 10000, tolerance: 0.03 },
    { id: "run-half", discipline: "run", label: "Half Marathon", meters: 21097, tolerance: 0.02 },
    { id: "swim-750", discipline: "swim", label: "750m (Sprint swim)", meters: 750, tolerance: 0.05 },
    { id: "swim-1500", discipline: "swim", label: "1500m (Olympic swim)", meters: 1500, tolerance: 0.05 },
    { id: "swim-1900", discipline: "swim", label: "1.9km (Half-Iron swim)", meters: 1900, tolerance: 0.05 },
    { id: "swim-3800", discipline: "swim", label: "3.8km (Full Iron swim)", meters: 3800, tolerance: 0.05 },
    { id: "bike-20k", discipline: "bike", label: "20K (Sprint bike)", meters: 20000, tolerance: 0.05 },
    { id: "bike-40k", discipline: "bike", label: "40K (Olympic bike)", meters: 40000, tolerance: 0.05 },
    { id: "bike-90k", discipline: "bike", label: "90K (Half-Iron bike)", meters: 90000, tolerance: 0.05 },
    { id: "bike-180k", discipline: "bike", label: "180K (Full Iron bike)", meters: 180000, tolerance: 0.05 },
  ];

  let plan = null;
  let completedMap = {};
  let prs = null;
  let activeView = "today";
  let deferredInstallPrompt = null;
  let expandedLogKey = null;
  let sessionByKey = {};

  // ---------- date helpers (local time, no UTC surprises) ----------

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function parseISODate(str) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function daysBetween(a, b) {
    return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
  }

  function formatDate(date) {
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  // ---------- storage ----------

  function getStartDate() {
    const raw = localStorage.getItem(STORAGE_START_DATE);
    return raw ? parseISODate(raw) : null;
  }

  function setStartDate(date) {
    localStorage.setItem(STORAGE_START_DATE, toISODate(date));
  }

  function loadCompleted() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_COMPLETED) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveCompleted() {
    localStorage.setItem(STORAGE_COMPLETED, JSON.stringify(completedMap));
  }

  function dayKey(week, dayIdx) {
    return `w${week}d${dayIdx}`;
  }

  // A completedMap entry is either a legacy boolean (done, no log) or an
  // object { done, actualDurationMin, actualDistanceM, completedAt }.
  function normalizeEntry(raw) {
    if (raw == null || raw === false) return null;
    if (raw === true) return { done: true };
    return raw;
  }

  function isDone(key) {
    const entry = normalizeEntry(completedMap[key]);
    return !!(entry && entry.done);
  }

  function getLog(key) {
    return normalizeEntry(completedMap[key]);
  }

  function setEntry(key, patch) {
    const current = normalizeEntry(completedMap[key]) || {};
    const next = { ...current, ...patch };
    if (!next.done && next.actualDurationMin == null && next.actualDistanceM == null) {
      delete completedMap[key];
    } else {
      completedMap[key] = next;
    }
    saveCompleted();
  }

  function toggleComplete(key) {
    setEntry(key, { done: !isDone(key) });
    renderAll();
  }

  function saveLog(key, session, values) {
    setEntry(key, {
      done: true,
      actualDurationMin: values.actualDurationMin,
      actualDistanceM: values.actualDistanceM,
      completedAt: toISODate(new Date()),
    });
    return recordPRs(session, values);
  }

  // ---------- personal records ----------

  function defaultPRs() {
    return { standard: {}, longestDistance: {}, longestDuration: {} };
  }

  function loadPRs() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_PRS) || "null");
      if (!raw) return defaultPRs();
      return {
        standard: raw.standard || {},
        longestDistance: raw.longestDistance || {},
        longestDuration: raw.longestDuration || {},
      };
    } catch (e) {
      return defaultPRs();
    }
  }

  function savePRs() {
    localStorage.setItem(STORAGE_PRS, JSON.stringify(prs));
  }

  function findStandardMatch(discipline, distanceM) {
    let best = null;
    let bestDiff = Infinity;
    for (const std of STANDARD_DISTANCES) {
      if (std.discipline !== discipline) continue;
      const diff = Math.abs(distanceM - std.meters) / std.meters;
      if (diff <= std.tolerance && diff < bestDiff) {
        best = std;
        bestDiff = diff;
      }
    }
    return best;
  }

  function recordPRs(session, { actualDurationMin, actualDistanceM }) {
    const discipline = session.discipline;
    const today = toISODate(new Date());
    const achieved = [];
    let changed = false;

    if (actualDistanceM != null && DISTANCE_PR_DISCIPLINES.includes(discipline)) {
      const prev = prs.longestDistance[discipline];
      if (!prev || actualDistanceM > prev.distanceM) {
        prs.longestDistance[discipline] = { distanceM: actualDistanceM, date: today };
        achieved.push(`Longest ${DISCIPLINE_LABEL[discipline]} distance: ${formatDistance(actualDistanceM)}`);
        changed = true;
      }
    }

    if (actualDurationMin != null && DURATION_PR_DISCIPLINES.includes(discipline)) {
      const prev = prs.longestDuration[discipline];
      if (!prev || actualDurationMin > prev.durationMin) {
        prs.longestDuration[discipline] = { durationMin: actualDurationMin, date: today };
        achieved.push(`Longest ${DISCIPLINE_LABEL[discipline]} duration: ${formatRaceTime(actualDurationMin)}`);
        changed = true;
      }
    }

    if (actualDurationMin != null && actualDistanceM != null) {
      const std = findStandardMatch(discipline, actualDistanceM);
      if (std) {
        const prev = prs.standard[std.id];
        if (!prev || actualDurationMin < prev.timeMin) {
          prs.standard[std.id] = { timeMin: actualDurationMin, distanceM: actualDistanceM, date: today };
          achieved.push(`${std.label} PR: ${formatRaceTime(actualDurationMin)}`);
          changed = true;
        }
      }
    }

    if (changed) savePRs();
    return achieved;
  }

  // ---------- plan position ----------

  function getPlanPosition(startDate, today) {
    const offset = daysBetween(startDate, today);
    if (offset < 0) return { status: "not-started", daysUntilStart: -offset };
    const week = Math.floor(offset / 7) + 1;
    const dayIdx = offset % 7;
    if (week > plan.totalWeeks) return { status: "complete" };
    return { status: "active", week, dayIdx, offset };
  }

  function dateForWeekDay(startDate, week, dayIdx) {
    return addDays(startDate, (week - 1) * 7 + dayIdx);
  }

  // ---------- formatting helpers ----------

  function formatDistance(distanceM) {
    if (distanceM == null) return "";
    return distanceM >= 1000
      ? `${(distanceM / 1000).toFixed(distanceM % 1000 === 0 ? 0 : 1)} km`
      : `${distanceM} m`;
  }

  function formatSessionMeta(session) {
    if (session.durationMin != null) return `${session.durationMin} min`;
    if (session.distanceM != null) return formatDistance(session.distanceM);
    return "";
  }

  function sessionIcon(discipline) {
    return DISCIPLINE_ICON[discipline] || "\u{1F4CB}";
  }

  function formatTrainingTime(totalMinutes) {
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = totalMinutes / 60;
    return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  }

  // Parses "mm:ss", "h:mm:ss", or a bare number (decimal minutes) into minutes.
  function parseTimeToMinutes(str) {
    if (!str) return null;
    str = str.trim();
    if (!str) return null;
    if (str.includes(":")) {
      const parts = str.split(":").map(Number);
      if (parts.some((n) => Number.isNaN(n))) return null;
      let minutes;
      if (parts.length === 3) minutes = parts[0] * 60 + parts[1] + parts[2] / 60;
      else if (parts.length === 2) minutes = parts[0] + parts[1] / 60;
      else return null;
      return minutes > 0 ? minutes : null;
    }
    const n = Number(str);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function formatSecToMinSec(totalSec) {
    totalSec = Math.round(totalSec);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function formatRaceTime(durationMin) {
    if (durationMin == null) return "";
    const totalSec = Math.round(durationMin * 60);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function formatPace(discipline, durationMin, distanceM) {
    if (!durationMin || !distanceM) return "";
    if (discipline === "swim") {
      return `${formatSecToMinSec((durationMin * 60) / (distanceM / 100))}/100m`;
    }
    return `${formatSecToMinSec((durationMin * 60) / (distanceM / 1000))}/km`;
  }

  function disciplineDistanceUnit(discipline) {
    return discipline === "swim" ? "m" : "km";
  }

  function distanceInputToMeters(discipline, value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return discipline === "swim" ? Math.round(n) : Math.round(n * 1000);
  }

  function metersToDistanceInputValue(discipline, meters) {
    if (meters == null) return "";
    return discipline === "swim" ? meters : meters / 1000;
  }

  // ---------- rendering: shared session/day markup ----------

  function sessionCardHTML(session, key) {
    const meta = formatSessionMeta(session);
    const done = isDone(key);
    sessionByKey[key] = session;
    return `
      <div class="session-card ${done ? "is-done" : ""} ${session.discipline === "race" ? "is-race" : ""}">
        <div class="session-icon">${sessionIcon(session.discipline)}</div>
        <div class="session-body">
          <div class="session-title">${escapeHtml(session.title)}${meta ? `<span class="session-meta">${meta}</span>` : ""}</div>
          <div class="session-detail">${escapeHtml(session.detail)}</div>
          ${logFormHTML(session, key)}
        </div>
        <button class="session-check ${done ? "is-checked" : ""}" data-key="${key}" aria-label="Mark complete">${done ? "✓" : ""}</button>
      </div>`;
  }

  function logFormHTML(session, key) {
    if (!LOGGABLE_DISCIPLINES.includes(session.discipline)) return "";
    const log = getLog(key);
    const hasLog = log && (log.actualDurationMin != null || log.actualDistanceM != null);

    if (expandedLogKey !== key) {
      if (hasLog) {
        const pace = formatPace(session.discipline, log.actualDurationMin, log.actualDistanceM);
        const parts = [
          log.actualDurationMin != null ? formatRaceTime(log.actualDurationMin) : "",
          log.actualDistanceM != null ? formatDistance(log.actualDistanceM) : "",
          pace,
        ].filter(Boolean);
        return `<div class="log-block">
          <span class="log-summary">Logged: ${escapeHtml(parts.join(" · "))}</span>
          <button class="link-btn" data-log-toggle="${key}">Edit</button>
        </div>`;
      }
      return `<div class="log-block"><button class="link-btn" data-log-toggle="${key}">Log result</button></div>`;
    }

    const unit = disciplineDistanceUnit(session.discipline);
    const durationVal = log && log.actualDurationMin != null ? formatRaceTime(log.actualDurationMin) : "";
    const distanceVal = log && log.actualDistanceM != null ? metersToDistanceInputValue(session.discipline, log.actualDistanceM) : "";
    const hasDistanceField = session.discipline !== "brick";

    return `<div class="log-block">
      <div class="log-form">
        <label class="field">
          <span>Time (mm:ss)</span>
          <input type="text" inputmode="numeric" placeholder="e.g. 24:30" id="log-time-${key}" value="${durationVal}">
        </label>
        ${hasDistanceField ? `<label class="field">
          <span>Distance (${unit})</span>
          <input type="number" step="0.01" min="0" placeholder="e.g. ${unit === "m" ? "1500" : "5"}" id="log-distance-${key}" value="${distanceVal}">
        </label>` : ""}
        <div class="log-form__actions">
          <button class="btn btn--primary" data-log-save="${key}">Save</button>
          <button class="btn btn--ghost" data-log-cancel="${key}">Cancel</button>
        </div>
      </div>
    </div>`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function weekHeadPillsHTML(week) {
    let pills = "";
    if (week.isRecoveryWeek) pills += `<span class="pill pill--recovery">Recovery</span>`;
    if (week.milestone) pills += `<span class="pill pill--milestone">${escapeHtml(week.milestone.label)}</span>`;
    return pills;
  }

  function dayRowsHTML(week, startDate) {
    return week.days
      .map((day, dayIdx) => {
        const key = dayKey(week.week, dayIdx);
        const done = isDone(key);
        const date = startDate ? dateForWeekDay(startDate, week.week, dayIdx) : null;
        const dateStr = date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : day.label;
        if (!day.sessions.length) {
          return `<div class="day-row"><span class="day-row__label">${dateStr}</span><span class="day-row__title rest-note">Rest</span><span class="day-row__meta"></span></div>`;
        }
        const s = day.sessions[0];
        const meta = formatSessionMeta(s);
        return `<div class="day-row">
          <span class="day-row__label">${dateStr}</span>
          <span class="day-row__title">${sessionIcon(s.discipline)} ${escapeHtml(s.title)}</span>
          <span class="day-row__meta">${meta}</span>
          <button class="session-check ${done ? "is-checked" : ""}" data-key="${key}" aria-label="Mark complete" style="margin-left:8px;">${done ? "✓" : ""}</button>
        </div>`;
      })
      .join("");
  }

  // ---------- Today view ----------

  function buildOnboardingCard() {
    const tmpl = document.getElementById("tmpl-onboarding");
    const node = tmpl.content.cloneNode(true);
    const input = node.getElementById("onboarding-date");
    input.value = toISODate(new Date());
    return node;
  }

  function renderToday() {
    const container = document.getElementById("today-content");
    const startDate = getStartDate();
    sessionByKey = {};

    if (!startDate) {
      container.innerHTML = "";
      container.appendChild(buildOnboardingCard());
      updateHeaderChip(null);
      return;
    }

    const today = startOfDay(new Date());
    const pos = getPlanPosition(startDate, today);
    updateHeaderChip(pos);

    if (pos.status === "not-started") {
      container.innerHTML = `
        <div class="card card--hero">
          <div class="hero-sub">Plan not started yet</div>
          <div class="hero-week">Starts ${formatDate(startDate)}</div>
        </div>
        <div class="card"><p>Your 16-month plan begins in ${pos.daysUntilStart} day(s). Use Settings to change the start date if you'd like.</p></div>`;
      return;
    }

    if (pos.status === "complete") {
      const finalMilestone = plan.milestones[plan.milestones.length - 1];
      container.innerHTML = `
        <div class="card card--hero">
          <div class="hero-sub">Plan complete</div>
          <div class="hero-week">${finalMilestone.emoji} You did it</div>
        </div>
        <div class="card"><p>All 70 weeks are behind you. However race day went, that's 16 months of consistency most people never attempt. Check the Progress tab for your full stats.</p></div>`;
      return;
    }

    const week = plan.weeks[pos.week - 1];
    const day = week.days[pos.dayIdx];
    const nextMilestone = plan.milestones.find((m) => m.week >= week.week);
    let countdownHTML = "";
    if (nextMilestone) {
      const mDate = dateForWeekDay(startDate, nextMilestone.week, 6);
      const daysOut = daysBetween(today, mDate);
      countdownHTML = `<div class="hero-sub">${daysOut > 0 ? `${daysOut} days to ${escapeHtml(nextMilestone.label)}` : `Race week: ${escapeHtml(nextMilestone.label)}`}</div>`;
    }

    let sessionsHTML;
    if (!day.sessions.length) {
      sessionsHTML = `<div class="card"><p class="rest-note">Rest day. Full rest day — sleep, hydration, and easy stretching pay off here as much as any workout.</p></div>`;
    } else {
      sessionsHTML = day.sessions
        .map((s) => sessionCardHTML(s, dayKey(week.week, pos.dayIdx)))
        .join("");
    }

    container.innerHTML = `
      <div class="card card--hero">
        <div class="hero-row">
          <div>
            <div class="hero-sub">Month ${week.month} · ${escapeHtml(week.phase)}</div>
            <div class="hero-week">Week ${week.week} of ${plan.totalWeeks}</div>
          </div>
          <div>${weekHeadPillsHTML(week)}</div>
        </div>
        ${countdownHTML}
      </div>
      ${sessionsHTML}
      <div class="card">
        <h3>This week</h3>
        ${dayRowsHTML(week, startDate)}
      </div>`;
  }

  // ---------- Plan view ----------

  function renderPlan() {
    const container = document.getElementById("plan-content");
    const startDate = getStartDate();

    if (!startDate) {
      container.innerHTML = `<div class="empty-state"><p>Set a start date on the Today tab to see your full schedule.</p></div>`;
      return;
    }

    const today = startOfDay(new Date());
    const pos = getPlanPosition(startDate, today);
    const currentWeek = pos.status === "active" ? pos.week : pos.status === "complete" ? plan.totalWeeks : 1;

    const byMonth = {};
    plan.weeks.forEach((w) => {
      (byMonth[w.month] = byMonth[w.month] || []).push(w);
    });

    const html = Object.keys(byMonth)
      .map(Number)
      .sort((a, b) => a - b)
      .map((month) => {
        const weeks = byMonth[month];
        const isCurrentMonth = weeks.some((w) => w.week === currentWeek);
        const weeksHTML = weeks
          .map((week) => {
            const isCurrent = week.week === currentWeek;
            return `<div class="week-block ${isCurrent ? "is-current" : ""}" id="week-${week.week}">
              <div class="week-block__head">
                <span>Week ${week.week} · ${escapeHtml(week.phase)}</span>
                ${weekHeadPillsHTML(week)}
              </div>
              ${dayRowsHTML(week, startDate)}
            </div>`;
          })
          .join("");
        return `<details class="month-group" id="month-${month}" ${isCurrentMonth ? "open" : ""}>
          <summary>Month ${month} · ${escapeHtml(weeks[0].phase)}</summary>
          ${weeksHTML}
        </details>`;
      })
      .join("");

    container.innerHTML = html;
  }

  function jumpToCurrentWeek() {
    const startDate = getStartDate();
    if (!startDate) return;
    const today = startOfDay(new Date());
    const pos = getPlanPosition(startDate, today);
    const week = pos.status === "active" ? pos.week : pos.status === "complete" ? plan.totalWeeks : 1;
    const monthEl = [...document.querySelectorAll(".month-group")].find((el) =>
      el.querySelector(`#week-${week}`)
    );
    if (monthEl) monthEl.open = true;
    requestAnimationFrame(() => {
      const target = document.getElementById(`week-${week}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // ---------- Progress view ----------

  function renderProgress() {
    const container = document.getElementById("progress-content");
    const startDate = getStartDate();

    if (!startDate) {
      container.innerHTML = `<div class="empty-state"><p>Set a start date on the Today tab to start tracking progress.</p></div>`;
      return;
    }

    const today = startOfDay(new Date());
    const pos = getPlanPosition(startDate, today);

    let totalSessions = 0;
    let completedCount = 0;
    let totalMinutes = 0;
    const activeDayKeys = [];

    plan.weeks.forEach((week) => {
      week.days.forEach((day, dayIdx) => {
        if (!day.sessions.length) return;
        totalSessions++;
        const key = dayKey(week.week, dayIdx);
        activeDayKeys.push(key);
        if (isDone(key)) {
          completedCount++;
          const s = day.sessions[0];
          const log = getLog(key);
          const minutes = log && log.actualDurationMin != null ? log.actualDurationMin : s.durationMin;
          if (minutes != null) totalMinutes += minutes;
        }
      });
    });

    const percent = totalSessions ? Math.round((completedCount / totalSessions) * 100) : 0;

    let cutoffIdx = activeDayKeys.length;
    if (pos.status === "active") {
      const idx = activeDayKeys.indexOf(dayKey(pos.week, pos.dayIdx));
      cutoffIdx = idx >= 0 ? idx + 1 : activeDayKeys.length;
    } else if (pos.status === "not-started") {
      cutoffIdx = 0;
    }
    let streak = 0;
    for (let i = cutoffIdx - 1; i >= 0; i--) {
      if (isDone(activeDayKeys[i])) streak++;
      else break;
    }

    const milestonesHTML = plan.milestones
      .map((m) => {
        const mDate = dateForWeekDay(startDate, m.week, 6);
        const daysOut = daysBetween(today, mDate);
        const key = dayKey(m.week, 6);
        const done = isDone(key) || daysOut < 0;
        const statusText = isDone(key)
          ? "Done ✓"
          : daysOut < 0
          ? "Date passed"
          : daysOut === 0
          ? "Today!"
          : `${daysOut} days`;
        return `<div class="milestone-row ${done ? "is-done" : ""}">
          <span>${m.emoji} ${escapeHtml(m.label)}</span>
          <span class="day-row__meta">${statusText}</span>
        </div>`;
      })
      .join("");

    container.innerHTML = `
      <div class="card">
        <h3>Overall progress</h3>
        <div class="stat-grid">
          <div class="stat-box"><div class="stat-box__value">${percent}%</div><div class="stat-box__label">Plan completed</div></div>
          <div class="stat-box"><div class="stat-box__value">${completedCount}/${totalSessions}</div><div class="stat-box__label">Sessions done</div></div>
          <div class="stat-box"><div class="stat-box__value">${streak}</div><div class="stat-box__label">Day streak</div></div>
          <div class="stat-box"><div class="stat-box__value">${formatTrainingTime(totalMinutes)}</div><div class="stat-box__label">Est. training time</div></div>
        </div>
      </div>
      <div class="card">
        <h3>Race countdown</h3>
        ${milestonesHTML}
      </div>
      ${personalBestsHTML()}`;
  }

  function personalBestsHTML() {
    const stdById = Object.fromEntries(STANDARD_DISTANCES.map((s) => [s.id, s]));
    const groups = [
      { disc: "run", ids: ["run-5k", "run-10k", "run-half"] },
      { disc: "swim", ids: ["swim-750", "swim-1500", "swim-1900", "swim-3800"] },
      { disc: "bike", ids: ["bike-20k", "bike-40k", "bike-90k", "bike-180k"] },
    ];

    const raceRows = groups
      .map((g) =>
        g.ids
          .map((id) => {
            const std = stdById[id];
            const pr = prs.standard[id];
            return `<div class="pr-row">
              <span>${sessionIcon(g.disc)} ${escapeHtml(std.label)}</span>
              <span class="day-row__meta">${pr ? `${formatRaceTime(pr.timeMin)} · ${pr.date}` : "—"}</span>
            </div>`;
          })
          .join("")
      )
      .join("");

    const longestRows = ["run", "bike", "swim", "brick"]
      .map((disc) => {
        const dist = prs.longestDistance[disc];
        const dur = prs.longestDuration[disc];
        if (!dist && !dur) return "";
        const parts = [];
        if (dist) parts.push(`${formatDistance(dist.distanceM)} (${dist.date})`);
        if (dur) parts.push(`${formatRaceTime(dur.durationMin)} (${dur.date})`);
        return `<div class="pr-row">
          <span>${sessionIcon(disc)} Longest ${DISCIPLINE_LABEL[disc]}</span>
          <span class="day-row__meta">${parts.join(" · ")}</span>
        </div>`;
      })
      .join("");

    const hasAny =
      Object.keys(prs.standard).length || Object.keys(prs.longestDistance).length || Object.keys(prs.longestDuration).length;
    if (!hasAny) {
      return `<div class="card">
        <h3>Personal bests</h3>
        <p class="rest-note">Log a time and distance on a run, swim, or bike session to start tracking PRs.</p>
      </div>`;
    }

    return `<div class="card">
      <h3>Personal bests · race distances</h3>
      ${raceRows}
    </div>
    <div class="card">
      <h3>Personal bests · longest efforts</h3>
      ${longestRows || `<p class="rest-note">No logged sessions yet.</p>`}
    </div>`;
  }

  // ---------- Settings view ----------

  function renderSettings() {
    const container = document.getElementById("settings-content");
    const startDate = getStartDate();
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

    container.innerHTML = `
      <div class="card">
        <h3>Plan start date</h3>
        <label class="field">
          <span>Week 1, Day 1 falls on:</span>
          <input type="date" id="settings-date" value="${startDate ? toISODate(startDate) : toISODate(new Date())}">
        </label>
        <button id="settings-save-date" class="btn btn--primary">Save start date</button>
      </div>

      <div class="card">
        <h3>Add to Home Screen</h3>
        <div id="install-cta"></div>
        <p style="margin-top:10px;"><strong>iPhone/iPad (Safari):</strong> tap the Share icon, then "Add to Home Screen".</p>
        <p><strong>Android (Chrome):</strong> tap the ⋮ menu, then "Add to Home screen" or "Install app".</p>
      </div>

      <div class="card">
        <h3>Reset</h3>
        <p>Clears every checked-off workout. Your start date is kept.</p>
        <button id="settings-reset" class="btn btn--danger">Reset all progress</button>
      </div>

      <div class="card">
        <h3>About</h3>
        <p>A 70-week, 16-month plan from couch to full-distance Ironman, with Sprint, Olympic, and Half-Iron triathlons as benchmark races along the way. Built to work fully offline once installed.</p>
      </div>`;

    document.getElementById("settings-save-date").addEventListener("click", () => {
      const val = document.getElementById("settings-date").value;
      if (!val) return;
      setStartDate(parseISODate(val));
      renderAll();
    });

    document.getElementById("settings-reset").addEventListener("click", () => {
      if (confirm("Reset all checked-off workouts? This cannot be undone.")) {
        completedMap = {};
        saveCompleted();
        renderAll();
      }
    });

    const installCta = document.getElementById("install-cta");
    if (deferredInstallPrompt) {
      installCta.innerHTML = `<button id="install-btn" class="btn btn--primary">Install App</button>`;
      document.getElementById("install-btn").addEventListener("click", async () => {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        renderSettings();
      });
    } else if (isIOS) {
      installCta.innerHTML = `<p class="rest-note">Use the Share → Add to Home Screen instructions below — iOS doesn't support a one-tap install button.</p>`;
    } else {
      installCta.innerHTML = "";
    }
  }

  // ---------- header chip ----------

  function updateHeaderChip(pos) {
    const chip = document.getElementById("header-chip");
    if (!pos || pos.status === "not-started") {
      chip.hidden = true;
      return;
    }
    chip.hidden = false;
    if (pos.status === "complete") {
      chip.textContent = "Plan complete";
    } else {
      const week = plan.weeks[pos.week - 1];
      chip.textContent = `Week ${week.week}/${plan.totalWeeks} · ${week.phase}`;
    }
  }

  // ---------- navigation ----------

  function setActiveView(target) {
    activeView = target;
    document.querySelectorAll(".view").forEach((el) => {
      el.hidden = el.dataset.view !== target;
    });
    document.querySelectorAll(".bottom-nav__btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.target === target);
    });
  }

  function renderAll() {
    renderToday();
    renderPlan();
    renderProgress();
    renderSettings();
  }

  // ---------- toast ----------

  function showToast(messages) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<strong>New PR${messages.length > 1 ? "s" : ""}!</strong><br>${messages.map(escapeHtml).join("<br>")}`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-visible"));
    setTimeout(() => {
      el.classList.remove("is-visible");
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  // ---------- event delegation ----------

  function setupEventListeners() {
    document.body.addEventListener("click", (e) => {
      const checkBtn = e.target.closest(".session-check");
      if (checkBtn) {
        toggleComplete(checkBtn.dataset.key);
        return;
      }
      const logToggleBtn = e.target.closest("[data-log-toggle]");
      if (logToggleBtn) {
        const key = logToggleBtn.dataset.logToggle;
        expandedLogKey = expandedLogKey === key ? null : key;
        renderAll();
        return;
      }
      const logCancelBtn = e.target.closest("[data-log-cancel]");
      if (logCancelBtn) {
        expandedLogKey = null;
        renderAll();
        return;
      }
      const logSaveBtn = e.target.closest("[data-log-save]");
      if (logSaveBtn) {
        const key = logSaveBtn.dataset.logSave;
        const session = sessionByKey[key];
        if (!session) {
          expandedLogKey = null;
          renderAll();
          return;
        }
        const timeInput = document.getElementById(`log-time-${key}`);
        const distInput = document.getElementById(`log-distance-${key}`);
        const actualDurationMin = timeInput ? parseTimeToMinutes(timeInput.value) : null;
        const actualDistanceM = distInput && distInput.value ? distanceInputToMeters(session.discipline, distInput.value) : null;
        const newPRs = saveLog(key, session, { actualDurationMin, actualDistanceM });
        expandedLogKey = null;
        renderAll();
        if (newPRs.length) showToast(newPRs);
        return;
      }
      if (e.target.id === "onboarding-submit") {
        const input = document.getElementById("onboarding-date");
        if (input && input.value) {
          setStartDate(parseISODate(input.value));
          renderAll();
        }
        return;
      }
      const navBtn = e.target.closest(".bottom-nav__btn");
      if (navBtn) {
        setActiveView(navBtn.dataset.target);
        return;
      }
      if (e.target.id === "jump-to-current") {
        jumpToCurrentWeek();
      }
    });
  }

  // ---------- install prompt + service worker ----------

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (activeView === "settings") renderSettings();
  });

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    }
  }

  // ---------- boot ----------

  async function boot() {
    completedMap = loadCompleted();
    prs = loadPRs();
    const res = await fetch("data/plan.json");
    plan = await res.json();
    setupEventListeners();
    renderAll();
    registerServiceWorker();
  }

  boot();
})();
