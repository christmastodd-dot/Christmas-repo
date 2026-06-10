// Candy Guessing Game - Christmas Edition
// 1-4 player hot-seat party game. Pure client-side, no server needed.

(function () {
  const MIN_PLAYERS = 1;
  const MAX_PLAYERS = 4;
  const QUESTIONS_PER_ROUND = MAX_QUESTIONS; // from candy-data.js
  const TOTAL_ROUNDS = 5;
  const CORRECT_GUESS_POINTS = 10;
  const REMAINING_QUESTION_BONUS = 2;

  const app = document.getElementById('app');
  let state = null;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function render(html) {
    app.innerHTML = html;
  }

  function randomCandy() {
    return CANDIES[Math.floor(Math.random() * CANDIES.length)];
  }

  // ---------------- SHARED LOGIN API ----------------

  const POLL_INTERVAL_MS = 5000;
  const HEARTBEAT_INTERVAL_MS = 15000;

  // Usernames "logged in" from this browser tab (heartbeats keep them online).
  const loggedInUsers = new Set();
  let pollTimer = null;
  let heartbeatTimer = null;

  async function apiPost(path, body) {
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (e) {
      return { error: 'Could not reach the server.' };
    }
  }

  async function fetchOnlineUsers() {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  }

  function startHeartbeat() {
    if (heartbeatTimer) return;
    heartbeatTimer = setInterval(() => {
      loggedInUsers.forEach((name) => apiPost('/api/heartbeat', { username: name }));
    }, HEARTBEAT_INTERVAL_MS);
  }

  function stopHeartbeatIfIdle() {
    if (loggedInUsers.size === 0 && heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function logoutAllOnUnload() {
    loggedInUsers.forEach((name) => {
      const blob = new Blob([JSON.stringify({ username: name })], { type: 'application/json' });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/logout', blob);
      } else {
        apiPost('/api/logout', { username: name });
      }
    });
  }

  window.addEventListener('beforeunload', logoutAllOnUnload);

  // ---------------- PLAYER SELECT SCREEN ----------------

  function initSetup() {
    state = {
      phase: 'player-select',
      allUsers: [],
      selected: [],
      addingPlayer: false,
      loading: true,
      errorMessage: '',
    };
    renderPlayerSelect();
    refreshUsers().then(() => {
      state.loading = false;
      renderPlayerSelect();
    });

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      if (state.phase !== 'player-select') return;
      await refreshUsers();
      renderPlayerSelect();
    }, POLL_INTERVAL_MS);
  }

  async function refreshUsers() {
    state.allUsers = await fetchOnlineUsers();
  }

  function renderPlayerSelect() {
    const { allUsers, selected, addingPlayer, loading, errorMessage } = state;
    const isFirstTime = allUsers.length === 0 && !loading;

    const userButtons = allUsers
      .map((u) => `
        <button class="profile-btn ${selected.includes(u.username) ? 'selected' : ''}" data-name="${escapeHtml(u.username)}">
          <span class="online-dot ${u.online ? 'online' : 'offline'}" title="${u.online ? 'Online' : 'Offline'}"></span>
          ${escapeHtml(u.username)}
        </button>
      `)
      .join('');

    const addPlayerSection = addingPlayer
      ? `
        <input type="text" class="player-name-input" id="new-username-input" maxlength="20" placeholder="Enter a username..." autocomplete="off">
        <div class="actions">
          <button class="btn-secondary" id="confirm-add-btn">Log In</button>
          ${allUsers.length > 0 ? '<button class="btn-secondary" id="cancel-add-btn">Cancel</button>' : ''}
        </div>
      `
      : `
        <div class="actions">
          <button class="btn-secondary" id="add-player-btn">+ New Username</button>
        </div>
      `;

    render(`
      <h2>${isFirstTime ? 'Welcome!' : 'Who\'s Playing?'}</h2>
      ${
        isFirstTime
          ? '<p>Looks like no one has logged in yet. Create a username to get started &mdash; no password needed!</p>'
          : '<p>Select 1-4 players. Pick an existing username to log in, or create a new one. The green dot shows who\'s currently online.</p>'
      }
      ${errorMessage ? `<p class="status-line">${escapeHtml(errorMessage)}</p>` : ''}
      ${loading ? '<p class="status-line">Loading players...</p>' : ''}
      ${userButtons ? `<div class="player-count-row" style="flex-wrap: wrap;">${userButtons}</div>` : ''}
      ${addPlayerSection}
      <p class="status-line">${selected.length}/${MAX_PLAYERS} players selected</p>
      <div class="actions">
        <button class="btn-primary" id="start-btn" ${selected.length < MIN_PLAYERS ? 'disabled' : ''}>Start Game &#127876;</button>
      </div>
    `);

    document.querySelectorAll('.profile-btn').forEach((btn) => {
      btn.addEventListener('click', () => toggleSelection(btn.dataset.name));
    });

    if (addingPlayer) {
      const input = document.getElementById('new-username-input');
      input.focus();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addUsername();
      });
      document.getElementById('confirm-add-btn').addEventListener('click', addUsername);
      const cancelBtn = document.getElementById('cancel-add-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          state.addingPlayer = false;
          renderPlayerSelect();
        });
      }
    } else {
      document.getElementById('add-player-btn').addEventListener('click', () => {
        state.addingPlayer = true;
        renderPlayerSelect();
      });
    }

    document.getElementById('start-btn').addEventListener('click', startGame);
  }

  async function toggleSelection(name) {
    const idx = state.selected.indexOf(name);
    if (idx >= 0) {
      state.selected.splice(idx, 1);
      loggedInUsers.delete(name);
      stopHeartbeatIfIdle();
      apiPost('/api/logout', { username: name });
      await refreshUsers();
      renderPlayerSelect();
      return;
    }

    if (state.selected.length >= MAX_PLAYERS) return;

    const result = await apiPost('/api/login', { username: name });
    if (result.error) {
      state.errorMessage = result.error;
      renderPlayerSelect();
      return;
    }

    state.selected.push(result.username);
    loggedInUsers.add(result.username);
    startHeartbeat();
    await refreshUsers();
    renderPlayerSelect();
  }

  async function addUsername() {
    const input = document.getElementById('new-username-input');
    const name = input.value.trim();
    if (!name) return;

    if (state.selected.length >= MAX_PLAYERS) {
      state.errorMessage = `Only ${MAX_PLAYERS} players can play at once.`;
      renderPlayerSelect();
      return;
    }

    const result = await apiPost('/api/login', { username: name });
    if (result.error) {
      state.errorMessage = result.error;
      renderPlayerSelect();
      return;
    }

    state.selected.push(result.username);
    loggedInUsers.add(result.username);
    state.addingPlayer = false;
    state.errorMessage = '';
    startHeartbeat();
    await refreshUsers();
    renderPlayerSelect();
  }

  function startGame() {
    const players = state.selected.map((name) => ({ name, score: 0 }));

    state = {
      phase: 'asking',
      players,
      round: 1,
    };

    startRound();
    renderAsking();
  }

  function startRound() {
    state.candy = randomCandy();
    state.possibleCandies = CANDIES.slice();
    state.askedIndices = [];
    state.questionsAsked = [];
    state.questionsLeft = QUESTIONS_PER_ROUND;
    state.currentAskerIndex = (state.round - 1) % state.players.length;
    state.guesses = new Array(state.players.length).fill(null);
    state.currentGuesserIndex = 0;
    state.passReady = state.players.length === 1;
    state.phase = 'asking';
  }

  // ---------------- SCOREBOARD / SHARED HELPERS ----------------

  function renderScoreboard(highlightIndex) {
    return `
      <div class="scoreboard">
        ${state.players
          .map((p, i) => `
            <span class="score-pill ${i === highlightIndex ? 'current' : ''}">
              ${escapeHtml(p.name)}: ${p.score}
            </span>
          `)
          .join('')}
      </div>
    `;
  }

  function renderQaLog() {
    if (state.questionsAsked.length === 0) {
      return '<p class="status-line">No questions asked yet.</p>';
    }
    return `
      <div class="qa-log">
        ${state.questionsAsked
          .map(
            (qa) => `
              <div class="qa-item">
                <strong>${escapeHtml(qa.askedBy)}</strong> asked: "${escapeHtml(qa.text)}"
                &mdash; <span class="${qa.answer ? 'answer-yes' : 'answer-no'}">${qa.answer ? 'YES' : 'NO'}</span>
              </div>
            `
          )
          .join('')}
      </div>
    `;
  }

  // ---------------- ASKING PHASE ----------------

  function renderAsking() {
    const asker = state.players[state.currentAskerIndex];
    const availableQuestions = QUESTIONS.filter(
      (_, i) => !state.askedIndices.includes(i)
    );

    const questionButtons = QUESTIONS.map((q, i) => {
      if (state.askedIndices.includes(i)) return '';
      return `<button class="btn-question" data-question-index="${i}">${escapeHtml(q[0])}</button>`;
    }).join('');

    render(`
      <div class="round-banner">Round ${state.round} of ${TOTAL_ROUNDS}</div>
      ${renderScoreboard(state.currentAskerIndex)}
      <h2>&#127873; Guess the Candy!</h2>
      <p class="status-line">
        Questions left this round: ${state.questionsLeft} &middot;
        Possible candies remaining: ${state.possibleCandies.length}
      </p>
      ${renderQaLog()}
      <h3>${escapeHtml(asker.name)}'s turn &mdash; pick a question to ask:</h3>
      ${questionButtons}
      ${availableQuestions.length === 0 ? '<p>No more questions available!</p>' : ''}
      <div class="actions">
        <button class="btn-secondary" id="skip-to-guess-btn">Skip to Guessing</button>
      </div>
    `);

    document.querySelectorAll('.btn-question').forEach((btn) => {
      btn.addEventListener('click', () => {
        askQuestion(parseInt(btn.dataset.questionIndex, 10));
      });
    });

    document.getElementById('skip-to-guess-btn').addEventListener('click', () => {
      state.questionsLeft = 0;
      goToGuessing();
    });
  }

  function askQuestion(index) {
    const [text, attribute] = QUESTIONS[index];
    const answer = state.candy[attribute];

    state.askedIndices.push(index);
    state.possibleCandies = state.possibleCandies.filter((c) => c[attribute] === answer);
    state.questionsAsked.push({
      askedBy: state.players[state.currentAskerIndex].name,
      text,
      answer,
    });
    state.questionsLeft -= 1;
    state.currentAskerIndex = (state.currentAskerIndex + 1) % state.players.length;

    if (
      state.questionsLeft <= 0 ||
      state.possibleCandies.length <= 1 ||
      state.askedIndices.length >= QUESTIONS.length
    ) {
      goToGuessing();
    } else {
      renderAsking();
    }
  }

  function goToGuessing() {
    state.phase = 'guessing';
    state.currentGuesserIndex = 0;
    state.passReady = state.players.length === 1;
    renderGuessStep();
  }

  // ---------------- GUESSING PHASE ----------------

  function renderGuessStep() {
    if (state.currentGuesserIndex >= state.players.length) {
      revealResults();
      return;
    }

    const guesser = state.players[state.currentGuesserIndex];

    if (!state.passReady) {
      render(`
        <div class="round-banner">Round ${state.round} of ${TOTAL_ROUNDS}</div>
        <div class="pass-screen">
          <h2>&#128231; Pass the Device</h2>
          <p>It's time for</p>
          <p class="player-name">${escapeHtml(guesser.name)}</p>
          <p>to make their guess. Make sure no one else is peeking!</p>
          <div class="actions" style="justify-content: center;">
            <button class="btn-primary" id="ready-btn">I'm Ready &#127876;</button>
          </div>
        </div>
      `);
      document.getElementById('ready-btn').addEventListener('click', () => {
        state.passReady = true;
        renderGuessStep();
      });
      return;
    }

    render(`
      <div class="round-banner">Round ${state.round} of ${TOTAL_ROUNDS}</div>
      <h2>&#127873; ${escapeHtml(guesser.name)}, what's your guess?</h2>
      <p class="status-line">
        Based on ${state.questionsAsked.length} question(s), ${state.possibleCandies.length}
        candy(ies) match the clues.
      </p>
      ${renderQaLog()}
      <input type="text" class="guess-input" id="guess-input" placeholder="Type the candy name..." autocomplete="off">
      <div class="actions">
        <button class="btn-primary" id="submit-guess-btn">Lock In Guess</button>
      </div>
    `);

    const input = document.getElementById('guess-input');
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitGuess();
    });
    document.getElementById('submit-guess-btn').addEventListener('click', submitGuess);
  }

  function submitGuess() {
    const input = document.getElementById('guess-input');
    state.guesses[state.currentGuesserIndex] = input.value.trim();
    state.currentGuesserIndex += 1;
    state.passReady = state.players.length === 1;
    renderGuessStep();
  }

  // ---------------- REVEAL PHASE ----------------

  function candyFunFacts(candy) {
    const traitMap = [
      ['chocolate', 'contains chocolate'],
      ['chewy', 'chewy'],
      ['hard', 'hard candy'],
      ['sour', 'sour'],
      ['gummy', 'gummy'],
      ['fruity', 'fruity flavored'],
      ['nutty', 'contains nuts'],
      ['caramel', 'has caramel'],
      ['mint', 'mint flavored'],
      ['bar', 'a candy bar'],
      ['individually_wrapped', 'individually wrapped'],
      ['american_classic', 'an American classic'],
    ];
    const traits = traitMap.filter(([key]) => candy[key]).map(([, label]) => label);
    return traits.length ? traits.join(', ') : 'a unique candy!';
  }

  function revealResults() {
    state.phase = 'reveal';
    const correctName = state.candy.name.trim().toLowerCase();
    const bonus = state.questionsLeft * REMAINING_QUESTION_BONUS;

    state.results = state.players.map((player, i) => {
      const guess = state.guesses[i] || '';
      const correct = guess.trim().toLowerCase() === correctName;
      const points = correct ? CORRECT_GUESS_POINTS + bonus : 0;
      player.score += points;
      return { name: player.name, guess, correct, points };
    });

    renderReveal();
  }

  function renderReveal() {
    const candy = state.candy;

    render(`
      <div class="round-banner">Round ${state.round} of ${TOTAL_ROUNDS} &mdash; Results</div>
      <div class="candy-reveal">
        <p>The secret candy was...</p>
        <p class="candy-name">${escapeHtml(candy.name)}</p>
        <p>First appeared in the ${escapeHtml(candy.decades)}. It's ${escapeHtml(candyFunFacts(candy))}.</p>
      </div>
      <ul class="results-list">
        ${state.results
          .map(
            (r) => `
              <li class="${r.correct ? 'correct' : 'incorrect'}">
                <span>${escapeHtml(r.name)}: "${escapeHtml(r.guess) || '(no guess)'}"</span>
                <span>${r.correct ? `+${r.points} &#127881;` : 'Wrong'}</span>
              </li>
            `
          )
          .join('')}
      </ul>
      ${renderScoreboard(-1)}
      <div class="actions">
        <button class="btn-primary" id="continue-btn">
          ${state.round >= TOTAL_ROUNDS ? 'See Final Results' : 'Next Round'}
        </button>
      </div>
    `);

    document.getElementById('continue-btn').addEventListener('click', () => {
      if (state.round >= TOTAL_ROUNDS) {
        renderFinal();
      } else {
        state.round += 1;
        startRound();
        renderAsking();
      }
    });
  }

  // ---------------- FINAL RESULTS ----------------

  function renderFinal() {
    state.phase = 'final';
    const ranked = state.players.slice().sort((a, b) => b.score - a.score);
    const topScore = ranked.length ? ranked[0].score : 0;

    render(`
      <h2>&#127881; Final Results &#127881;</h2>
      <ul class="final-list">
        ${ranked
          .map(
            (p) => `
              <li class="${p.score === topScore ? 'winner' : ''}">
                <span>${p.score === topScore ? '&#127942; ' : ''}${escapeHtml(p.name)}</span>
                <span>${p.score} pts</span>
              </li>
            `
          )
          .join('')}
      </ul>
      <div class="actions">
        <button class="btn-primary" id="play-again-btn">Play Again</button>
        <button class="btn-secondary" id="new-players-btn">New Players</button>
      </div>
    `);

    document.getElementById('play-again-btn').addEventListener('click', () => {
      state.players.forEach((p) => { p.score = 0; });
      state.round = 1;
      startRound();
      renderAsking();
    });

    document.getElementById('new-players-btn').addEventListener('click', initSetup);
  }

  // ---------------- SNOWFALL DECORATION ----------------

  function initSnowfall() {
    const container = document.querySelector('.snowfall');
    if (!container) return;
    const flakeCount = 30;
    for (let i = 0; i < flakeCount; i++) {
      const flake = document.createElement('span');
      flake.textContent = '❄';
      flake.style.left = `${Math.random() * 100}vw`;
      flake.style.fontSize = `${10 + Math.random() * 16}px`;
      flake.style.animationDuration = `${8 + Math.random() * 12}s`;
      flake.style.animationDelay = `${Math.random() * 10}s`;
      container.appendChild(flake);
    }
  }

  // ---------------- INIT ----------------

  initSnowfall();
  initSetup();
})();
