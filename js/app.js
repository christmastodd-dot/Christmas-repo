(function () {
  "use strict";

  const STORAGE_START_DATE = "c2t_start_date";
  const STORAGE_COMPLETED = "c2t_completed";
  const STORAGE_PRS = "c2t_prs";
  const STORAGE_CUSTOM_RACES = "c2t_custom_races";
  const STORAGE_MILESTONE_OVERRIDES = "c2t_milestone_overrides";
  const STORAGE_EXTRA_WORKOUTS = "c2t_extra_workouts";
  const STORAGE_SESSION_MOVES = "c2t_session_moves";
  const STORAGE_SESSION_EDITS = "c2t_session_edits";

  const DISCIPLINE_ICON = {
    run: "\u{1F3C3}",
    bike: "\u{1F6B4}",
    swim: "\u{1F3CA}",
    strength: "\u{1F4AA}",
    brick: "\u{1F501}",
    race: "\u{1F3C1}",
    triathlon: "\u{1F3C1}",
  };

  const DISCIPLINE_LABEL = { run: "Run", bike: "Bike", swim: "Swim", brick: "Brick", strength: "Strength", triathlon: "Triathlon" };

  // Disciplines that can log an actual time/distance result.
  const LOGGABLE_DISCIPLINES = ["run", "bike", "swim", "brick", "race", "triathlon"];
  const DISTANCE_PR_DISCIPLINES = ["run", "bike", "swim"];
  const DURATION_PR_DISCIPLINES = ["run", "bike", "swim", "brick"];
  // Disciplines selectable when logging a workout outside the plan (rest day, or different from what's planned).
  const EXTRA_WORKOUT_DISCIPLINES = ["run", "bike", "swim", "brick", "strength", "triathlon"];

  // Standard race-distance checkpoints, matched within a tolerance against a logged distance.
  const STANDARD_DISTANCES = [
    { id: "run-5k", discipline: "run", label: "5K", meters: 5000, tolerance: 0.03 },
    { id: "run-10k", discipline: "run", label: "10K", meters: 10000, tolerance: 0.03 },
    { id: "run-half", discipline: "run", label: "Half Marathon", meters: 21097, tolerance: 0.02 },
    { id: "run-marathon", discipline: "run", label: "Marathon", meters: 42195, tolerance: 0.02 },
    { id: "swim-750", discipline: "swim", label: "750m (Sprint swim)", meters: 750, tolerance: 0.05 },
    { id: "swim-1500", discipline: "swim", label: "1500m (Olympic swim)", meters: 1500, tolerance: 0.05 },
    { id: "swim-1900", discipline: "swim", label: "1.9km (Half-Iron swim)", meters: 1900, tolerance: 0.05 },
    { id: "swim-3800", discipline: "swim", label: "3.8km (Full Iron swim)", meters: 3800, tolerance: 0.05 },
    { id: "bike-20k", discipline: "bike", label: "20K (Sprint bike)", meters: 20000, tolerance: 0.05 },
    { id: "bike-40k", discipline: "bike", label: "40K (Olympic bike)", meters: 40000, tolerance: 0.05 },
    { id: "bike-90k", discipline: "bike", label: "90K (Half-Iron bike)", meters: 90000, tolerance: 0.05 },
    { id: "bike-180k", discipline: "bike", label: "180K (Full Iron bike)", meters: 180000, tolerance: 0.05 },
  ];

  // Race types selectable when manually adding a race to the countdown.
  const RACE_TYPES = [
    { id: "sprint", label: "Sprint Triathlon", emoji: "\u{1F3C1}" },
    { id: "olympic", label: "Olympic Triathlon", emoji: "\u{1F3C1}" },
    { id: "half-iron", label: "Half-Iron Triathlon (70.3)", emoji: "\u{1F3C1}" },
    { id: "ironman", label: "Full Ironman (140.6)", emoji: "\u{1F947}" },
    { id: "5k", label: "5K Run", emoji: "\u{1F3C3}" },
    { id: "10k", label: "10K Run", emoji: "\u{1F3C3}" },
    { id: "half-marathon", label: "Half Marathon", emoji: "\u{1F3C3}" },
    { id: "marathon", label: "Marathon", emoji: "\u{1F3C3}" },
    { id: "open-water-swim", label: "Open Water Swim", emoji: "\u{1F3CA}" },
    { id: "century-ride", label: "Century Ride", emoji: "\u{1F6B4}" },
    { id: "other", label: "Other", emoji: "\u{1F3C6}" },
  ];
  const RACE_TYPE_BY_ID = Object.fromEntries(RACE_TYPES.map((t) => [t.id, t]));
  const RACE_TYPE_BY_LABEL = Object.fromEntries(RACE_TYPES.map((t) => [t.label, t.id]));

  let plan = null;
  let completedMap = {};
  let prs = null;
  let customRaces = [];
  let milestoneOverrides = {};
  let extraWorkouts = {};
  let sessionMoves = {};
  let activeView = "today";
  let deferredInstallPrompt = null;
  let expandedLogKey = null;
  let manualPRFormOpen = false;
  let raceFormState = null; // null | { mode: "add" } | { mode: "edit", key }
  let extraWorkoutFormState = null; // null | { mode: "add" } | { mode: "edit", id }
  let moveFormKey = null; // dayKey of the planned session currently showing its "move to another day" form
  let sessionEdits = {}; // keyed by dayKey → { overrides: { "0": {…}|{dropped:true}, … }, added: [{id,…}] }
  let customizeEditKey = null; // session key being edited in Customize tab
  let customizeAddDayKey = null; // dayKey showing the "add session" form in Customize tab
  let trackerState = null;
  let wakeLock = null;

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

  function formatShortDate(date) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

  function parseDayKey(key) {
    const m = /^w(\d+)d(\d+)(?:s(\d+)|a(.+))?$/.exec(key);
    if (!m) return null;
    return { week: Number(m[1]), dayIdx: Number(m[2]), sessionIdx: Number(m[3] || 0), addedId: m[4] || null };
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
    const entry = {
      done: true,
      actualDurationMin: values.actualDurationMin,
      actualDistanceM: values.actualDistanceM,
      completedAt: toISODate(new Date()),
    };
    if (session.discipline === "triathlon") {
      entry.swimDurationMin = values.swimDurationMin ?? null;
      entry.swimDistanceM = values.swimDistanceM ?? null;
      entry.bikeDurationMin = values.bikeDurationMin ?? null;
      entry.bikeDistanceM = values.bikeDistanceM ?? null;
      entry.runDurationMin = values.runDurationMin ?? null;
      entry.runDistanceM = values.runDistanceM ?? null;
    }
    setEntry(key, entry);
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

  // ---------- custom races ----------

  function loadCustomRaces() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_CUSTOM_RACES) || "null");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveCustomRaces() {
    localStorage.setItem(STORAGE_CUSTOM_RACES, JSON.stringify(customRaces));
  }

  function makeId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // Per-week edits to the plan's built-in milestone races (date/label/type override,
  // or hidden entirely). The underlying plan data and its RACE DAY session are untouched —
  // this only affects how the milestone is displayed in the Race countdown card.
  function loadMilestoneOverrides() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_MILESTONE_OVERRIDES) || "null");
      return raw && typeof raw === "object" ? raw : {};
    } catch (e) {
      return {};
    }
  }

  function saveMilestoneOverrides() {
    localStorage.setItem(STORAGE_MILESTONE_OVERRIDES, JSON.stringify(milestoneOverrides));
  }

  // ---------- extra workouts (off-plan activity logged on a given date) ----------

  function loadExtraWorkouts() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_EXTRA_WORKOUTS) || "null");
      return raw && typeof raw === "object" ? raw : {};
    } catch (e) {
      return {};
    }
  }

  function saveExtraWorkouts() {
    localStorage.setItem(STORAGE_EXTRA_WORKOUTS, JSON.stringify(extraWorkouts));
  }

  // ---------- session moves (reschedule a planned workout to a different date) ----------
  // Maps a session's original dayKey -> the ISO date it's been moved to. The session's
  // identity (and its completedMap entry) stays keyed by the original dayKey; only where
  // it's displayed changes.

  function loadSessionMoves() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_SESSION_MOVES) || "null");
      return raw && typeof raw === "object" ? raw : {};
    } catch (e) {
      return {};
    }
  }

  function saveSessionMoves() {
    localStorage.setItem(STORAGE_SESSION_MOVES, JSON.stringify(sessionMoves));
  }

  function loadSessionEdits() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_SESSION_EDITS) || "null");
      return raw && typeof raw === "object" ? raw : {};
    } catch (e) {
      return {};
    }
  }

  function saveSessionEdits() {
    localStorage.setItem(STORAGE_SESSION_EDITS, JSON.stringify(sessionEdits));
  }

  function getDayEdits(weekNum, dayIdx) {
    return sessionEdits[dayKey(weekNum, dayIdx)] || {};
  }

  function mutateDayEdits(weekNum, dayIdx, fn) {
    const dk = dayKey(weekNum, dayIdx);
    const edits = sessionEdits[dk] ? { ...sessionEdits[dk] } : {};
    fn(edits);
    const hasOverrides = edits.overrides && Object.keys(edits.overrides).length;
    const hasAdded = edits.added && edits.added.length;
    if (!hasOverrides && !hasAdded) delete sessionEdits[dk];
    else sessionEdits[dk] = edits;
    saveSessionEdits();
  }

  function getSessionForKey(key) {
    const parsed = parseDayKey(key);
    if (!parsed) return null;
    const week = plan.weeks[parsed.week - 1];
    const day = week && week.days[parsed.dayIdx];
    if (!day) return null;

    if (parsed.addedId) {
      const edits = getDayEdits(parsed.week, parsed.dayIdx);
      const a = (edits.added || []).find((x) => x.id === parsed.addedId);
      return a ? { discipline: a.discipline, title: a.title, detail: a.detail || "", durationMin: a.durationMin, distanceM: a.distanceM } : null;
    }

    const edits = getDayEdits(parsed.week, parsed.dayIdx);
    const override = edits.overrides && edits.overrides[String(parsed.sessionIdx)];
    if (override && override.dropped) return null;
    const base = day.sessions[parsed.sessionIdx];
    if (!base) return null;
    return override ? { ...base, ...override } : base;
  }

  // Returns [{session, key}] for all effective (non-dropped) sessions on a day,
  // applying session overrides and appending added sessions.
  function getEffectiveSessionsWithKeys(weekNum, dayIdx) {
    const baseKey = dayKey(weekNum, dayIdx);
    const week = plan.weeks[weekNum - 1];
    const day = week && week.days[dayIdx];
    const baseSessions = day ? day.sessions : [];
    const edits = getDayEdits(weekNum, dayIdx);
    const overrides = edits.overrides || {};
    const added = edits.added || [];
    const result = [];
    baseSessions.forEach((s, sIdx) => {
      const ov = overrides[String(sIdx)];
      if (ov && ov.dropped) return;
      const sKey = sIdx === 0 ? baseKey : `${baseKey}s${sIdx}`;
      result.push({ session: ov ? { ...s, ...ov } : s, key: sKey });
    });
    added.forEach((a) => {
      result.push({
        session: { discipline: a.discipline, title: a.title, detail: a.detail || "", durationMin: a.durationMin, distanceM: a.distanceM },
        key: `${baseKey}a${a.id}`,
      });
    });
    return result;
  }

  function getOriginalDateISO(key, startDate) {
    const parsed = parseDayKey(key);
    return parsed ? toISODate(dateForWeekDay(startDate, parsed.week, parsed.dayIdx)) : null;
  }

  function incomingMovesForDate(dateISO) {
    return Object.keys(sessionMoves)
      .filter((k) => sessionMoves[k] === dateISO)
      .map((k) => ({ key: k, session: getSessionForKey(k) }))
      .filter((m) => m.session);
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

  function recordPRs(session, { actualDurationMin, actualDistanceM }, dateOverride) {
    const discipline = session.discipline;
    const today = dateOverride || toISODate(new Date());
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

  // Renders a minutes/seconds time entry as two numeric-keypad inputs with a static
  // ":" separator, since mobile numeric keypads don't offer a colon key to type "mm:ss".
  function timeInputsHTML(id, durationMin) {
    const totalSec = durationMin != null ? Math.round(durationMin * 60) : null;
    const minVal = totalSec != null ? Math.floor(totalSec / 60) : "";
    const secVal = totalSec != null ? totalSec % 60 : "";
    return `<div style="display:flex; gap:8px; align-items:center;">
      <input type="number" inputmode="numeric" min="0" placeholder="mm" id="${id}-min" value="${minVal}" style="flex:1;">
      <span style="font-weight:700;">:</span>
      <input type="number" inputmode="numeric" min="0" max="59" placeholder="ss" id="${id}-sec" value="${secVal}" style="flex:1;">
    </div>`;
  }

  function readTimeInputs(id) {
    const minInput = document.getElementById(`${id}-min`);
    const secInput = document.getElementById(`${id}-sec`);
    const m = minInput.value.trim();
    const s = secInput.value.trim();
    if (!m && !s) return null;
    return parseTimeToMinutes(`${m || "0"}:${s || "0"}`);
  }

  // A given session can appear in more than one place at once (e.g. today's main
  // session card and its row in the "This week" list), so a log-form's inputs can't
  // be looked up by id alone — scope the read to the exact form the user is editing.
  function readTimeInputsFromContainer(container) {
    const minInput = container.querySelector('input[id$="-min"]');
    const secInput = container.querySelector('input[id$="-sec"]');
    const m = minInput ? minInput.value.trim() : "";
    const s = secInput ? secInput.value.trim() : "";
    if (!m && !s) return null;
    return parseTimeToMinutes(`${m || "0"}:${s || "0"}`);
  }

  function triathlonLegsFormHTML(prefill) {
    function legRow(legId, icon, label, unit, distVal, durationMin) {
      const totalSec = durationMin != null ? Math.round(durationMin * 60) : null;
      const minVal = totalSec != null ? Math.floor(totalSec / 60) : "";
      const secVal = totalSec != null ? totalSec % 60 : "";
      return `<div class="tri-leg">
        <div class="tri-leg__label">${icon} ${label}</div>
        <div class="tri-leg__fields">
          <label class="field"><span>Distance (${unit})</span>
            <input type="number" step="${unit === "m" ? "1" : "0.01"}" min="0" placeholder="${unit === "m" ? "e.g. 750" : "e.g. 5"}" id="tri-${legId}-dist" value="${distVal}">
          </label>
          <label class="field"><span>Time (min : sec)</span>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="number" inputmode="numeric" min="0" placeholder="mm" id="tri-${legId}-time-m" value="${minVal}" style="flex:1;">
              <span style="font-weight:700;">:</span>
              <input type="number" inputmode="numeric" min="0" max="59" placeholder="ss" id="tri-${legId}-time-s" value="${secVal}" style="flex:1;">
            </div>
          </label>
        </div>
      </div>`;
    }
    const swimDist = prefill && prefill.swimDistanceM != null ? prefill.swimDistanceM : "";
    const bikeDist = prefill && prefill.bikeDistanceM != null ? String(prefill.bikeDistanceM / 1000) : "";
    const runDist = prefill && prefill.runDistanceM != null ? String(prefill.runDistanceM / 1000) : "";
    return `<div class="tri-legs">
      ${legRow("swim", "\u{1F3CA}", "Swim", "m", swimDist, prefill && prefill.swimDurationMin)}
      ${legRow("bike", "\u{1F6B4}", "Bike", "km", bikeDist, prefill && prefill.bikeDurationMin)}
      ${legRow("run", "\u{1F3C3}", "Run", "km", runDist, prefill && prefill.runDurationMin)}
    </div>`;
  }

  function readTriLeg(legId, isSwim) {
    const mEl = document.getElementById(`tri-${legId}-time-m`);
    const sEl = document.getElementById(`tri-${legId}-time-s`);
    const m = mEl ? mEl.value.trim() : "";
    const s = sEl ? sEl.value.trim() : "";
    const durationMin = (m || s) ? parseTimeToMinutes(`${m || "0"}:${s || "0"}`) : null;
    const distEl = document.getElementById(`tri-${legId}-dist`);
    const distVal = distEl ? distEl.value.trim() : "";
    const distanceM = distVal ? distanceInputToMeters(isSwim ? "swim" : "run", distVal) : null;
    return { durationMin, distanceM };
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

  function sessionCardHTML(session, key, movedFromISO) {
    const meta = formatSessionMeta(session);
    const done = isDone(key);
    const movedNoteHTML = movedFromISO
      ? `<div class="day-row__meta" style="margin-bottom:6px;">↪ Moved from ${escapeHtml(formatShortDate(parseISODate(movedFromISO)))}</div>`
      : "";
    return `
      <div class="session-card ${done ? "is-done" : ""} ${session.discipline === "race" ? "is-race" : ""}">
        <div class="session-icon">${sessionIcon(session.discipline)}</div>
        <div class="session-body">
          <div class="session-title">${escapeHtml(session.title)}${meta ? `<span class="session-meta">${meta}</span>` : ""}</div>
          ${movedNoteHTML}
          <div class="session-detail">${escapeHtml(session.detail)}</div>
          ${logFormHTML(session, key)}
        </div>
        <button class="session-check ${done ? "is-checked" : ""}" data-key="${key}" aria-label="Mark complete">${done ? "✓" : ""}</button>
      </div>`;
  }

  function sessionLogFormHTML(session, key) {
    const log = getLog(key);

    if (session.discipline === "triathlon") {
      return `<div class="log-form">
        ${triathlonLegsFormHTML(log)}
        <div class="log-form__actions">
          <button class="btn btn--primary" data-log-save="${key}">Save</button>
          <button class="btn btn--ghost" data-log-cancel="${key}">Cancel</button>
        </div>
      </div>`;
    }

    const unit = disciplineDistanceUnit(session.discipline);
    const distanceVal = log && log.actualDistanceM != null ? metersToDistanceInputValue(session.discipline, log.actualDistanceM) : "";
    const hasDistanceField = session.discipline !== "brick" && session.discipline !== "race";

    return `<div class="log-form">
      <label class="field">
        <span>Time (min : sec)</span>
        ${timeInputsHTML(`log-time-${key}`, log && log.actualDurationMin)}
      </label>
      ${hasDistanceField ? `<label class="field">
        <span>Distance (${unit})</span>
        <input type="number" step="0.01" min="0" placeholder="e.g. ${unit === "m" ? "1500" : "5"}" id="log-distance-${key}" value="${distanceVal}">
      </label>` : ""}
      <div class="log-form__actions">
        <button class="btn btn--primary" data-log-save="${key}">Save</button>
        <button class="btn btn--ghost" data-log-cancel="${key}">Cancel</button>
      </div>
    </div>`;
  }

  function logFormHTML(session, key) {
    if (!LOGGABLE_DISCIPLINES.includes(session.discipline)) return "";
    const log = getLog(key);
    const hasLog = log && (log.actualDurationMin != null || log.actualDistanceM != null);

    if (expandedLogKey !== key) {
      if (hasLog) {
        let summary;
        if (session.discipline === "triathlon") {
          const legs = [];
          if (log.swimDistanceM != null) legs.push(`\u{1F3CA} ${formatDistance(log.swimDistanceM)}`);
          if (log.bikeDistanceM != null) legs.push(`\u{1F6B4} ${formatDistance(log.bikeDistanceM)}`);
          if (log.runDistanceM != null) legs.push(`\u{1F3C3} ${formatDistance(log.runDistanceM)}`);
          if (log.actualDurationMin != null) legs.push(`Total: ${formatRaceTime(log.actualDurationMin)}`);
          summary = legs.length ? legs.join(" · ") : "Logged";
        } else {
          const pace = formatPace(session.discipline, log.actualDurationMin, log.actualDistanceM);
          const parts = [
            log.actualDurationMin != null ? formatRaceTime(log.actualDurationMin) : "",
            log.actualDistanceM != null ? formatDistance(log.actualDistanceM) : "",
            pace,
          ].filter(Boolean);
          summary = parts.join(" · ");
        }
        return `<div class="log-block">
          <span class="log-summary">Logged: ${escapeHtml(summary)}</span>
          <button class="link-btn" data-log-toggle="${key}">Edit</button>
        </div>`;
      }
      return `<div class="log-block">
      <button class="link-btn" data-log-toggle="${key}">Log result</button>
      &nbsp;·&nbsp;
      <button class="link-btn" data-track-open="${key}">📍 Track</button>
    </div>`;
    }

    return `<div class="log-block">${sessionLogFormHTML(session, key)}</div>`;
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

  function plannedSessionRowHTML(session, key, dateStr, extraNoteHTML, showMoveBtn) {
    const done = isDone(key);
    const meta = formatSessionMeta(session);
    const loggable = LOGGABLE_DISCIPLINES.includes(session.discipline);
    const log = loggable ? getLog(key) : null;
    const hasLog = log && (log.actualDurationMin != null || log.actualDistanceM != null);
    const logBtnHTML = loggable
      ? `<button class="row-edit-btn" data-log-toggle="${key}" aria-label="${hasLog ? "Edit logged result" : "Log result"}">${hasLog ? "✎" : "📝"}</button>${!hasLog ? `<button class="row-edit-btn" data-track-open="${key}" aria-label="Track workout">📍</button>` : ""}`
      : "";
    const moveBtnHTML = showMoveBtn
      ? `<button class="row-edit-btn" data-move-toggle="${key}" aria-label="Move this workout">↪</button>`
      : `<button class="row-edit-btn" data-move-undo="${key}" aria-label="Move back">Undo</button>`;
    const rowHTML = `<div class="day-row">
      <span class="day-row__label">${dateStr}</span>
      <span class="day-row__title">${sessionIcon(session.discipline)} ${escapeHtml(session.title)}${extraNoteHTML}</span>
      <span class="day-row__meta">${meta}</span>
      ${logBtnHTML}
      ${moveBtnHTML}
      <button class="session-check ${done ? "is-checked" : ""}" data-key="${key}" aria-label="Mark complete" style="margin-left:8px;">${done ? "✓" : ""}</button>
    </div>`;
    const logFormRowHTML = loggable && expandedLogKey === key ? sessionLogFormHTML(session, key) : "";
    return rowHTML + logFormRowHTML;
  }

  function planRaceNoticeRowHTML(session, key, week) {
    const done = isDone(key);
    const override = milestoneOverrides[week.week];
    const label = (override && override.label) || session.title.replace(/^RACE DAY:\s*/i, "");
    const milestone = week.milestone;
    const distances = milestone ? milestone.distances : "";
    const note = milestone ? milestone.note : session.detail;
    const log = getLog(key);
    const hasLog = log && log.actualDurationMin != null;

    let logAreaHTML;
    if (expandedLogKey === key) {
      logAreaHTML = sessionLogFormHTML(session, key);
    } else if (hasLog) {
      logAreaHTML = `<div class="log-block">
        <span class="log-summary">Logged: ${escapeHtml(formatRaceTime(log.actualDurationMin))}</span>
        <button class="link-btn" data-log-toggle="${key}">Edit</button>
      </div>`;
    } else {
      logAreaHTML = `<div class="log-block"><button class="link-btn" data-log-toggle="${key}">Log result</button></div>`;
    }

    return `<div class="customize-race-notice" style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div style="flex:1;min-width:0;">
          <div class="customize-race-notice__head">\u{1F3C1} ${escapeHtml(label)}</div>
          ${distances ? `<div class="customize-race-notice__distances">${escapeHtml(distances)}</div>` : ""}
          ${note ? `<div class="customize-race-notice__note">${escapeHtml(note)}</div>` : ""}
        </div>
        <button class="session-check ${done ? "is-checked" : ""}" data-key="${key}" aria-label="Mark complete" style="flex:none;">${done ? "✓" : ""}</button>
      </div>
      ${logAreaHTML}
    </div>`;
  }

  function dayRowsHTML(week, startDate) {
    return week.days
      .map((day, dayIdx) => {
        const key = dayKey(week.week, dayIdx);
        const date = startDate ? dateForWeekDay(startDate, week.week, dayIdx) : null;
        const dateStr = date ? formatShortDate(date) : day.label;
        const effective = getEffectiveSessionsWithKeys(week.week, dayIdx);
        const movedTo = effective.length ? sessionMoves[key] : null;

        let plannedRowHTML;
        if (!effective.length) {
          plannedRowHTML = `<div class="day-row"><span class="day-row__label">${dateStr}</span><span class="day-row__title rest-note">Rest</span><span class="day-row__meta"></span></div>`;
        } else if (movedTo) {
          plannedRowHTML = `<div class="day-row">
            <span class="day-row__label">${dateStr}</span>
            <span class="day-row__title rest-note">${sessionIcon(effective[0].session.discipline)} ${escapeHtml(effective[0].session.title)} — moved to ${escapeHtml(formatShortDate(parseISODate(movedTo)))}</span>
            <span class="day-row__meta"></span>
            <button class="row-edit-btn" data-move-toggle="${key}" aria-label="Change move date">↪</button>
            <button class="row-edit-btn" data-move-undo="${key}" aria-label="Undo move">Undo</button>
          </div>`;
        } else {
          plannedRowHTML = effective.map(({ session: s, key: sKey }, i) => {
            if (s.discipline === "race") {
              return planRaceNoticeRowHTML(s, sKey, week);
            }
            return plannedSessionRowHTML(s, sKey, i === 0 ? dateStr : "", "", i === 0);
          }).join("");
        }

        const moveFormRowHTML = moveFormKey === key ? moveFormHTML(key, movedTo) : "";

        const incomingHTML = date
          ? incomingMovesForDate(toISODate(date))
              .map((m) => movedInDayRowHTML(m, startDate))
              .join("")
          : "";

        const extras = date ? extraWorkouts[toISODate(date)] || [] : [];
        const extraRowsHTML = extras.map((w) => extraWorkoutDayRowHTML(w)).join("");

        const dateISO = date ? toISODate(date) : null;
        const customRaceRowsHTML = dateISO
          ? customRaces
              .filter((r) => r.date === dateISO)
              .map((r) => {
                const type = RACE_TYPE_BY_ID[r.typeId] || RACE_TYPE_BY_ID.other;
                return `<div class="customize-race-notice" style="margin-bottom:8px;">
                  <div class="customize-race-notice__head">${type.emoji} ${escapeHtml(r.label || type.label)}</div>
                  <div class="customize-race-notice__tip">Your custom race</div>
                </div>`;
              })
              .join("")
          : "";

        return plannedRowHTML + customRaceRowsHTML + moveFormRowHTML + incomingHTML + extraRowsHTML;
      })
      .join("");
  }

  function moveFormHTML(key, currentTargetISO) {
    const dateVal = currentTargetISO || toISODate(startOfDay(new Date()));
    return `<div class="log-form">
      <label class="field">
        <span>Move this workout to</span>
        <input type="date" id="move-date-${key}" value="${dateVal}">
      </label>
      <div class="log-form__actions">
        <button class="btn btn--primary" data-move-save="${key}">Save</button>
        <button class="btn btn--ghost" data-move-cancel="1">Cancel</button>
      </div>
    </div>`;
  }

  function movedInDayRowHTML(move, startDate) {
    const { key, session } = move;
    const origISO = getOriginalDateISO(key, startDate);
    const origLabel = origISO ? formatShortDate(parseISODate(origISO)) : "";
    const extraNoteHTML = ` <span class="day-row__meta">(from ${escapeHtml(origLabel)})</span>`;
    return plannedSessionRowHTML(session, key, "", extraNoteHTML, false);
  }

  function extraWorkoutDayRowHTML(w) {
    return `<div class="day-row">
      <span class="day-row__label"></span>
      <span class="day-row__title">${sessionIcon(w.discipline)} ${escapeHtml(w.label || DISCIPLINE_LABEL[w.discipline])}</span>
      <span class="day-row__meta">${escapeHtml(extraWorkoutSummary(w))}</span>
      <span class="day-row__check-static" aria-label="Logged">✓</span>
    </div>`;
  }

  // ---------- Today view: extra / off-plan workouts ----------

  function extraWorkoutsSectionHTML(dateISO) {
    const items = extraWorkouts[dateISO] || [];
    const rowsHTML = items
      .map((w) => {
        if (extraWorkoutFormState && extraWorkoutFormState.mode === "edit" && extraWorkoutFormState.id === w.id) {
          return extraWorkoutFormHTML(w);
        }
        return extraWorkoutRowHTML(w);
      })
      .join("");

    const formOrToggle =
      extraWorkoutFormState && extraWorkoutFormState.mode === "add"
        ? extraWorkoutFormHTML(null)
        : `<button class="link-btn" data-extra-workout-toggle="1">+ Log a different workout</button>`;

    return `<div class="card">
      <h3>Other activity today</h3>
      ${rowsHTML}
      ${formOrToggle}
    </div>`;
  }

  function extraWorkoutSummary(w) {
    if (w.discipline === "triathlon") {
      const legs = [];
      if (w.swimDistanceM != null) legs.push(`\u{1F3CA} ${formatDistance(w.swimDistanceM)}`);
      if (w.bikeDistanceM != null) legs.push(`\u{1F6B4} ${formatDistance(w.bikeDistanceM)}`);
      if (w.runDistanceM != null) legs.push(`\u{1F3C3} ${formatDistance(w.runDistanceM)}`);
      if (w.actualDurationMin != null) legs.push(`Total: ${formatRaceTime(w.actualDurationMin)}`);
      return legs.join(" · ");
    }
    const pace = formatPace(w.discipline, w.actualDurationMin, w.actualDistanceM);
    const parts = [
      w.actualDurationMin != null ? formatRaceTime(w.actualDurationMin) : "",
      w.actualDistanceM != null ? formatDistance(w.actualDistanceM) : "",
      pace,
    ].filter(Boolean);
    return parts.join(" · ");
  }

  function extraWorkoutRowHTML(w) {
    return `<div class="milestone-row">
      <span>${sessionIcon(w.discipline)} ${escapeHtml(w.label || DISCIPLINE_LABEL[w.discipline])}</span>
      <span class="day-row__meta">
        ${escapeHtml(extraWorkoutSummary(w))}
        <button class="row-edit-btn" data-extra-workout-edit="${w.id}" aria-label="Edit workout">✎</button>
        <button class="row-delete-btn" data-extra-workout-remove="${w.id}" aria-label="Remove workout">✕</button>
      </span>
    </div>`;
  }

  function extraWorkoutFormHTML(prefill) {
    const selectedDiscipline = (prefill && prefill.discipline) || "run";
    const disciplineOptions = EXTRA_WORKOUT_DISCIPLINES.map(
      (d) => `<option value="${d}" ${selectedDiscipline === d ? "selected" : ""}>${DISCIPLINE_LABEL[d]}</option>`
    ).join("");
    const labelVal = prefill ? escapeHtml(prefill.label || "") : "";
    const unitVal = selectedDiscipline === "swim" ? "m" : "km";
    const distanceVal =
      prefill && prefill.actualDistanceM != null ? metersToDistanceInputValue(unitVal === "m" ? "swim" : "run", prefill.actualDistanceM) : "";
    const idAttr = prefill ? prefill.id : "";
    const isTri = selectedDiscipline === "triathlon";
    return `<div class="log-form" data-discipline="${selectedDiscipline}">
      <label class="field">
        <span>Activity</span>
        <select id="extra-workout-discipline" data-discipline-select="extra-workout">${disciplineOptions}</select>
      </label>
      <label class="field">
        <span>Description (optional)</span>
        <input type="text" placeholder="e.g. Easy bike instead of run" id="extra-workout-label" value="${labelVal}">
      </label>
      <div class="non-tri-fields">
        <label class="field">
          <span>Time (min : sec)</span>
          ${timeInputsHTML("extra-workout-time", !isTri && prefill ? prefill.actualDurationMin : null)}
        </label>
        <label class="field">
          <span>Distance (optional)</span>
          <div style="display:flex; gap:8px;">
            <input type="number" step="0.01" min="0" placeholder="e.g. 5" id="extra-workout-distance" style="flex:1;" value="${distanceVal}">
            <select id="extra-workout-unit" style="flex:none; width:auto;">
              <option value="km" ${unitVal === "km" ? "selected" : ""}>km</option>
              <option value="m" ${unitVal === "m" ? "selected" : ""}>m</option>
            </select>
          </div>
        </label>
      </div>
      ${triathlonLegsFormHTML(isTri ? prefill : null)}
      <div class="log-form__actions">
        <button class="btn btn--primary" data-extra-workout-save="${idAttr}">Save</button>
        ${prefill ? `<button class="btn btn--danger" data-extra-workout-remove="${idAttr}">Remove</button>` : ""}
        <button class="btn btn--ghost" data-extra-workout-cancel="1">Cancel</button>
      </div>
    </div>`;
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

    const todayKey = dayKey(week.week, pos.dayIdx);
    const todayISO = toISODate(today);
    const movedAway = !!sessionMoves[todayKey];
    const ownEntries = !movedAway
      ? getEffectiveSessionsWithKeys(week.week, pos.dayIdx).map(({ session, key }) => ({ session, key, movedFromISO: null }))
      : [];
    const incomingEntries = incomingMovesForDate(todayISO).map((m) => ({
      session: m.session,
      key: m.key,
      movedFromISO: getOriginalDateISO(m.key, startDate),
    }));
    const effectiveEntries = ownEntries.concat(incomingEntries);

    let sessionsHTML;
    if (!effectiveEntries.length) {
      const note = day.sessions.length
        ? "You moved today's workout to another day."
        : "Full rest day — sleep, hydration, and easy stretching pay off here as much as any workout.";
      sessionsHTML = `<div class="card"><p class="rest-note">${note}</p></div>`;
    } else {
      sessionsHTML = effectiveEntries
        .map(({ session, key, movedFromISO }) => sessionCardHTML(session, key, movedFromISO))
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
      ${extraWorkoutsSectionHTML(toISODate(today))}
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

    const milestonesHTML = raceCountdownRowsHTML(startDate, today);

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
        ${
          raceFormState && raceFormState.mode === "add"
            ? raceFormHTML(today, null)
            : `<button class="link-btn" data-manual-race-toggle="1">+ Add a race</button>`
        }
      </div>
      ${personalBestsHTML()}`;
  }

  function raceCountdownRowsHTML(startDate, today) {
    const planItems = plan.milestones
      .map((m) => {
        const key = `m:${m.week}`;
        const override = milestoneOverrides[m.week];
        if (override && override.hidden) return null;
        const overrideType = override && override.typeId ? RACE_TYPE_BY_ID[override.typeId] : null;
        const mDate = override && override.date ? parseISODate(override.date) : dateForWeekDay(startDate, m.week, 6);
        const daysOut = daysBetween(today, mDate);
        const sessionKey = dayKey(m.week, 6);
        const statusText = isDone(sessionKey)
          ? "Done ✓"
          : daysOut < 0
          ? "Date passed"
          : daysOut === 0
          ? "Today!"
          : `${daysOut} days`;
        return {
          key,
          date: mDate,
          emoji: (overrideType && overrideType.emoji) || m.emoji,
          label: (override && override.label) || m.label,
          typeId: (override && override.typeId) || RACE_TYPE_BY_LABEL[m.label] || "other",
          done: isDone(sessionKey) || daysOut < 0,
          statusText,
        };
      })
      .filter(Boolean);

    const customItems = customRaces.map((r) => {
      const key = `c:${r.id}`;
      const rDate = parseISODate(r.date);
      const daysOut = daysBetween(today, rDate);
      const type = RACE_TYPE_BY_ID[r.typeId] || RACE_TYPE_BY_ID.other;
      const statusText = daysOut < 0 ? "Date passed" : daysOut === 0 ? "Today!" : `${daysOut} days`;
      return {
        key,
        date: rDate,
        emoji: type.emoji,
        label: r.label || type.label,
        typeId: r.typeId,
        done: daysOut < 0,
        statusText,
      };
    });

    const items = [...planItems, ...customItems].sort((a, b) => a.date - b.date);

    const rowsHTML = items
      .map((it) => {
        if (raceFormState && raceFormState.mode === "edit" && raceFormState.key === it.key) {
          return raceFormHTML(today, { key: it.key, typeId: it.typeId, label: it.label, date: toISODate(it.date) });
        }
        return `<div class="milestone-row ${it.done ? "is-done" : ""}">
          <span>${it.emoji} ${escapeHtml(it.label)}</span>
          <span class="day-row__meta">
            ${it.statusText}
            <button class="row-edit-btn" data-race-edit="${escapeHtml(it.key)}" aria-label="Edit race">✎</button>
            <button class="row-delete-btn" data-race-remove="${escapeHtml(it.key)}" aria-label="Remove race">✕</button>
          </span>
        </div>`;
      })
      .join("");

    const hiddenMilestones = plan.milestones.filter((m) => milestoneOverrides[m.week] && milestoneOverrides[m.week].hidden);
    const hiddenHTML = hiddenMilestones.length
      ? `<div class="hidden-races">
          ${hiddenMilestones
            .map((m) => `<button class="link-btn" data-race-restore="${m.week}">↺ Restore ${escapeHtml(m.label)}</button>`)
            .join("")}
        </div>`
      : "";

    return rowsHTML + hiddenHTML;
  }

  function raceFormHTML(today, prefill) {
    const todayStr = toISODate(today);
    const typeOptions = RACE_TYPES.map(
      (t) => `<option value="${t.id}" ${prefill && prefill.typeId === t.id ? "selected" : ""}>${escapeHtml(t.label)}</option>`
    ).join("");
    const labelVal = prefill ? escapeHtml(prefill.label || "") : "";
    const dateVal = prefill ? prefill.date : todayStr;
    const keyAttr = prefill ? escapeHtml(prefill.key) : "";
    return `<div class="log-form">
      <label class="field">
        <span>Race type</span>
        <select id="race-form-type">${typeOptions}</select>
      </label>
      <label class="field">
        <span>Custom name (optional)</span>
        <input type="text" placeholder="e.g. Lake Tahoe Olympic" id="race-form-label" value="${labelVal}">
      </label>
      <label class="field">
        <span>Race date</span>
        <input type="date" id="race-form-date" value="${dateVal}">
      </label>
      <div class="log-form__actions">
        <button class="btn btn--primary" data-race-form-save="${keyAttr}">Save race</button>
        ${prefill ? `<button class="btn btn--danger" data-race-remove="${keyAttr}">Remove</button>` : ""}
        <button class="btn btn--ghost" data-race-form-cancel="1">Cancel</button>
      </div>
    </div>`;
  }

  function personalBestsHTML() {
    const stdById = Object.fromEntries(STANDARD_DISTANCES.map((s) => [s.id, s]));
    const groups = [
      { disc: "run", ids: ["run-5k", "run-10k", "run-half", "run-marathon"] },
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

    const manualSection = `<div class="card">
      <h3>Personal bests</h3>
      ${manualPRFormHTML()}
    </div>`;

    if (!hasAny) {
      return `${manualSection}
      <div class="card">
        <p class="rest-note">Log a time and distance on a run, swim, or bike session — or add one manually above — to start tracking PRs.</p>
      </div>`;
    }

    return `${manualSection}
    <div class="card">
      <h3>Race distances</h3>
      ${raceRows}
    </div>
    <div class="card">
      <h3>Longest efforts</h3>
      ${longestRows || `<p class="rest-note">No logged sessions yet.</p>`}
    </div>`;
  }

  function manualPRFormHTML() {
    if (!manualPRFormOpen) {
      return `<button class="link-btn" data-manual-pr-toggle="1">+ Add a PR manually</button>`;
    }
    const todayStr = toISODate(new Date());
    return `<div class="log-form">
      <label class="field">
        <span>Discipline</span>
        <select id="manual-pr-discipline">
          <option value="run">Run</option>
          <option value="bike">Bike</option>
          <option value="swim">Swim</option>
          <option value="brick">Brick</option>
        </select>
      </label>
      <label class="field">
        <span>Time (min : sec)</span>
        ${timeInputsHTML("manual-pr-time", null)}
      </label>
      <label class="field">
        <span>Distance</span>
        <div style="display:flex; gap:8px;">
          <input type="number" step="0.01" min="0" placeholder="e.g. 10" id="manual-pr-distance" style="flex:1;">
          <select id="manual-pr-unit" style="flex:none; width:auto;">
            <option value="km">km</option>
            <option value="m">m</option>
          </select>
        </div>
      </label>
      <label class="field">
        <span>Date achieved</span>
        <input type="date" id="manual-pr-date" value="${todayStr}" max="${todayStr}">
      </label>
      <div class="log-form__actions">
        <button class="btn btn--primary" data-manual-pr-save="1">Save PR</button>
        <button class="btn btn--ghost" data-manual-pr-cancel="1">Cancel</button>
      </div>
    </div>`;
  }

  // ---------- Customize view ----------

  function renderCustomize() {
    const container = document.getElementById("customize-content");
    const startDate = getStartDate();

    if (!startDate) {
      container.innerHTML = `<div class="empty-state"><p>Set a start date on the Today tab first.</p></div>`;
      return;
    }

    const today = startOfDay(new Date());
    const pos = getPlanPosition(startDate, today);

    if (pos.status === "complete") {
      container.innerHTML = `<div class="empty-state"><p>Plan complete — no future weeks to customize.</p></div>`;
      return;
    }

    const currentWeek = pos.status === "active" ? pos.week : 0;
    const futureWeeks = plan.weeks.filter((w) => w.week > currentWeek);

    if (!futureWeeks.length) {
      container.innerHTML = `<div class="empty-state"><p>No future weeks remaining.</p></div>`;
      return;
    }

    const hasEdits = Object.keys(sessionEdits).length > 0;

    const openMonths = new Set(
      [...container.querySelectorAll("details.month-group[data-month]")]
        .filter((el) => el.open)
        .map((el) => el.dataset.month)
    );

    const byMonth = {};
    futureWeeks.forEach((w) => (byMonth[w.month] = byMonth[w.month] || []).push(w));

    const monthsHTML = Object.keys(byMonth)
      .map(Number)
      .sort((a, b) => a - b)
      .map((month, mIdx) => {
        const weeks = byMonth[month];
        const weeksHTML = weeks.map((week) => customizeWeekHTML(week, startDate)).join("");
        const isOpen = openMonths.size > 0 ? openMonths.has(String(month)) : mIdx === 0;
        return `<details class="month-group" data-month="${month}" ${isOpen ? "open" : ""}>
          <summary>Month ${month} · ${escapeHtml(weeks[0].phase)}</summary>
          ${weeksHTML}
        </details>`;
      })
      .join("");

    container.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <div>
            <h3 style="margin:0;">Customize workouts</h3>
            <p style="margin:4px 0 0;">Edit, drop, swap, or add sessions for any future week. Current &amp; past weeks are locked.</p>
          </div>
          ${hasEdits ? `<button class="btn btn--danger" style="flex:none;width:auto;font-size:12px;padding:7px 12px;" data-revert-all-edits="1">Revert all</button>` : ""}
        </div>
      </div>
      ${monthsHTML}`;
  }

  function customizeWeekHTML(week, startDate) {
    const daysHTML = week.days.map((_, dayIdx) => customizeDayHTML(week, dayIdx, startDate)).join("");
    return `<div class="week-block">
      <div class="week-block__head">
        <span>Week ${week.week} · ${escapeHtml(week.phase)}</span>
        ${weekHeadPillsHTML(week)}
      </div>
      ${daysHTML}
    </div>`;
  }

  function customizeDayHTML(week, dayIdx, startDate) {
    const date = dateForWeekDay(startDate, week.week, dayIdx);
    const dateISO = toISODate(date);
    const dateStr = formatShortDate(date);
    const baseKey = dayKey(week.week, dayIdx);
    const day = week.days[dayIdx];
    const baseSessions = day.sessions;
    const edits = getDayEdits(week.week, dayIdx);
    const overrides = edits.overrides || {};
    const added = edits.added || [];

    // Collect any plan-race or custom-race notices for this day.
    const raceNoticesHTML = customizeRaceNoticesHTML(baseSessions, dateISO, week);

    const baseRowsHTML = baseSessions.map((s, sIdx) => {
      // Race sessions are shown via raceNoticesHTML above; skip them in the editable list.
      if (s.discipline === "race") return "";

      const sKey = sIdx === 0 ? baseKey : `${baseKey}s${sIdx}`;
      const ov = overrides[String(sIdx)];
      const isDropped = !!(ov && ov.dropped);
      const isModified = !!(ov && !ov.dropped);
      const effective = isModified ? { ...s, ...ov } : s;

      if (customizeEditKey === sKey) return customizeEditFormHTML(effective, sKey);

      const badge = isDropped
        ? `<span class="edit-badge edit-badge--dropped">Dropped</span>`
        : isModified
        ? `<span class="edit-badge edit-badge--modified">Modified</span>`
        : "";

      const actions = isDropped
        ? `<button class="row-edit-btn" data-session-revert="${sKey}">↺ Revert</button>`
        : `<button class="row-edit-btn" data-session-edit-open="${sKey}" title="Edit">✎</button>
           <button class="row-delete-btn" data-session-drop="${sKey}" title="Drop">✕</button>
           ${isModified ? `<button class="row-edit-btn" data-session-revert="${sKey}" title="Revert to plan">↺</button>` : ""}`;

      const meta = formatSessionMeta(effective);
      return `<div class="day-row${isDropped ? " is-dropped" : ""}">
        <span class="day-row__title">${sessionIcon(effective.discipline)} ${escapeHtml(effective.title)}${badge}${meta ? `<span class="session-meta">${meta}</span>` : ""}</span>
        <span class="day-row__meta" style="display:flex;align-items:center;gap:2px;">${actions}</span>
      </div>`;
    }).join("");

    const addedRowsHTML = added.map((a) => {
      const aKey = `${baseKey}a${a.id}`;
      const aSession = { discipline: a.discipline, title: a.title, durationMin: a.durationMin, distanceM: a.distanceM };
      if (customizeEditKey === aKey) return customizeEditFormHTML(aSession, aKey);
      const meta = formatSessionMeta(aSession);
      return `<div class="day-row">
        <span class="day-row__title">${sessionIcon(a.discipline)} ${escapeHtml(a.title)}<span class="edit-badge edit-badge--added">Added</span>${meta ? `<span class="session-meta">${meta}</span>` : ""}</span>
        <span class="day-row__meta" style="display:flex;align-items:center;gap:2px;">
          <button class="row-edit-btn" data-session-edit-open="${aKey}" title="Edit">✎</button>
          <button class="row-delete-btn" data-session-drop="${aKey}" title="Remove">✕</button>
        </span>
      </div>`;
    }).join("");

    const showAddForm = customizeAddDayKey === baseKey;
    const addAreaHTML = showAddForm
      ? customizeAddFormHTML(baseKey)
      : `<div class="day-row"><button class="link-btn" data-session-add-open="${baseKey}" style="font-size:11px;">+ Add session</button></div>`;

    const nonRaceSessions = baseSessions.filter((s) => s.discipline !== "race");
    const isEmpty = !nonRaceSessions.length && !added.length;

    return `<div class="customize-day">
      <div class="customize-day-label">${dateStr}</div>
      ${raceNoticesHTML}
      ${isEmpty && !raceNoticesHTML ? `<div class="day-row"><span class="day-row__title rest-note">Rest day</span></div>` : ""}
      ${baseRowsHTML}${addedRowsHTML}
      ${addAreaHTML}
    </div>`;
  }

  // Returns HTML for any race notices on this day: plan milestone races + custom races.
  function customizeRaceNoticesHTML(baseSessions, dateISO, week) {
    const notices = [];

    // Plan-authored race sessions (e.g. "RACE DAY: Sprint Triathlon")
    baseSessions.forEach((s) => {
      if (s.discipline !== "race") return;
      // Check if there's a milestone override for this week
      const override = milestoneOverrides[week.week];
      const label = (override && override.label) || s.title.replace(/^RACE DAY:\s*/i, "");
      const milestone = week.milestone;
      const distances = milestone ? milestone.distances : "";
      const note = milestone ? milestone.note : s.detail;
      notices.push(`<div class="customize-race-notice">
        <div class="customize-race-notice__head">\u{1F3C1} ${escapeHtml(label)}</div>
        ${distances ? `<div class="customize-race-notice__distances">${escapeHtml(distances)}</div>` : ""}
        <div class="customize-race-notice__note">${escapeHtml(note || "")}</div>
        <div class="customize-race-notice__tip">Adjust other sessions in this week around race day.</div>
      </div>`);
    });

    // Custom races matching this date
    customRaces.forEach((r) => {
      if (r.date !== dateISO) return;
      const type = RACE_TYPE_BY_ID[r.typeId] || RACE_TYPE_BY_ID.other;
      const label = r.label || type.label;
      notices.push(`<div class="customize-race-notice">
        <div class="customize-race-notice__head">${type.emoji} ${escapeHtml(label)}</div>
        <div class="customize-race-notice__tip">Your custom race — adjust other sessions this week around it.</div>
      </div>`);
    });

    return notices.join("");
  }

  function customizeEditFormHTML(session, key) {
    const disciplines = ["run", "bike", "swim", "brick", "strength"];
    const discOptions = disciplines.map((d) => `<option value="${d}" ${session.discipline === d ? "selected" : ""}>${DISCIPLINE_LABEL[d] || d}</option>`).join("");
    const unit = session.discipline === "swim" ? "m" : "km";
    const distVal = session.distanceM != null ? metersToDistanceInputValue(session.discipline, session.distanceM) : "";
    const hasDistance = session.discipline !== "brick" && session.discipline !== "strength";
    return `<div class="log-form" style="margin:4px 0;">
      <label class="field">
        <span>Discipline</span>
        <select id="cedit-discipline-${key}">${discOptions}</select>
      </label>
      <label class="field">
        <span>Title</span>
        <input type="text" id="cedit-title-${key}" value="${escapeHtml(session.title)}" placeholder="Session name">
      </label>
      <label class="field">
        <span>Duration (min)</span>
        <input type="number" min="1" id="cedit-duration-${key}" value="${session.durationMin != null ? session.durationMin : ""}" placeholder="e.g. 45">
      </label>
      ${hasDistance ? `<label class="field">
        <span>Distance (${unit})</span>
        <input type="number" step="0.01" min="0" id="cedit-distance-${key}" value="${distVal}" placeholder="${unit === "m" ? "e.g. 1500" : "e.g. 10"}">
      </label>` : ""}
      <div class="log-form__actions">
        <button class="btn btn--primary" data-session-edit-save="${key}">Save</button>
        <button class="btn btn--ghost" data-session-edit-cancel="1">Cancel</button>
      </div>
    </div>`;
  }

  function customizeAddFormHTML(dayKey) {
    const disciplines = ["run", "bike", "swim", "brick", "strength"];
    const discOptions = disciplines.map((d) => `<option value="${d}">${DISCIPLINE_LABEL[d] || d}</option>`).join("");
    return `<div class="log-form" style="margin:4px 0;">
      <label class="field">
        <span>Discipline</span>
        <select id="cadd-discipline-${dayKey}">${discOptions}</select>
      </label>
      <label class="field">
        <span>Title</span>
        <input type="text" id="cadd-title-${dayKey}" placeholder="Session name">
      </label>
      <label class="field">
        <span>Duration (min)</span>
        <input type="number" min="1" id="cadd-duration-${dayKey}" placeholder="e.g. 45">
      </label>
      <label class="field">
        <span>Distance (km or m)</span>
        <div style="display:flex;gap:8px;">
          <input type="number" step="0.01" min="0" id="cadd-distance-${dayKey}" placeholder="optional" style="flex:1;">
          <select id="cadd-dist-unit-${dayKey}" style="flex:none;width:auto;">
            <option value="km">km</option>
            <option value="m">m</option>
          </select>
        </div>
      </label>
      <div class="log-form__actions">
        <button class="btn btn--primary" data-session-add-save="${dayKey}">Add session</button>
        <button class="btn btn--ghost" data-session-add-cancel="1">Cancel</button>
      </div>
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

  // ---------- GPS tracker ----------

  function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatElapsed(totalSec) {
    totalSec = Math.floor(totalSec);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function trackerElapsedSec() {
    if (!trackerState) return 0;
    const running = trackerState.phase === "active" && trackerState.startTime ? Date.now() - trackerState.startTime : 0;
    return (trackerState.pausedMs + running) / 1000;
  }

  function routeSVG(points) {
    if (points.length < 2) return `<div class="tracker-map-hint">Route will appear as you move</div>`;
    const W = 300, H = 220, pad = 20;
    const lats = points.map((p) => p.lat);
    const lons = points.map((p) => p.lon);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const spanLat = maxLat - minLat || 0.001;
    const spanLon = maxLon - minLon || 0.001;
    const scale = Math.min((W - pad * 2) / spanLon, (H - pad * 2) / spanLat);
    const offX = (W - spanLon * scale) / 2;
    const offY = (H - spanLat * scale) / 2;
    const toX = (lon) => offX + (lon - minLon) * scale;
    const toY = (lat) => H - offY - (lat - minLat) * scale;
    const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.lon).toFixed(1)},${toY(p.lat).toFixed(1)}`).join(" ");
    const s = points[0], e = points[points.length - 1];
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:100%;">
      <path d="${d}" fill="none" stroke="var(--blue)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${toX(s.lon).toFixed(1)}" cy="${toY(s.lat).toFixed(1)}" r="6" fill="var(--green)"/>
      <circle cx="${toX(e.lon).toFixed(1)}" cy="${toY(e.lat).toFixed(1)}" r="6" fill="var(--blue)" stroke="white" stroke-width="2"/>
    </svg>`;
  }

  function openTracker(session, key) {
    if (trackerState) return;
    trackerState = {
      session, key,
      phase: "pre",
      watchId: null, intervalId: null,
      startTime: null, pausedMs: 0,
      points: [], distanceM: 0, lastPoint: null,
      gpsAccuracy: null, gpsError: null,
      finalDurationMin: null, finalDistanceM: null,
    };

    const overlay = document.createElement("div");
    overlay.className = "tracker-overlay";
    overlay.id = "tracker-overlay";
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (ev) => {
      const id = ev.target.id;
      if (id === "tracker-close-btn") {
        if (trackerState && (trackerState.phase === "active" || trackerState.phase === "paused")) {
          if (!confirm("Stop tracking and discard this session?")) return;
        }
        closeTracker();
      } else if (id === "tracker-start-btn")   startTracking();
      else if (id === "tracker-pause-btn")      pauseTracking();
      else if (id === "tracker-resume-btn")     resumeTracking();
      else if (id === "tracker-stop-btn")       stopTracking();
      else if (id === "tracker-log-btn")        logTrackerResult();
      else if (id === "tracker-discard-btn")    closeTracker();
    });

    renderTrackerOverlay();

    // Prime GPS permission early so Start has no dialog delay
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: true, timeout: 3000 });
    }
  }

  function closeTracker() {
    if (!trackerState) return;
    if (trackerState.watchId != null) navigator.geolocation.clearWatch(trackerState.watchId);
    if (trackerState.intervalId != null) clearInterval(trackerState.intervalId);
    if (wakeLock) { wakeLock.release(); wakeLock = null; }
    trackerState = null;
    const overlay = document.getElementById("tracker-overlay");
    if (overlay) overlay.remove();
  }

  function renderTrackerOverlay() {
    const overlay = document.getElementById("tracker-overlay");
    if (!overlay || !trackerState) return;
    const { session, phase, points, distanceM, gpsAccuracy, gpsError } = trackerState;
    const isSwim = session.discipline === "swim";
    const unit = isSwim ? "m" : "km";
    const elapsedSec = trackerElapsedSec();
    const distDisplay = isSwim ? distanceM.toFixed(0) : (distanceM / 1000).toFixed(2);
    const hasPace = distanceM > 50 && elapsedSec > 10;
    const paceVal = hasPace
      ? (isSwim ? formatSecToMinSec(elapsedSec / (distanceM / 100)) : formatSecToMinSec(elapsedSec / (distanceM / 1000)))
      : "--:--";
    const paceUnit = isSwim ? "/100m" : "/km";

    const gpsHTML = `<div class="tracker-gps-status${gpsError ? " tracker-gps-status--error" : ""}" id="tracker-gps-status">${
      gpsError ? `⚠️ ${escapeHtml(gpsError)}` : gpsAccuracy != null ? `GPS ±${Math.round(gpsAccuracy)}m` : "Acquiring GPS…"
    }</div>`;

    const statsHTML = `<div class="tracker-stats">
      <div class="tracker-stat">
        <div class="tracker-stat__value" id="tracker-time">${escapeHtml(formatElapsed(elapsedSec))}</div>
        <div class="tracker-stat__label">Elapsed</div>
      </div>
      <div class="tracker-stat">
        <div class="tracker-stat__value" id="tracker-dist">${escapeHtml(distDisplay)}</div>
        <div class="tracker-stat__label">${unit}</div>
      </div>
      <div class="tracker-stat">
        <div class="tracker-stat__value tracker-stat__value--sm" id="tracker-pace">${escapeHtml(paceVal)}</div>
        <div class="tracker-stat__label">${paceUnit}</div>
      </div>
    </div>`;

    let controlsHTML;
    if (phase === "pre") {
      controlsHTML = `<button class="btn btn--primary tracker-start-btn" id="tracker-start-btn">▶ Start</button>`;
    } else if (phase === "active") {
      controlsHTML = `<div style="display:flex;gap:12px;">
        <button class="btn btn--ghost" style="flex:1;" id="tracker-pause-btn">⏸ Pause</button>
        <button class="btn btn--danger" style="flex:1;" id="tracker-stop-btn">⏹ Finish</button>
      </div>`;
    } else if (phase === "paused") {
      controlsHTML = `<div style="display:flex;gap:12px;">
        <button class="btn btn--primary" style="flex:1;" id="tracker-resume-btn">▶ Resume</button>
        <button class="btn btn--danger" style="flex:1;" id="tracker-stop-btn">⏹ Finish</button>
      </div>`;
    } else {
      const finalTime = formatRaceTime(trackerState.finalDurationMin);
      const finalDist = isSwim
        ? `${Math.round(trackerState.finalDistanceM)} m`
        : `${(trackerState.finalDistanceM / 1000).toFixed(2)} km`;
      controlsHTML = `<div class="tracker-summary">
        <div class="tracker-summary-row"><span>Time</span><strong>${escapeHtml(finalTime)}</strong></div>
        <div class="tracker-summary-row"><span>Distance</span><strong>${escapeHtml(finalDist)}</strong></div>
      </div>
      <div style="display:flex;gap:12px;margin-top:12px;">
        <button class="btn btn--primary" style="flex:2;" id="tracker-log-btn">Log this workout</button>
        <button class="btn btn--ghost" style="flex:1;" id="tracker-discard-btn">Discard</button>
      </div>`;
    }

    overlay.innerHTML = `
      <div class="tracker-header">
        <div class="tracker-session-name">${sessionIcon(session.discipline)} ${escapeHtml(session.title)}</div>
        <button class="tracker-close" id="tracker-close-btn" aria-label="Close">✕</button>
      </div>
      ${phase === "pre"
        ? `<div class="tracker-pre-area">
            <div class="tracker-pre-hint">Ready to track your ${escapeHtml(session.title.toLowerCase())}?</div>
            ${gpsHTML}
          </div>`
        : `${statsHTML}
           <div class="tracker-map" id="tracker-map">${routeSVG(points)}</div>
           ${gpsHTML}
           ${phase === "paused" ? `<div class="tracker-paused-badge">PAUSED</div>` : ""}`
      }
      <div class="tracker-controls">${controlsHTML}</div>`;
  }

  function updateTrackerDisplay() {
    if (!trackerState || trackerState.phase === "pre" || trackerState.phase === "done") return;
    const { distanceM, gpsAccuracy, gpsError } = trackerState;
    const isSwim = trackerState.session.discipline === "swim";
    const elapsedSec = trackerElapsedSec();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("tracker-time", formatElapsed(elapsedSec));
    set("tracker-dist", isSwim ? distanceM.toFixed(0) : (distanceM / 1000).toFixed(2));
    if (distanceM > 50 && elapsedSec > 10) {
      set("tracker-pace", isSwim
        ? formatSecToMinSec(elapsedSec / (distanceM / 100))
        : formatSecToMinSec(elapsedSec / (distanceM / 1000)));
    }
    const gpsEl = document.getElementById("tracker-gps-status");
    if (gpsEl) {
      if (gpsError) {
        gpsEl.textContent = `⚠️ ${gpsError}`;
        gpsEl.className = "tracker-gps-status tracker-gps-status--error";
      } else if (gpsAccuracy != null) {
        gpsEl.textContent = `GPS ±${Math.round(gpsAccuracy)}m`;
        gpsEl.className = "tracker-gps-status";
      }
    }
  }

  function startTracking() {
    if (!trackerState || trackerState.phase !== "pre") return;
    trackerState.phase = "active";
    trackerState.startTime = Date.now();

    if (navigator.geolocation) {
      trackerState.watchId = navigator.geolocation.watchPosition(
        addTrackPoint,
        (err) => {
          if (!trackerState) return;
          trackerState.gpsError = err.code === 1 ? "Location access denied" : "GPS unavailable";
          updateTrackerDisplay();
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
      );
    } else {
      trackerState.gpsError = "Geolocation not supported";
    }

    trackerState.intervalId = setInterval(updateTrackerDisplay, 1000);

    if ("wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then((wl) => { wakeLock = wl; }).catch(() => {});
    }

    renderTrackerOverlay();
  }

  function pauseTracking() {
    if (!trackerState || trackerState.phase !== "active") return;
    trackerState.pausedMs += Date.now() - trackerState.startTime;
    trackerState.startTime = null;
    trackerState.phase = "paused";
    if (trackerState.intervalId != null) { clearInterval(trackerState.intervalId); trackerState.intervalId = null; }
    renderTrackerOverlay();
  }

  function resumeTracking() {
    if (!trackerState || trackerState.phase !== "paused") return;
    trackerState.phase = "active";
    trackerState.startTime = Date.now();
    trackerState.intervalId = setInterval(updateTrackerDisplay, 1000);
    renderTrackerOverlay();
  }

  function stopTracking() {
    if (!trackerState || (trackerState.phase !== "active" && trackerState.phase !== "paused")) return;
    let totalMs = trackerState.pausedMs;
    if (trackerState.phase === "active" && trackerState.startTime) totalMs += Date.now() - trackerState.startTime;
    trackerState.finalDurationMin = totalMs / 60000;
    trackerState.finalDistanceM = trackerState.distanceM;
    trackerState.phase = "done";
    if (trackerState.intervalId != null) { clearInterval(trackerState.intervalId); trackerState.intervalId = null; }
    if (trackerState.watchId != null) { navigator.geolocation.clearWatch(trackerState.watchId); trackerState.watchId = null; }
    if (wakeLock) { wakeLock.release(); wakeLock = null; }
    renderTrackerOverlay();
  }

  function addTrackPoint(pos) {
    if (!trackerState || trackerState.phase !== "active") return;
    const { latitude: lat, longitude: lon, accuracy } = pos.coords;
    trackerState.gpsAccuracy = accuracy;
    trackerState.gpsError = null;
    if (accuracy > 50) { updateTrackerDisplay(); return; } // ignore low-accuracy fixes

    const pt = { lat, lon, ts: pos.timestamp };
    if (trackerState.lastPoint) {
      const dt = (pos.timestamp - trackerState.lastPoint.ts) / 1000;
      const dm = haversineMeters(trackerState.lastPoint.lat, trackerState.lastPoint.lon, lat, lon);
      if (dt > 0 && dm / dt < 30) { // ignore GPS teleports (>108 km/h)
        trackerState.distanceM += dm;
        trackerState.points.push(pt);
      }
    } else {
      trackerState.points.push(pt);
    }
    trackerState.lastPoint = pt;

    const mapEl = document.getElementById("tracker-map");
    if (mapEl) mapEl.innerHTML = routeSVG(trackerState.points);
    updateTrackerDisplay();
  }

  function logTrackerResult() {
    if (!trackerState || trackerState.phase !== "done") return;
    const { key, session, finalDurationMin, finalDistanceM } = trackerState;
    const distM = finalDistanceM > 10 ? Math.round(finalDistanceM) : null;
    setEntry(key, {
      done: true,
      actualDurationMin: Math.round(finalDurationMin * 10) / 10,
      actualDistanceM: distM,
      completedAt: toISODate(new Date()),
    });
    const achieved = recordPRs(session, { actualDurationMin: finalDurationMin, actualDistanceM: distM });
    closeTracker();
    renderAll();
    if (achieved.length) showToast(achieved);
    else showToast(["Workout logged!"], "Done");
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
    renderCustomize();
    renderSettings();
  }

  // ---------- toast ----------

  function showToast(messages, title) {
    const heading = title || `New PR${messages.length > 1 ? "s" : ""}!`;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<strong>${escapeHtml(heading)}</strong><br>${messages.map(escapeHtml).join("<br>")}`;
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
        const session = getSessionForKey(key);
        if (!session) {
          expandedLogKey = null;
          renderAll();
          return;
        }
        let values;
        if (session.discipline === "triathlon") {
          const swim = readTriLeg("swim", true);
          const bike = readTriLeg("bike", false);
          const run = readTriLeg("run", false);
          const legTimes = [swim.durationMin, bike.durationMin, run.durationMin].filter((n) => n != null);
          values = {
            actualDurationMin: legTimes.length ? legTimes.reduce((a, b) => a + b, 0) : null,
            actualDistanceM: null,
            swimDurationMin: swim.durationMin,
            swimDistanceM: swim.distanceM,
            bikeDurationMin: bike.durationMin,
            bikeDistanceM: bike.distanceM,
            runDurationMin: run.durationMin,
            runDistanceM: run.distanceM,
          };
        } else {
          const formEl = logSaveBtn.closest(".log-form");
          const distInput = formEl.querySelector('input[id^="log-distance-"]');
          values = {
            actualDurationMin: readTimeInputsFromContainer(formEl),
            actualDistanceM: distInput && distInput.value ? distanceInputToMeters(session.discipline, distInput.value) : null,
          };
        }
        const newPRs = saveLog(key, session, values);
        expandedLogKey = null;
        renderAll();
        if (newPRs.length) showToast(newPRs);
        return;
      }
      const manualPRToggleBtn = e.target.closest("[data-manual-pr-toggle]");
      if (manualPRToggleBtn) {
        manualPRFormOpen = true;
        renderProgress();
        return;
      }
      const manualPRCancelBtn = e.target.closest("[data-manual-pr-cancel]");
      if (manualPRCancelBtn) {
        manualPRFormOpen = false;
        renderProgress();
        return;
      }
      const manualPRSaveBtn = e.target.closest("[data-manual-pr-save]");
      if (manualPRSaveBtn) {
        const discipline = document.getElementById("manual-pr-discipline").value;
        const distInput = document.getElementById("manual-pr-distance");
        const unitSel = document.getElementById("manual-pr-unit");
        const dateInput = document.getElementById("manual-pr-date");

        const actualDurationMin = readTimeInputs("manual-pr-time");
        const actualDistanceM = distInput.value ? distanceInputToMeters(unitSel.value === "km" ? "run" : "swim", distInput.value) : null;

        if (actualDurationMin == null && actualDistanceM == null) {
          showToast(["Enter a time and/or distance first."], "Nothing to save");
          return;
        }

        const date = dateInput.value || toISODate(new Date());
        const achieved = recordPRs({ discipline }, { actualDurationMin, actualDistanceM }, date);
        manualPRFormOpen = false;
        renderProgress();
        if (achieved.length) showToast(achieved);
        else showToast(["That result didn't beat your current personal best."], "No new PR");
        return;
      }
      const manualRaceToggleBtn = e.target.closest("[data-manual-race-toggle]");
      if (manualRaceToggleBtn) {
        raceFormState = { mode: "add" };
        renderProgress();
        return;
      }
      const raceEditBtn = e.target.closest("[data-race-edit]");
      if (raceEditBtn) {
        raceFormState = { mode: "edit", key: raceEditBtn.getAttribute("data-race-edit") };
        renderProgress();
        return;
      }
      const raceFormCancelBtn = e.target.closest("[data-race-form-cancel]");
      if (raceFormCancelBtn) {
        raceFormState = null;
        renderProgress();
        return;
      }
      const raceFormSaveBtn = e.target.closest("[data-race-form-save]");
      if (raceFormSaveBtn) {
        const key = raceFormSaveBtn.getAttribute("data-race-form-save");
        const typeId = document.getElementById("race-form-type").value;
        const labelInput = document.getElementById("race-form-label");
        const dateInput = document.getElementById("race-form-date");

        if (!dateInput.value) {
          showToast(["Pick a date for the race first."], "Nothing to save");
          return;
        }
        const label = labelInput.value.trim();

        if (!key) {
          customRaces.push({ id: makeId(), typeId, label, date: dateInput.value });
          saveCustomRaces();
        } else if (key.startsWith("c:")) {
          const id = key.slice(2);
          const race = customRaces.find((r) => r.id === id);
          if (race) {
            race.typeId = typeId;
            race.label = label;
            race.date = dateInput.value;
            saveCustomRaces();
          }
        } else if (key.startsWith("m:")) {
          const week = Number(key.slice(2));
          milestoneOverrides[week] = { typeId, label: label || null, date: dateInput.value };
          saveMilestoneOverrides();
        }
        raceFormState = null;
        renderProgress();
        return;
      }
      const raceRemoveBtn = e.target.closest("[data-race-remove]");
      if (raceRemoveBtn) {
        const key = raceRemoveBtn.getAttribute("data-race-remove");
        if (key.startsWith("c:")) {
          const id = key.slice(2);
          customRaces = customRaces.filter((r) => r.id !== id);
          saveCustomRaces();
        } else if (key.startsWith("m:")) {
          const week = Number(key.slice(2));
          milestoneOverrides[week] = { ...milestoneOverrides[week], hidden: true };
          saveMilestoneOverrides();
        }
        if (raceFormState && raceFormState.key === key) raceFormState = null;
        renderProgress();
        return;
      }
      const raceRestoreBtn = e.target.closest("[data-race-restore]");
      if (raceRestoreBtn) {
        const week = Number(raceRestoreBtn.getAttribute("data-race-restore"));
        delete milestoneOverrides[week];
        saveMilestoneOverrides();
        renderProgress();
        return;
      }
      const extraWorkoutToggleBtn = e.target.closest("[data-extra-workout-toggle]");
      if (extraWorkoutToggleBtn) {
        extraWorkoutFormState = { mode: "add" };
        renderToday();
        return;
      }
      const extraWorkoutEditBtn = e.target.closest("[data-extra-workout-edit]");
      if (extraWorkoutEditBtn) {
        extraWorkoutFormState = { mode: "edit", id: extraWorkoutEditBtn.getAttribute("data-extra-workout-edit") };
        renderToday();
        return;
      }
      const extraWorkoutCancelBtn = e.target.closest("[data-extra-workout-cancel]");
      if (extraWorkoutCancelBtn) {
        extraWorkoutFormState = null;
        renderToday();
        return;
      }
      const extraWorkoutSaveBtn = e.target.closest("[data-extra-workout-save]");
      if (extraWorkoutSaveBtn) {
        const id = extraWorkoutSaveBtn.getAttribute("data-extra-workout-save");
        const discipline = document.getElementById("extra-workout-discipline").value;
        const labelInput = document.getElementById("extra-workout-label");
        const label = labelInput.value.trim();
        const dateISO = toISODate(startOfDay(new Date()));
        const list = extraWorkouts[dateISO] || (extraWorkouts[dateISO] = []);

        let actualDurationMin, actualDistanceM, legData;

        if (discipline === "triathlon") {
          const swim = readTriLeg("swim", true);
          const bike = readTriLeg("bike", false);
          const run = readTriLeg("run", false);
          legData = {
            swimDurationMin: swim.durationMin,
            swimDistanceM: swim.distanceM,
            bikeDurationMin: bike.durationMin,
            bikeDistanceM: bike.distanceM,
            runDurationMin: run.durationMin,
            runDistanceM: run.distanceM,
          };
          const legTimes = [swim.durationMin, bike.durationMin, run.durationMin].filter((n) => n != null);
          actualDurationMin = legTimes.length ? legTimes.reduce((a, b) => a + b, 0) : null;
          actualDistanceM = null;
          if (actualDurationMin == null && !Object.values(legData).some((v) => v != null)) {
            showToast(["Enter at least one leg distance or time."], "Nothing to save");
            return;
          }
        } else {
          const distInput = document.getElementById("extra-workout-distance");
          const unitSel = document.getElementById("extra-workout-unit");
          actualDurationMin = readTimeInputs("extra-workout-time");
          actualDistanceM = distInput.value ? distanceInputToMeters(unitSel.value === "km" ? "run" : "swim", distInput.value) : null;
          legData = {};
          if (actualDurationMin == null && actualDistanceM == null) {
            showToast(["Enter a time and/or distance first."], "Nothing to save");
            return;
          }
        }

        if (id) {
          const w = list.find((x) => x.id === id);
          if (w) {
            Object.assign(w, { discipline, label, actualDurationMin, actualDistanceM }, legData);
          }
        } else {
          list.push({ id: makeId(), discipline, label, actualDurationMin, actualDistanceM, ...legData });
        }
        saveExtraWorkouts();
        const achieved = discipline !== "triathlon" ? recordPRs({ discipline }, { actualDurationMin, actualDistanceM }) : [];

        extraWorkoutFormState = null;
        renderToday();
        if (achieved.length) showToast(achieved);
        return;
      }
      const extraWorkoutRemoveBtn = e.target.closest("[data-extra-workout-remove]");
      if (extraWorkoutRemoveBtn) {
        const id = extraWorkoutRemoveBtn.getAttribute("data-extra-workout-remove");
        const dateISO = toISODate(startOfDay(new Date()));
        if (extraWorkouts[dateISO]) {
          extraWorkouts[dateISO] = extraWorkouts[dateISO].filter((x) => x.id !== id);
          if (!extraWorkouts[dateISO].length) delete extraWorkouts[dateISO];
          saveExtraWorkouts();
        }
        if (extraWorkoutFormState && extraWorkoutFormState.id === id) extraWorkoutFormState = null;
        renderToday();
        return;
      }
      const revertAllBtn = e.target.closest("[data-revert-all-edits]");
      if (revertAllBtn) {
        if (confirm("Revert all workout customizations? This cannot be undone.")) {
          sessionEdits = {};
          saveSessionEdits();
          customizeEditKey = null;
          customizeAddDayKey = null;
          renderAll();
        }
        return;
      }
      const sessionEditOpenBtn = e.target.closest("[data-session-edit-open]");
      if (sessionEditOpenBtn) {
        customizeEditKey = sessionEditOpenBtn.getAttribute("data-session-edit-open");
        customizeAddDayKey = null;
        renderCustomize();
        return;
      }
      const sessionEditCancelBtn = e.target.closest("[data-session-edit-cancel]");
      if (sessionEditCancelBtn) {
        customizeEditKey = null;
        renderCustomize();
        return;
      }
      const sessionEditSaveBtn = e.target.closest("[data-session-edit-save]");
      if (sessionEditSaveBtn) {
        const sKey = sessionEditSaveBtn.getAttribute("data-session-edit-save");
        const parsed = parseDayKey(sKey);
        if (!parsed) { customizeEditKey = null; renderCustomize(); return; }

        const discEl = document.getElementById(`cedit-discipline-${sKey}`);
        const titleEl = document.getElementById(`cedit-title-${sKey}`);
        const durEl = document.getElementById(`cedit-duration-${sKey}`);
        const distEl = document.getElementById(`cedit-distance-${sKey}`);
        const disc = discEl ? discEl.value : null;
        const title = titleEl ? titleEl.value.trim() : "";
        const durationMin = durEl && durEl.value ? Number(durEl.value) || null : null;
        const distVal = distEl && distEl.value ? Number(distEl.value) : null;
        const distanceM = distVal != null && distVal > 0 ? (disc === "swim" ? distVal : Math.round(distVal * 1000)) : null;

        if (!title) { showToast(["Enter a title first."], "Nothing to save"); return; }

        if (parsed.addedId) {
          mutateDayEdits(parsed.week, parsed.dayIdx, (edits) => {
            edits.added = (edits.added || []).map((a) =>
              a.id === parsed.addedId ? { ...a, discipline: disc, title, durationMin, distanceM } : a
            );
          });
        } else {
          mutateDayEdits(parsed.week, parsed.dayIdx, (edits) => {
            edits.overrides = { ...edits.overrides, [String(parsed.sessionIdx)]: { discipline: disc, title, durationMin, distanceM } };
          });
        }

        customizeEditKey = null;
        renderAll();
        return;
      }
      const sessionDropBtn = e.target.closest("[data-session-drop]");
      if (sessionDropBtn) {
        const sKey = sessionDropBtn.getAttribute("data-session-drop");
        const parsed = parseDayKey(sKey);
        if (!parsed) return;

        if (parsed.addedId) {
          mutateDayEdits(parsed.week, parsed.dayIdx, (edits) => {
            edits.added = (edits.added || []).filter((a) => a.id !== parsed.addedId);
          });
        } else {
          mutateDayEdits(parsed.week, parsed.dayIdx, (edits) => {
            edits.overrides = { ...edits.overrides, [String(parsed.sessionIdx)]: { dropped: true } };
          });
        }

        if (customizeEditKey === sKey) customizeEditKey = null;
        renderAll();
        return;
      }
      const sessionRevertBtn = e.target.closest("[data-session-revert]");
      if (sessionRevertBtn) {
        const sKey = sessionRevertBtn.getAttribute("data-session-revert");
        const parsed = parseDayKey(sKey);
        if (!parsed) return;

        mutateDayEdits(parsed.week, parsed.dayIdx, (edits) => {
          if (edits.overrides) {
            delete edits.overrides[String(parsed.sessionIdx)];
            if (!Object.keys(edits.overrides).length) delete edits.overrides;
          }
        });

        if (customizeEditKey === sKey) customizeEditKey = null;
        renderAll();
        return;
      }
      const sessionAddOpenBtn = e.target.closest("[data-session-add-open]");
      if (sessionAddOpenBtn) {
        customizeAddDayKey = sessionAddOpenBtn.getAttribute("data-session-add-open");
        customizeEditKey = null;
        renderCustomize();
        return;
      }
      const sessionAddCancelBtn = e.target.closest("[data-session-add-cancel]");
      if (sessionAddCancelBtn) {
        customizeAddDayKey = null;
        renderCustomize();
        return;
      }
      const sessionAddSaveBtn = e.target.closest("[data-session-add-save]");
      if (sessionAddSaveBtn) {
        const dk = sessionAddSaveBtn.getAttribute("data-session-add-save");
        const parsed = parseDayKey(dk);
        if (!parsed) { customizeAddDayKey = null; renderCustomize(); return; }

        const discEl = document.getElementById(`cadd-discipline-${dk}`);
        const titleEl = document.getElementById(`cadd-title-${dk}`);
        const durEl = document.getElementById(`cadd-duration-${dk}`);
        const distEl = document.getElementById(`cadd-distance-${dk}`);
        const unitEl = document.getElementById(`cadd-dist-unit-${dk}`);

        const disc = discEl ? discEl.value : "run";
        const title = titleEl ? titleEl.value.trim() : "";
        const durationMin = durEl && durEl.value ? Number(durEl.value) || null : null;
        const distRaw = distEl && distEl.value ? Number(distEl.value) : null;
        const unit = unitEl ? unitEl.value : "km";
        const distanceM = distRaw != null && distRaw > 0 ? (unit === "m" ? distRaw : Math.round(distRaw * 1000)) : null;

        if (!title) { showToast(["Enter a title first."], "Nothing to save"); return; }
        if (!durationMin && !distanceM) { showToast(["Enter a duration or distance."], "Nothing to save"); return; }

        mutateDayEdits(parsed.week, parsed.dayIdx, (edits) => {
          edits.added = [...(edits.added || []), { id: makeId(), discipline: disc, title, detail: "", durationMin, distanceM }];
        });

        customizeAddDayKey = null;
        renderAll();
        return;
      }
      const trackOpenBtn = e.target.closest("[data-track-open]");
      if (trackOpenBtn) {
        const key = trackOpenBtn.getAttribute("data-track-open");
        const session = getSessionForKey(key);
        if (session) openTracker(session, key);
        return;
      }
      const moveToggleBtn = e.target.closest("[data-move-toggle]");
      if (moveToggleBtn) {
        const key = moveToggleBtn.getAttribute("data-move-toggle");
        moveFormKey = moveFormKey === key ? null : key;
        renderAll();
        return;
      }
      const moveCancelBtn = e.target.closest("[data-move-cancel]");
      if (moveCancelBtn) {
        moveFormKey = null;
        renderAll();
        return;
      }
      const moveSaveBtn = e.target.closest("[data-move-save]");
      if (moveSaveBtn) {
        const key = moveSaveBtn.getAttribute("data-move-save");
        const dateInput = document.getElementById(`move-date-${key}`);
        const value = dateInput && dateInput.value;
        if (!value) {
          showToast(["Pick a date first."], "Nothing to save");
          return;
        }
        const originalISO = getOriginalDateISO(key, getStartDate());
        if (value === originalISO) delete sessionMoves[key];
        else sessionMoves[key] = value;
        saveSessionMoves();
        moveFormKey = null;
        renderAll();
        return;
      }
      const moveUndoBtn = e.target.closest("[data-move-undo]");
      if (moveUndoBtn) {
        const key = moveUndoBtn.getAttribute("data-move-undo");
        delete sessionMoves[key];
        saveSessionMoves();
        if (moveFormKey === key) moveFormKey = null;
        renderAll();
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

    document.body.addEventListener("change", (e) => {
      if (e.target.dataset.disciplineSelect) {
        const form = e.target.closest(".log-form");
        if (form) form.dataset.discipline = e.target.value;
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
    customRaces = loadCustomRaces();
    milestoneOverrides = loadMilestoneOverrides();
    extraWorkouts = loadExtraWorkouts();
    sessionMoves = loadSessionMoves();
    sessionEdits = loadSessionEdits();
    const res = await fetch("data/plan.json");
    plan = await res.json();
    setupEventListeners();
    renderAll();
    registerServiceWorker();
  }

  boot();
})();
