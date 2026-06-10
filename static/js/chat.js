// What App, Dog? - Chat frontend
// Shared no-password login, global room + 1:1 DMs, suggested topics.

(function () {
  const POLL_USERS_MS = 5000;
  const POLL_CONV_MS = 3000;
  const HEARTBEAT_MS = 15000;
  const STORAGE_KEY = 'chatUsername';
  const MAX_GAME_QUESTIONS = 5;

  const app = document.getElementById('app');
  const ORIGINAL_TITLE = document.title;

  let state = {
    phase: 'login',
    username: null,
    users: [],
    activeConv: 'global',
    messages: {},
    topics: {},
    messageCounts: {},
    unread: {},
    games: {},
  };

  let usersPollTimer = null;
  let convPollTimer = null;
  let heartbeatTimer = null;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function formatTime(ts) {
    if (!ts) return '';
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function dmConversationId(a, b) {
    const pair = [a.toLowerCase(), b.toLowerCase()].sort();
    return `dm:${pair[0]}|${pair[1]}`;
  }

  // ---------------- API HELPERS ----------------

  async function apiPost(path, body, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        return await res.json();
      } catch (e) {
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    return { error: 'Could not reach the server. Please try again.' };
  }

  async function apiGet(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async function apiDelete(path) {
    try {
      const res = await fetch(path, { method: 'DELETE' });
      return await res.json();
    } catch (e) {
      return { error: 'Could not reach the server. Please try again.' };
    }
  }

  // ---------------- LOGIN SCREEN ----------------

  function renderLogin() {
    app.innerHTML = `
      <h2>Welcome!</h2>
      <p class="status-line">Pick your name or create a new one to join the chat.</p>
      <div id="user-list" class="player-count-row" style="flex-wrap: wrap;"></div>
      <input id="username-input" class="text-input" placeholder="Enter a username" maxlength="20" autocomplete="off">
      <p id="login-status" class="status-line"></p>
      <div class="actions">
        <button class="btn-primary" id="login-btn">Join Chat</button>
      </div>
    `;

    const input = document.getElementById('username-input');
    const btn = document.getElementById('login-btn');

    btn.addEventListener('click', () => handleLogin());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });

    refreshLoginUsers();
    if (usersPollTimer) clearInterval(usersPollTimer);
    usersPollTimer = setInterval(refreshLoginUsers, POLL_USERS_MS);
  }

  async function refreshLoginUsers() {
    const users = await apiGet('/api/users');
    if (!users) return;
    state.users = users;
    const container = document.getElementById('user-list');
    if (!container) return;

    if (users.length === 0) {
      container.innerHTML = '<p class="empty-state">No one has joined yet. Be the first!</p>';
      return;
    }

    container.innerHTML = users
      .map(
        (u) => `
        <button class="profile-btn" data-username="${escapeHtml(u.username)}">
          <span class="online-dot ${u.online ? 'online' : ''}"></span>
          ${escapeHtml(u.username)}
        </button>
      `
      )
      .join('');

    container.querySelectorAll('.profile-btn').forEach((b) => {
      b.addEventListener('click', () => handleLogin(b.dataset.username));
    });
  }

  async function handleLogin(usernameOverride) {
    const input = document.getElementById('username-input');
    const username = (usernameOverride !== undefined ? usernameOverride : input.value).trim();
    const status = document.getElementById('login-status');
    const btn = document.getElementById('login-btn');

    if (!username) {
      status.textContent = 'Please enter a username.';
      return;
    }

    status.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Joining...';

    const result = await apiPost('/api/login', { username });

    if (result.error) {
      status.textContent = result.error;
      btn.disabled = false;
      btn.textContent = 'Join Chat';
      return;
    }

    localStorage.setItem(STORAGE_KEY, result.username);
    state.username = result.username;
    enterChat();
  }

  // ---------------- CHAT SCREEN ----------------

  function enterChat() {
    state.phase = 'chat';
    state.activeConv = 'global';
    state.messages = {};
    state.topics = {};
    state.messageCounts = {};
    state.unread = {};
    state.games = {};

    if (usersPollTimer) clearInterval(usersPollTimer);

    app.innerHTML = `
      <div class="chat-layout">
        <aside class="chat-sidebar">
          <div class="chat-user-info">
            Logged in as <strong>${escapeHtml(state.username)}</strong>
            <span class="online-dot online"></span>
          </div>
          <button class="btn-secondary" id="logout-btn">Log Out</button>
          <div id="conversation-list"></div>
        </aside>
        <section class="chat-main">
          <h2 id="conv-title">Global Room</h2>
          <div class="topics-panel">
            <h3>Suggested Topics</h3>
            <div id="topics-list"></div>
            <div class="topic-input-row">
              <input id="topic-input" class="text-input" placeholder="Suggest a topic..." maxlength="200" autocomplete="off">
              <button class="btn-secondary" id="topic-submit">Suggest</button>
            </div>
          </div>
          <div id="game-panel"></div>
          <div id="message-list" class="message-list"></div>
          <div class="message-input-row">
            <input id="message-input" class="text-input" placeholder="Type a message..." maxlength="1000" autocomplete="off">
            <button class="btn-primary" id="message-submit">Send</button>
          </div>
        </section>
      </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    const messageInput = document.getElementById('message-input');
    document.getElementById('message-submit').addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    const topicInput = document.getElementById('topic-input');
    document.getElementById('topic-submit').addEventListener('click', sendTopic);
    topicInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendTopic();
    });

    refreshUsers().then(() => renderConversationList());
    fetchMessages(state.activeConv);
    fetchTopics(state.activeConv);
    renderGamePanel();

    startHeartbeat();
    startConvPolling();
    startUsersPolling();
  }

  async function handleLogout() {
    stopAllTimers();
    if (state.username) {
      await apiPost('/api/logout', { username: state.username });
    }
    localStorage.removeItem(STORAGE_KEY);
    state = {
      phase: 'login',
      username: null,
      users: [],
      activeConv: 'global',
      messages: {},
      topics: {},
      messageCounts: {},
      unread: {},
      games: {},
    };
    updateTitle();
    renderLogin();
  }

  function stopAllTimers() {
    if (usersPollTimer) {
      clearInterval(usersPollTimer);
      usersPollTimer = null;
    }
    if (convPollTimer) {
      clearInterval(convPollTimer);
      convPollTimer = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function startHeartbeat() {
    if (heartbeatTimer) return;
    heartbeatTimer = setInterval(() => {
      apiPost('/api/heartbeat', { username: state.username });
    }, HEARTBEAT_MS);
  }

  function startUsersPolling() {
    if (usersPollTimer) clearInterval(usersPollTimer);
    usersPollTimer = setInterval(() => {
      refreshUsers().then(() => renderConversationList());
    }, POLL_USERS_MS);
  }

  function startConvPolling() {
    if (convPollTimer) clearInterval(convPollTimer);
    convPollTimer = setInterval(() => {
      fetchTopics(state.activeConv);
      getAllConversationIds().forEach((convId) => fetchMessages(convId));
      if (state.activeConv.startsWith('dm:')) fetchGame(state.activeConv);
    }, POLL_CONV_MS);
  }

  async function refreshUsers() {
    const users = await apiGet('/api/users');
    if (users) state.users = users;
  }

  function getAllConversationIds() {
    const ids = ['global'];
    state.users.forEach((u) => {
      if (u.username.toLowerCase() !== state.username.toLowerCase()) {
        ids.push(dmConversationId(state.username, u.username));
      }
    });
    return ids;
  }

  function updateTitle() {
    const total = Object.values(state.unread).reduce((sum, n) => sum + n, 0);
    document.title = total > 0 ? `(${total > 99 ? '99+' : total}) ${ORIGINAL_TITLE}` : ORIGINAL_TITLE;
  }

  // ---------------- CONVERSATION LIST ----------------

  function renderConversationList() {
    const container = document.getElementById('conversation-list');
    if (!container) return;

    const others = state.users.filter(
      (u) => u.username.toLowerCase() !== state.username.toLowerCase()
    );

    const globalUnread = state.unread['global'] || 0;
    let html = `
      <button class="conversation-item ${state.activeConv === 'global' ? 'active' : ''}" data-conv="global" data-label="Global Room">
        <span class="online-dot online"></span> Global Room
        ${globalUnread > 0 ? `<span class="unread-badge">${globalUnread > 9 ? '9+' : globalUnread}</span>` : ''}
      </button>
    `;

    others.forEach((u) => {
      const convId = dmConversationId(state.username, u.username);
      const unread = state.unread[convId] || 0;
      html += `
        <button class="conversation-item ${state.activeConv === convId ? 'active' : ''}" data-conv="${escapeHtml(convId)}" data-label="${escapeHtml(u.username)}">
          <span class="online-dot ${u.online ? 'online' : ''}"></span> ${escapeHtml(u.username)}
          ${unread > 0 ? `<span class="unread-badge">${unread > 9 ? '9+' : unread}</span>` : ''}
        </button>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.conversation-item').forEach((btn) => {
      btn.addEventListener('click', () => switchConversation(btn.dataset.conv, btn.dataset.label));
    });
  }

  function switchConversation(convId, label) {
    if (convId === state.activeConv) return;
    state.activeConv = convId;
    state.unread[convId] = 0;
    updateTitle();

    document.getElementById('conv-title').textContent = convId === 'global' ? 'Global Room' : `DM with ${label}`;
    document.getElementById('message-input').value = '';
    document.getElementById('topic-input').value = '';

    renderConversationList();
    renderMessages();
    renderTopics();
    renderGamePanel();
    fetchMessages(convId);
    fetchTopics(convId);
    if (convId.startsWith('dm:')) fetchGame(convId);
  }

  // ---------------- MESSAGES ----------------

  async function fetchMessages(convId) {
    const data = await apiGet(`/api/conversations/${encodeURIComponent(convId)}/messages?username=${encodeURIComponent(state.username)}`);
    if (!data) return;

    const prevCount = state.messageCounts[convId];
    state.messages[convId] = data;
    state.messageCounts[convId] = data.length;

    if (convId === state.activeConv) {
      renderMessages();
    } else if (prevCount !== undefined && data.length > prevCount) {
      state.unread[convId] = (state.unread[convId] || 0) + (data.length - prevCount);
      renderConversationList();
      updateTitle();
    }
  }

  function renderMessages() {
    const container = document.getElementById('message-list');
    if (!container) return;

    const msgs = state.messages[state.activeConv] || [];
    if (msgs.length === 0) {
      container.innerHTML = '<p class="empty-state">No messages yet. Say hello!</p>';
      return;
    }

    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;

    container.innerHTML = msgs
      .map((m) => {
        const mine = m.from.toLowerCase() === state.username.toLowerCase();
        return `
          <div class="message ${mine ? 'mine' : ''}">
            <span class="message-author">${escapeHtml(m.from)}</span>
            ${escapeHtml(m.text)}
            <span class="message-time">${formatTime(m.ts)}</span>
          </div>
        `;
      })
      .join('');

    if (nearBottom) container.scrollTop = container.scrollHeight;
  }

  async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text) return;

    input.disabled = true;
    const result = await apiPost(`/api/conversations/${encodeURIComponent(state.activeConv)}/messages`, {
      username: state.username,
      text,
    });
    input.disabled = false;

    if (result.error) return;

    input.value = '';
    input.focus();
    await fetchMessages(state.activeConv);
  }

  // ---------------- TOPICS ----------------

  async function fetchTopics(convId) {
    const data = await apiGet(`/api/conversations/${encodeURIComponent(convId)}/topics?username=${encodeURIComponent(state.username)}`);
    if (!data) return;
    state.topics[convId] = data;
    if (convId === state.activeConv) renderTopics();
  }

  function renderTopics() {
    const container = document.getElementById('topics-list');
    if (!container) return;

    const topics = state.topics[state.activeConv] || [];
    if (topics.length === 0) {
      container.innerHTML = '<p class="empty-state">No topics suggested yet.</p>';
      return;
    }

    container.innerHTML = topics
      .map((t) => {
        const mine = t.suggested_by.toLowerCase() === state.username.toLowerCase();
        return `
          <div class="topic-item">
            <div>
              <span class="topic-text">${escapeHtml(t.text)}</span>
              <span class="topic-by">suggested by ${escapeHtml(t.suggested_by)}</span>
            </div>
            ${mine ? `<button class="topic-remove" data-id="${t.id}" title="Remove">&times;</button>` : ''}
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('.topic-remove').forEach((btn) => {
      btn.addEventListener('click', () => removeTopic(parseInt(btn.dataset.id, 10)));
    });
  }

  async function sendTopic() {
    const input = document.getElementById('topic-input');
    const text = input.value.trim();
    if (!text) return;

    input.disabled = true;
    const result = await apiPost(`/api/conversations/${encodeURIComponent(state.activeConv)}/topics`, {
      username: state.username,
      text,
    });
    input.disabled = false;

    if (result.error) return;

    input.value = '';
    input.focus();
    await fetchTopics(state.activeConv);
  }

  async function removeTopic(topicId) {
    await apiDelete(
      `/api/conversations/${encodeURIComponent(state.activeConv)}/topics/${topicId}?username=${encodeURIComponent(state.username)}`
    );
    await fetchTopics(state.activeConv);
  }

  // ---------------- DM MINI-GAME: GUESS A COUNTRY ----------------

  async function fetchGame(convId) {
    const data = await apiGet(`/api/conversations/${encodeURIComponent(convId)}/game?username=${encodeURIComponent(state.username)}`);
    if (!data) return;
    state.games[convId] = data;
    if (convId === state.activeConv) renderGamePanel();
  }

  function renderGamePanel() {
    const container = document.getElementById('game-panel');
    if (!container) return;

    if (!state.activeConv.startsWith('dm:')) {
      container.innerHTML = '';
      return;
    }

    const game = state.games[state.activeConv] || { status: 'none' };
    const isHost = game.host && game.host.toLowerCase() === state.username.toLowerCase();

    if (game.status === 'none') {
      container.innerHTML = `
        <div class="game-card">
          <button class="btn-secondary" id="game-invite-btn">&#127918; Play "Guess a Country"</button>
        </div>
      `;
      document.getElementById('game-invite-btn').addEventListener('click', inviteGame);
      return;
    }

    if (game.status === 'invited') {
      if (isHost) {
        container.innerHTML = `
          <div class="game-card">
            <p>Waiting for ${escapeHtml(game.guest)} to respond to your "Guess a Country" invite...</p>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="game-card">
            <p>${escapeHtml(game.host)} invited you to play <strong>Guess a Country</strong>! You can ask up to ${MAX_GAME_QUESTIONS} yes/no questions before guessing.</p>
            <div class="actions">
              <button class="btn-primary" id="game-accept-btn">Accept</button>
              <button class="btn-secondary" id="game-decline-btn">Decline</button>
            </div>
          </div>
        `;
        document.getElementById('game-accept-btn').addEventListener('click', () => respondGame(true));
        document.getElementById('game-decline-btn').addEventListener('click', () => respondGame(false));
      }
      return;
    }

    if (game.status === 'declined') {
      if (isHost) {
        container.innerHTML = `
          <div class="game-card">
            <p>${escapeHtml(game.declined_by)} declined your "Guess a Country" invite.</p>
            <div class="actions">
              <button class="btn-secondary" id="game-dismiss-btn">Dismiss</button>
            </div>
          </div>
        `;
        document.getElementById('game-dismiss-btn').addEventListener('click', dismissGame);
      } else {
        container.innerHTML = '';
      }
      return;
    }

    if (game.status === 'active') {
      renderActiveGame(container, game);
      return;
    }

    if (game.status === 'finished') {
      renderFinishedGame(container, game);
    }
  }

  function renderActiveGame(container, game) {
    const askedHtml = game.questions_asked.length
      ? game.questions_asked
          .map(
            (q) => `
            <div class="game-qa">
              <span>${escapeHtml(q.text)}</span>
              <span class="${q.answer ? 'answer-yes' : 'answer-no'}">${q.answer ? 'Yes' : 'No'}</span>
            </div>
          `
          )
          .join('')
      : '<p class="empty-state">No questions asked yet.</p>';

    const availableHtml = game.available_questions
      .map((q) => `<button class="btn-question" data-id="${q.id}">${escapeHtml(q.text)}</button>`)
      .join('');

    const questionsLeft = game.max_questions - game.questions_asked.length;

    let guessSection;
    if (game.my_guess) {
      guessSection = `<p class="status-line">Your guess: <strong>${escapeHtml(game.my_guess.text)}</strong>${game.partner_has_guessed ? '' : ' &mdash; waiting for your partner to guess...'}</p>`;
    } else {
      guessSection = `
        <div class="topic-input-row">
          <input id="game-guess-input" class="text-input" placeholder="Your guess..." maxlength="100" autocomplete="off">
          <button class="btn-primary" id="game-guess-btn">Guess</button>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="game-card">
        <h3>Guess a Country &mdash; ${questionsLeft} question${questionsLeft === 1 ? '' : 's'} left</h3>
        <div class="game-qa-log">${askedHtml}</div>
        ${availableHtml ? `<div class="game-question-bank">${availableHtml}</div>` : ''}
        ${guessSection}
      </div>
    `;

    container.querySelectorAll('.btn-question').forEach((btn) => {
      btn.addEventListener('click', () => askGameQuestion(parseInt(btn.dataset.id, 10)));
    });

    const guessBtn = document.getElementById('game-guess-btn');
    if (guessBtn) {
      guessBtn.addEventListener('click', submitGameGuess);
      document.getElementById('game-guess-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitGameGuess();
      });
    }
  }

  function renderFinishedGame(container, game) {
    let resultText;
    if (game.winner) {
      const youWon = game.winner.toLowerCase() === state.username.toLowerCase();
      resultText = youWon ? '&#127881; You guessed it!' : `&#127881; ${escapeHtml(game.winner)} guessed it!`;
    } else {
      resultText = 'Nobody guessed it this time!';
    }

    const guessesHtml = Object.values(game.guesses)
      .map((g) => `<li class="${g.correct ? 'correct' : 'incorrect'}">${escapeHtml(g.username)}: ${escapeHtml(g.text)}</li>`)
      .join('');

    container.innerHTML = `
      <div class="game-card">
        <h3>Guess a Country &mdash; Results</h3>
        <p>The country was <strong>${escapeHtml(game.secret_country)}</strong>.</p>
        <p>${resultText}</p>
        <ul class="game-results-list">${guessesHtml}</ul>
        <div class="actions">
          <button class="btn-primary" id="game-play-again-btn">Play Again</button>
        </div>
      </div>
    `;

    document.getElementById('game-play-again-btn').addEventListener('click', async () => {
      await dismissGame();
      await inviteGame();
    });
  }

  async function inviteGame() {
    await apiPost(`/api/conversations/${encodeURIComponent(state.activeConv)}/game/invite`, { username: state.username });
    await fetchGame(state.activeConv);
  }

  async function respondGame(accept) {
    await apiPost(`/api/conversations/${encodeURIComponent(state.activeConv)}/game/respond`, { username: state.username, accept });
    await fetchGame(state.activeConv);
  }

  async function dismissGame() {
    await apiPost(`/api/conversations/${encodeURIComponent(state.activeConv)}/game/reset`, { username: state.username });
    await fetchGame(state.activeConv);
  }

  async function askGameQuestion(questionId) {
    await apiPost(`/api/conversations/${encodeURIComponent(state.activeConv)}/game/question`, {
      username: state.username,
      question_id: questionId,
    });
    await fetchGame(state.activeConv);
  }

  async function submitGameGuess() {
    const input = document.getElementById('game-guess-input');
    const text = input.value.trim();
    if (!text) return;

    input.disabled = true;
    await apiPost(`/api/conversations/${encodeURIComponent(state.activeConv)}/game/guess`, {
      username: state.username,
      guess: text,
    });
    input.disabled = false;
    await fetchGame(state.activeConv);
  }

  // ---------------- LOGOUT ON UNLOAD ----------------

  window.addEventListener('beforeunload', () => {
    if (state.username && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ username: state.username })], { type: 'application/json' });
      navigator.sendBeacon('/api/logout', blob);
    }
  });

  // ---------------- INIT ----------------

  async function init() {
    const savedUsername = localStorage.getItem(STORAGE_KEY);
    if (savedUsername) {
      const result = await apiPost('/api/login', { username: savedUsername });
      if (!result.error) {
        state.username = result.username;
        enterChat();
        return;
      }
      localStorage.removeItem(STORAGE_KEY);
    }

    renderLogin();
  }

  init();
})();
