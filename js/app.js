(function () {
  "use strict";

  const STORAGE_START_DATE = "c2t_start_date";
  const STORAGE_COMPLETED = "c2t_completed";

  const DISCIPLINE_ICON = {
    run: "\u{1F3C3}",
    bike: "\u{1F6B4}",
    swim: "\u{1F3CA}",
    strength: "\u{1F4AA}",
    brick: "\u{1F501}",
    race: "\u{1F3C1}",
  };

  let plan = null;
  let completedMap = {};
  let activeView = "today";
  let deferredInstallPrompt = null;

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

  function toggleComplete(key) {
    completedMap[key] = !completedMap[key];
    saveCompleted();
    renderAll();
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

  function formatSessionMeta(session) {
    if (session.durationMin != null) return `${session.durationMin} min`;
    if (session.distanceM != null) {
      return session.distanceM >= 1000
        ? `${(session.distanceM / 1000).toFixed(session.distanceM % 1000 === 0 ? 0 : 1)} km`
        : `${session.distanceM} m`;
    }
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

  // ---------- rendering: shared session/day markup ----------

  function sessionCardHTML(session, key, isDone) {
    const meta = formatSessionMeta(session);
    return `
      <div class="session-card ${isDone ? "is-done" : ""} ${session.discipline === "race" ? "is-race" : ""}">
        <div class="session-icon">${sessionIcon(session.discipline)}</div>
        <div class="session-body">
          <div class="session-title">${escapeHtml(session.title)}${meta ? `<span class="session-meta">${meta}</span>` : ""}</div>
          <div class="session-detail">${escapeHtml(session.detail)}</div>
        </div>
        <button class="session-check ${isDone ? "is-checked" : ""}" data-key="${key}" aria-label="Mark complete">${isDone ? "✓" : ""}</button>
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
        const isDone = !!completedMap[key];
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
          <button class="session-check ${isDone ? "is-checked" : ""}" data-key="${key}" aria-label="Mark complete" style="margin-left:8px;">${isDone ? "✓" : ""}</button>
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
        .map((s) => {
          const key = dayKey(week.week, pos.dayIdx);
          return sessionCardHTML(s, key, !!completedMap[key]);
        })
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
        if (completedMap[key]) {
          completedCount++;
          const s = day.sessions[0];
          if (s.durationMin != null) totalMinutes += s.durationMin;
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
      if (completedMap[activeDayKeys[i]]) streak++;
      else break;
    }

    const milestonesHTML = plan.milestones
      .map((m) => {
        const mDate = dateForWeekDay(startDate, m.week, 6);
        const daysOut = daysBetween(today, mDate);
        const key = dayKey(m.week, 6);
        const done = !!completedMap[key] || daysOut < 0;
        const statusText = completedMap[key]
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

  // ---------- event delegation ----------

  function setupEventListeners() {
    document.body.addEventListener("click", (e) => {
      const checkBtn = e.target.closest(".session-check");
      if (checkBtn) {
        toggleComplete(checkBtn.dataset.key);
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
    const res = await fetch("data/plan.json");
    plan = await res.json();
    setupEventListeners();
    renderAll();
    registerServiceWorker();
  }

  boot();
})();
