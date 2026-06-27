(function () {
  "use strict";

  const STORAGE_START_DATE = "c2t_start_date";
  const STORAGE_COMPLETED = "c2t_completed";
  const STORAGE_PRS = "c2t_prs";
  const STORAGE_CUSTOM_RACES = "c2t_custom_races";
  const STORAGE_MILESTONE_OVERRIDES = "c2t_milestone_overrides";
  const STORAGE_EXTRA_WORKOUTS = "c2t_extra_workouts";

  const DISCIPLINE_ICON = {
    run: "\u{1F3C3}",
    bike: "\u{1F6B4}",
    swim: "\u{1F3CA}",
    strength: "\u{1F4AA}",
    brick: "\u{1F501}",
    race: "\u{1F3C1}",
  };

  const DISCIPLINE_LABEL = { run: "Run", bike: "Bike", swim: "Swim", brick: "Brick", strength: "Strength" };

  // Disciplines that can log an actual time/distance result.
  const LOGGABLE_DISCIPLINES = ["run", "bike", "swim", "brick"];
  const DISTANCE_PR_DISCIPLINES = ["run", "bike", "swim"];
  const DURATION_PR_DISCIPLINES = ["run", "bike", "swim", "brick"];
  // Disciplines selectable when logging a workout outside the plan (rest day, or different from what's planned).
  const EXTRA_WORKOUT_DISCIPLINES = ["run", "bike", "swim", "brick", "strength"];

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
  let activeView = "today";
  let deferredInstallPrompt = null;
  let expandedLogKey = null;
  let sessionByKey = {};
  let manualPRFormOpen = false;
  let raceFormState = null; // null | { mode: "add" } | { mode: "edit", key }
  let extraWorkoutFormState = null; // null | { mode: "add" } | { mode: "edit", id }

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
    const distanceVal = log && log.actualDistanceM != null ? metersToDistanceInputValue(session.discipline, log.actualDistanceM) : "";
    const hasDistanceField = session.discipline !== "brick";

    return `<div class="log-block">
      <div class="log-form">
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

        const plannedRowHTML = !day.sessions.length
          ? `<div class="day-row"><span class="day-row__label">${dateStr}</span><span class="day-row__title rest-note">Rest</span><span class="day-row__meta"></span></div>`
          : (() => {
              const s = day.sessions[0];
              const meta = formatSessionMeta(s);
              return `<div class="day-row">
                <span class="day-row__label">${dateStr}</span>
                <span class="day-row__title">${sessionIcon(s.discipline)} ${escapeHtml(s.title)}</span>
                <span class="day-row__meta">${meta}</span>
                <button class="session-check ${done ? "is-checked" : ""}" data-key="${key}" aria-label="Mark complete" style="margin-left:8px;">${done ? "✓" : ""}</button>
              </div>`;
            })();

        const extras = date ? extraWorkouts[toISODate(date)] || [] : [];
        const extraRowsHTML = extras.map((w) => extraWorkoutDayRowHTML(w)).join("");

        return plannedRowHTML + extraRowsHTML;
      })
      .join("");
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
    const disciplineOptions = EXTRA_WORKOUT_DISCIPLINES.map(
      (d) => `<option value="${d}" ${prefill && prefill.discipline === d ? "selected" : ""}>${DISCIPLINE_LABEL[d]}</option>`
    ).join("");
    const labelVal = prefill ? escapeHtml(prefill.label || "") : "";
    const unitVal = prefill && prefill.discipline === "swim" ? "m" : "km";
    const distanceVal =
      prefill && prefill.actualDistanceM != null ? metersToDistanceInputValue(unitVal === "m" ? "swim" : "run", prefill.actualDistanceM) : "";
    const idAttr = prefill ? prefill.id : "";
    return `<div class="log-form">
      <label class="field">
        <span>Activity</span>
        <select id="extra-workout-discipline">${disciplineOptions}</select>
      </label>
      <label class="field">
        <span>Description (optional)</span>
        <input type="text" placeholder="e.g. Easy bike instead of run" id="extra-workout-label" value="${labelVal}">
      </label>
      <label class="field">
        <span>Time (min : sec)</span>
        ${timeInputsHTML("extra-workout-time", prefill && prefill.actualDurationMin)}
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
        const session = sessionByKey[key];
        if (!session) {
          expandedLogKey = null;
          renderAll();
          return;
        }
        const distInput = document.getElementById(`log-distance-${key}`);
        const actualDurationMin = readTimeInputs(`log-time-${key}`);
        const actualDistanceM = distInput && distInput.value ? distanceInputToMeters(session.discipline, distInput.value) : null;
        const newPRs = saveLog(key, session, { actualDurationMin, actualDistanceM });
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
        const distInput = document.getElementById("extra-workout-distance");
        const unitSel = document.getElementById("extra-workout-unit");

        const actualDurationMin = readTimeInputs("extra-workout-time");
        const actualDistanceM = distInput.value ? distanceInputToMeters(unitSel.value === "km" ? "run" : "swim", distInput.value) : null;

        if (actualDurationMin == null && actualDistanceM == null) {
          showToast(["Enter a time and/or distance first."], "Nothing to save");
          return;
        }

        const label = labelInput.value.trim();
        const dateISO = toISODate(startOfDay(new Date()));
        const list = extraWorkouts[dateISO] || (extraWorkouts[dateISO] = []);

        if (id) {
          const w = list.find((x) => x.id === id);
          if (w) {
            w.discipline = discipline;
            w.label = label;
            w.actualDurationMin = actualDurationMin;
            w.actualDistanceM = actualDistanceM;
          }
        } else {
          list.push({ id: makeId(), discipline, label, actualDurationMin, actualDistanceM });
        }
        saveExtraWorkouts();
        const achieved = recordPRs({ discipline }, { actualDurationMin, actualDistanceM });

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
    customRaces = loadCustomRaces();
    milestoneOverrides = loadMilestoneOverrides();
    extraWorkouts = loadExtraWorkouts();
    const res = await fetch("data/plan.json");
    plan = await res.json();
    setupEventListeners();
    renderAll();
    registerServiceWorker();
  }

  boot();
})();
