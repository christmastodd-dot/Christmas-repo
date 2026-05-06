// SEWER QUEST '86 — a Pipe Dream-style retro puzzler
// Connect the cesspool to the treatment plant before sewage runs to the ocean.
(() => {
  'use strict';

  const COLS = 7;
  const ROWS = 9;
  const QUEUE_LEN = 5;

  // pipe -> set of edge openings
  const CONNECT = {
    h:  ['W', 'E'],
    v:  ['N', 'S'],
    ne: ['N', 'E'],
    nw: ['N', 'W'],
    se: ['S', 'E'],
    sw: ['S', 'W'],
    src: ['E'],
    snk: ['W'],
    rock: [],
  };
  const RANDOM_TYPES = ['h', 'v', 'ne', 'nw', 'se', 'sw'];
  const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
  const DXY = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

  // ---------- DOM ----------
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const timerEl = document.getElementById('timer');
  const queueEl = document.getElementById('queue');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const overlayBtn = document.getElementById('overlay-btn');
  const dumpBtn = document.getElementById('rotate-btn');

  // ---------- State ----------
  let grid;            // [y][x] = cell or null
  let queue;           // upcoming piece types
  let cellSize;        // px
  let score = 0;
  let level = 1;
  let preFlowMs;       // countdown before flow begins
  let flowMsPerPipe;   // how long water takes to fill one pipe
  let phase;           // 'idle' | 'placing' | 'flowing' | 'won' | 'lost'
  let flow;            // current water front: { x, y, entry, t }
  let lastT = 0;
  let pipesFilled = 0;
  let srcPos, snkPos;

  // ---------- Helpers ----------
  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function inBounds(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS; }

  function makeCell(type) {
    return { type, fill: 0, entry: null, exit: null };
  }

  function newGrid() {
    const g = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    // pick source and sink rows; keep them on opposite columns
    const sy = 1 + Math.floor(Math.random() * (ROWS - 2));
    let ty;
    do { ty = 1 + Math.floor(Math.random() * (ROWS - 2)); } while (Math.abs(ty - sy) < 2);
    g[sy][0] = makeCell('src');
    g[ty][COLS - 1] = makeCell('snk');
    srcPos = { x: 0, y: sy };
    snkPos = { x: COLS - 1, y: ty };
    // sprinkle rocks (more on higher levels)
    const rocks = Math.min(8, 2 + level);
    let placed = 0, tries = 0;
    while (placed < rocks && tries < 200) {
      tries++;
      const x = Math.floor(Math.random() * COLS);
      const y = Math.floor(Math.random() * ROWS);
      if (g[y][x]) continue;
      // don't trap source or sink
      if ((x === 0 && y === sy) || (x === COLS - 1 && y === ty)) continue;
      g[y][x] = makeCell('rock');
      placed++;
    }
    return g;
  }

  function refillQueue() {
    while (queue.length < QUEUE_LEN) queue.push(rand(RANDOM_TYPES));
  }

  // ---------- Sizing ----------
  function resize() {
    const stage = document.getElementById('stage');
    const r = stage.getBoundingClientRect();
    const maxW = r.width - 12;
    const maxH = r.height - 12;
    const sz = Math.floor(Math.min(maxW / COLS, maxH / ROWS));
    cellSize = Math.max(28, sz);
    canvas.width = cellSize * COLS;
    canvas.height = cellSize * ROWS;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    draw();
  }

  // ---------- Drawing ----------
  function draw() {
    ctx.fillStyle = '#050010';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // grid lines
    ctx.strokeStyle = '#180a3a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize + 0.5, 0);
      ctx.lineTo(i * cellSize + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j <= ROWS; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * cellSize + 0.5);
      ctx.lineTo(canvas.width, j * cellSize + 0.5);
      ctx.stroke();
    }

    // ocean band on right edge if sink is right (decorative)
    // skip — keeps focus on grid

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        drawCell(x, y, grid[y][x]);
      }
    }
  }

  function drawCell(cx, cy, cell) {
    const x = cx * cellSize;
    const y = cy * cellSize;
    if (!cell) return;

    if (cell.type === 'rock') {
      ctx.fillStyle = '#3a2a14';
      ctx.fillRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
      ctx.strokeStyle = '#7a5a30';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
      return;
    }

    if (cell.type === 'src') {
      drawEndpoint(x, y, '#3dff9a', 'C', 'E');
      return;
    }
    if (cell.type === 'snk') {
      drawEndpoint(x, y, '#2ff5ff', 'T', 'W');
      return;
    }

    // pipe
    drawPipe(x, y, cell);
  }

  function drawEndpoint(x, y, color, label, openDir) {
    const m = cellSize * 0.18;
    ctx.fillStyle = '#0a0228';
    ctx.fillRect(x + m, y + m, cellSize - 2 * m, cellSize - 2 * m);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.strokeRect(x + m, y + m, cellSize - 2 * m, cellSize - 2 * m);
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.floor(cellSize * 0.45)}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + cellSize / 2, y + cellSize / 2 + 1);

    // stub showing opening direction
    const pipeW = Math.max(6, Math.floor(cellSize * 0.34));
    const half = pipeW / 2;
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    ctx.fillStyle = color;
    if (openDir === 'E') ctx.fillRect(x + cellSize - m, cy - half, m, pipeW);
    if (openDir === 'W') ctx.fillRect(x, cy - half, m, pipeW);
    if (openDir === 'N') ctx.fillRect(cx - half, y, pipeW, m);
    if (openDir === 'S') ctx.fillRect(cx - half, y + cellSize - m, pipeW, m);
  }

  // Returns the rectangle for a pipe arm from a given side.
  function armRect(x, y, dir) {
    const pipeW = Math.max(6, Math.floor(cellSize * 0.34));
    const half = pipeW / 2;
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    const halfCell = cellSize / 2;
    if (dir === 'E') return { x: cx, y: cy - half, w: halfCell, h: pipeW };
    if (dir === 'W') return { x: x, y: cy - half, w: halfCell, h: pipeW };
    if (dir === 'N') return { x: cx - half, y: y, w: pipeW, h: halfCell };
    if (dir === 'S') return { x: cx - half, y: cy, w: pipeW, h: halfCell };
  }

  function drawPipe(x, y, cell) {
    const openings = CONNECT[cell.type] || [];
    const empty = '#1a0a3a';
    const wall = '#5b2bb0';
    const sewage = '#a86a2a';
    const sewageGlow = '#ffd47a';

    // pipe walls/empty
    ctx.fillStyle = empty;
    for (const d of openings) {
      const r = armRect(x, y, d);
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    // wall outline
    ctx.strokeStyle = wall;
    ctx.lineWidth = 1.5;
    for (const d of openings) {
      const r = armRect(x, y, d);
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }

    // fill
    if (cell.fill > 0 && cell.entry) {
      const entry = cell.entry;
      const others = openings.filter(d => d !== entry);
      const exitDir = others[0] || entry;
      // first half: entry arm fills 0..0.5 ; second half: exit arm fills 0.5..1
      ctx.fillStyle = sewage;
      ctx.shadowColor = sewageGlow;
      ctx.shadowBlur = 6;
      const inT = Math.min(1, cell.fill / 0.5);
      drawArmFill(x, y, entry, inT, true);
      if (cell.fill > 0.5) {
        const outT = Math.min(1, (cell.fill - 0.5) / 0.5);
        drawArmFill(x, y, exitDir, outT, false);
      }
      ctx.shadowBlur = 0;
    }
  }

  // Fill an arm rectangle proportionally. If "inward" true, fill from edge toward center.
  function drawArmFill(x, y, dir, t, inward) {
    const r = armRect(x, y, dir);
    let fx = r.x, fy = r.y, fw = r.w, fh = r.h;
    if (dir === 'E') {
      fw = r.w * t;
      if (!inward) fx = r.x; // grows from center outward (center is r.x)
      else fx = r.x + r.w - fw; // grows from edge to center
    } else if (dir === 'W') {
      fw = r.w * t;
      if (!inward) fx = r.x + r.w - fw; // from center outward toward left edge
      else fx = r.x; // edge inward
    } else if (dir === 'S') {
      fh = r.h * t;
      if (!inward) fy = r.y;
      else fy = r.y + r.h - fh;
    } else if (dir === 'N') {
      fh = r.h * t;
      if (!inward) fy = r.y + r.h - fh;
      else fy = r.y;
    }
    ctx.fillRect(fx, fy, fw, fh);
  }

  // ---------- Queue UI ----------
  function renderQueue() {
    queueEl.innerHTML = '';
    queue.forEach((type, i) => {
      const el = document.createElement('canvas');
      el.className = 'q-tile' + (i === 0 ? ' head' : '');
      el.width = 44; el.height = 44;
      const qctx = el.getContext('2d');
      drawTilePreview(qctx, 44, type);
      queueEl.appendChild(el);
    });
  }

  function drawTilePreview(c, size, type) {
    c.fillStyle = '#0a0228';
    c.fillRect(0, 0, size, size);
    const openings = CONNECT[type] || [];
    const pipeW = Math.max(6, Math.floor(size * 0.34));
    const half = pipeW / 2;
    const cx = size / 2, cy = size / 2;
    c.fillStyle = '#1a0a3a';
    c.strokeStyle = '#7a3df0';
    c.lineWidth = 1.5;
    for (const d of openings) {
      let r;
      if (d === 'E') r = { x: cx, y: cy - half, w: size / 2, h: pipeW };
      if (d === 'W') r = { x: 0, y: cy - half, w: size / 2, h: pipeW };
      if (d === 'N') r = { x: cx - half, y: 0, w: pipeW, h: size / 2 };
      if (d === 'S') r = { x: cx - half, y: cy, w: pipeW, h: size / 2 };
      c.fillRect(r.x, r.y, r.w, r.h);
      c.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }
  }

  // ---------- Input ----------
  function cellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    const px = t.clientX - rect.left;
    const py = t.clientY - rect.top;
    const x = Math.floor(px / cellSize);
    const y = Math.floor(py / cellSize);
    return inBounds(x, y) ? { x, y } : null;
  }

  function placeAt(x, y) {
    if (phase !== 'placing' && phase !== 'flowing') return;
    const cur = grid[y][x];
    if (cur) {
      // can't overwrite source, sink, rocks, or already-filled pipes
      if (cur.type === 'src' || cur.type === 'snk' || cur.type === 'rock') return;
      if (cur.fill > 0) return;
      score = Math.max(0, score - 5);
    }
    const type = queue.shift();
    refillQueue();
    grid[y][x] = makeCell(type);
    renderQueue();
    updateHud();
    draw();
  }

  canvas.addEventListener('click', (e) => {
    const c = cellFromEvent(e);
    if (c) placeAt(c.x, c.y);
  });

  dumpBtn.addEventListener('click', () => {
    if (phase !== 'placing' && phase !== 'flowing') return;
    queue.shift();
    refillQueue();
    score = Math.max(0, score - 2);
    renderQueue();
    updateHud();
  });

  overlayBtn.addEventListener('click', () => {
    if (phase === 'won') { level++; }
    else if (phase === 'lost') { level = 1; score = 0; }
    startLevel();
  });

  // ---------- Game flow ----------
  function startLevel() {
    grid = newGrid();
    queue = [];
    refillQueue();
    pipesFilled = 0;
    flow = null;
    flowMsPerPipe = Math.max(550, 1200 - (level - 1) * 80);
    preFlowMs = Math.max(4000, 9000 - (level - 1) * 600);
    phase = 'placing';
    overlay.classList.add('hidden');
    renderQueue();
    updateHud();
    resize();
    lastT = performance.now();
    requestAnimationFrame(tick);
  }

  function updateHud() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    if (phase === 'placing') {
      timerEl.textContent = Math.ceil(preFlowMs / 1000) + 's';
    } else if (phase === 'flowing') {
      timerEl.textContent = 'GO!';
    } else {
      timerEl.textContent = '--';
    }
  }

  function tick(t) {
    const dt = Math.min(64, t - lastT);
    lastT = t;

    if (phase === 'placing') {
      preFlowMs -= dt;
      updateHud();
      if (preFlowMs <= 0) beginFlow();
    } else if (phase === 'flowing') {
      stepFlow(dt);
    }

    draw();
    if (phase === 'placing' || phase === 'flowing') {
      requestAnimationFrame(tick);
    }
  }

  function beginFlow() {
    phase = 'flowing';
    // start by filling the source itself
    const src = grid[srcPos.y][srcPos.x];
    src.fill = 1;
    src.entry = 'W'; // visual only
    flow = { x: srcPos.x, y: srcPos.y, entry: 'W', t: 1 };
    advanceFlow();
    updateHud();
  }

  function advanceFlow() {
    // From current cell, find exit direction and step into neighbor.
    const { x, y, entry } = flow;
    const cell = grid[y][x];
    const openings = CONNECT[cell.type];
    const exits = openings.filter(d => d !== entry);
    const exitDir = cell.type === 'src' ? 'E' : exits[0];
    if (!exitDir) return gameLost();

    const [dx, dy] = DXY[exitDir];
    const nx = x + dx, ny = y + dy;
    if (!inBounds(nx, ny)) return gameLost();
    const next = grid[ny][nx];
    if (!next || next.type === 'rock') return gameLost();
    const nextOpenings = CONNECT[next.type];
    const enterDir = OPP[exitDir];
    if (!nextOpenings.includes(enterDir)) return gameLost();

    next.entry = enterDir;
    next.fill = 0;
    flow = { x: nx, y: ny, entry: enterDir, t: 0 };

    if (next.type === 'snk') {
      // fill the sink quickly then win
    }
  }

  function stepFlow(dt) {
    if (!flow) return;
    const cell = grid[flow.y][flow.x];
    flow.t += dt / flowMsPerPipe;
    if (flow.t >= 1) flow.t = 1;
    cell.fill = flow.t;
    if (flow.t >= 1) {
      pipesFilled++;
      score += 10;
      updateHud();
      if (cell.type === 'snk') return gameWon();
      advanceFlow();
    }
  }

  function gameWon() {
    phase = 'won';
    score += 100 + pipesFilled * 5;
    updateHud();
    overlayTitle.textContent = 'CLEAN BEACH!';
    overlayText.innerHTML =
      `Sewage routed to the plant.<br>` +
      `<span class="snk">${pipesFilled}</span> pipes filled. ` +
      `Bonus +${100 + pipesFilled * 5}.`;
    overlayBtn.textContent = 'NEXT LEVEL';
    overlay.classList.remove('hidden');
  }

  function gameLost() {
    phase = 'lost';
    updateHud();
    overlayTitle.textContent = 'OCEAN POLLUTED!';
    overlayText.innerHTML =
      `Sewage ran off into the bay.<br>` +
      `Final score: <span class="src">${score}</span>.`;
    overlayBtn.textContent = 'TRY AGAIN';
    overlay.classList.remove('hidden');
  }

  // ---------- Boot ----------
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  // initial overlay
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  queue = [];
  phase = 'idle';
  resize();
  overlayBtn.textContent = 'START';
})();
