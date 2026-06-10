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

  // ---------------- SETUP SCREEN ----------------

  function initSetup() {
    const previousNames = (state && state.players) ? state.players.map((p) => p.name) : [];
    state = {
      phase: 'setup',
      numPlayers: previousNames.length || 1,
      names: [
        previousNames[0] || 'Player 1',
        previousNames[1] || 'Player 2',
        previousNames[2] || 'Player 3',
        previousNames[3] || 'Player 4',
      ],
    };
    renderSetup();
  }

  function renderSetup() {
    let countButtons = '';
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      countButtons += `<button class="count-btn ${n === state.numPlayers ? 'selected' : ''}" data-count="${n}">${n}</button>`;
    }

    let nameInputs = '';
    for (let i = 0; i < state.numPlayers; i++) {
      nameInputs += `<input class="player-name-input" data-player-index="${i}" type="text" maxlength="20" placeholder="Player ${i + 1} name" value="${escapeHtml(state.names[i])}">`;
    }

    render(`
      <h2>Get Ready!</h2>
      <p>A secret candy will be chosen each round. Take turns asking yes/no
      questions, then everyone privately guesses the candy. Most points after
      ${TOTAL_ROUNDS} rounds wins!</p>
      <p><strong>How many players? (1-4)</strong></p>
      <div class="player-count-row">${countButtons}</div>
      <h3>Player Names</h3>
      ${nameInputs}
      <div class="actions">
        <button class="btn-primary" id="start-btn">Start Game &#127876;</button>
      </div>
    `);

    document.querySelectorAll('.count-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.numPlayers = parseInt(btn.dataset.count, 10);
        renderSetup();
      });
    });

    document.querySelectorAll('.player-name-input').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.dataset.playerIndex, 10);
        state.names[idx] = input.value;
      });
    });

    document.getElementById('start-btn').addEventListener('click', startGame);
  }

  function startGame() {
    const players = [];
    for (let i = 0; i < state.numPlayers; i++) {
      const name = (state.names[i] || '').trim() || `Player ${i + 1}`;
      players.push({ name, score: 0 });
    }

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
