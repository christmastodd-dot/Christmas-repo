// SEWER QUEST '86 — tap-rotate edition
// Every tile has a pipe in some random rotation. Tap to rotate 90°.
// Connect the cesspool to the treatment plant to win.
(() => {
  'use strict';

  const COLS = 6;
  const ROWS = 9;

  const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
  const DXY = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  const ROT_CW = { N: 'E', E: 'S', S: 'W', W: 'N' };
  const DIRS = ['N', 'E', 'S', 'W'];

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const movesEl = document.getElementById('moves');
  const levelEl = document.getElementById('level');
  const parEl = document.getElementById('par');
  const statusEl = document.getElementById('status');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const overlayBtn = document.getElementById('overlay-btn');
  const shuffleBtn = document.getElementById('shuffle-btn');

  let grid;
  let cellSize;
  let moves = 0;
  let level = 1;
  let par = 0;
  let phase = 'idle';
  let srcPos, snkPos;
  let flowAnim = null;

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function inBounds(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS; }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function rotateOpenings(set) {
    const out = new Set();
    set.forEach(d => out.add(ROT_CW[d]));
    return out;
  }

  function dirBetween(from, to) {
    if (to[0] > from[0]) return 'E';
    if (to[0] < from[0]) return 'W';
    if (to[1] > from[1]) return 'S';
    if (to[1] < from[1]) return 'N';
  }

  // ---------- Board generation ----------

  // Random walk from src to snk, avoiding revisits.
  // Biased toward the target, with occasional detours for twistiness.
  // Constraint: the path must enter the source from the east and the
  // sink from the west, since those endpoints have fixed openings.
  function generatePath(sx, sy, tx, ty) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const path = [[sx, sy]];
      const seen = new Set([sx + ',' + sy]);
      let cx = sx, cy = sy;
      let stuck = false;
      while (cx !== tx || cy !== ty) {
        const cands = [];
        for (const d of DIRS) {
          const [dx, dy] = DXY[d];
          const nx = cx + dx, ny = cy + dy;
          if (!inBounds(nx, ny)) continue;
          if (seen.has(nx + ',' + ny)) continue;
          // Never re-enter the source column.
          if (nx === sx && ny !== sy) continue;
          // Never enter the sink column except by landing exactly on the sink,
          // which forces the final step to come from due west.
          if (nx === tx && !(nx === tx && ny === ty)) continue;
          cands.push([d, nx, ny]);
        }
        if (cands.length === 0) { stuck = true; break; }
        const dist = Math.abs(tx - cx) + Math.abs(ty - cy);
        const closer = cands.filter(c =>
          Math.abs(tx - c[1]) + Math.abs(ty - c[2]) < dist
        );
        // bias: 65% closer, 35% any (creates kinks)
        const pick = (closer.length && Math.random() < 0.65)
          ? rand(closer) : rand(cands);
        cx = pick[1]; cy = pick[2];
        seen.add(cx + ',' + cy);
        path.push([cx, cy]);
        if (path.length > COLS * ROWS) { stuck = true; break; }
      }
      if (!stuck) return path;
    }
    // Fallback: east to tx-1, vertical to ty, then east into sink.
    // This shape always satisfies the source-east and sink-west constraints.
    const path = [];
    let cx = sx, cy = sy;
    path.push([cx, cy]);
    while (cx < tx - 1) { cx += 1; path.push([cx, cy]); }
    while (cy !== ty) { cy += Math.sign(ty - cy); path.push([cx, cy]); }
    path.push([tx, ty]);
    return path;
  }

  // BFS on a candidate board; returns true iff sink is reachable from src.
  function isSolved(g, sx, sy, tx, ty) {
    const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const q = [[sx, sy]];
    seen[sy][sx] = true;
    while (q.length) {
      const [x, y] = q.shift();
      const cell = g[y][x];
      for (const d of cell.openings) {
        const [dx, dy] = DXY[d];
        const nx = x + dx, ny = y + dy;
        if (!inBounds(nx, ny) || seen[ny][nx]) continue;
        const next = g[ny][nx];
        if (!next || !next.openings.has(OPP[d])) continue;
        if (nx === tx && ny === ty) return true;
        seen[ny][nx] = true;
        q.push([nx, ny]);
      }
    }
    return false;
  }

  function buildSolvedBoard() {
    for (let attempt = 0; attempt < 20; attempt++) {
      const g = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      const sy = 1 + Math.floor(Math.random() * (ROWS - 2));
      let ty;
      do { ty = 1 + Math.floor(Math.random() * (ROWS - 2)); } while (ty === sy);

      const path = generatePath(0, sy, COLS - 1, ty);

      g[sy][0] = { type: 'src', openings: new Set(['E']), connected: false, locked: true };
      g[ty][COLS - 1] = { type: 'snk', openings: new Set(['W']), connected: false, locked: true };

      for (let i = 1; i < path.length - 1; i++) {
        const cur = path[i];
        const dirToPrev = dirBetween(cur, path[i - 1]);
        const dirToNext = dirBetween(cur, path[i + 1]);
        g[cur[1]][cur[0]] = {
          type: 'pipe',
          openings: new Set([dirToPrev, dirToNext]),
          connected: false,
          locked: false,
        };
      }

      // Verify the unscrambled board actually solves before continuing.
      if (!isSolved(g, 0, sy, COLS - 1, ty)) continue;

      return { g, path, sy, ty };
    }
    // Should never happen with the fallback, but if it does, throw rather
    // than serve an unsolvable board.
    throw new Error('Failed to build a solvable board');
  }

  function newBoard() {
    const built = buildSolvedBoard();
    const g = built.g;
    const sy = built.sy, ty = built.ty;
    const path = built.path;

    // Decoy pipes in remaining cells (random openings).
    // Decoys never overwrite path cells, so they can't disconnect the solution.
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (g[y][x]) continue;
        if (Math.random() < 0.65) {
          const decoys = [
            ['N', 'S'], ['E', 'W'],
            ['N', 'E'], ['E', 'S'],
            ['S', 'W'], ['W', 'N'],
            ['N', 'E', 'S'], ['E', 'S', 'W'],
          ];
          const pick = rand(decoys);
          g[y][x] = {
            type: 'pipe',
            openings: new Set(pick),
            connected: false,
            locked: false,
          };
        }
      }
    }

    par = Math.max(6, Math.floor(path.length * 1.4));

    // Scramble rotations of every non-locked pipe.
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = g[y][x];
        if (!c || c.locked) continue;
        const turns = Math.floor(Math.random() * 4);
        for (let i = 0; i < turns; i++) c.openings = rotateOpenings(c.openings);
      }
    }

    grid = g;
    srcPos = { x: 0, y: sy };
    snkPos = { x: COLS - 1, y: ty };
  }

  // ---------- Connectivity (BFS from src) ----------
  function recomputeConnectivity() {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = grid[y][x];
        if (c) { c.connected = false; c.parent = null; }
      }
    }
    const q = [[srcPos.x, srcPos.y]];
    grid[srcPos.y][srcPos.x].connected = true;
    while (q.length) {
      const [x, y] = q.shift();
      const cell = grid[y][x];
      cell.openings.forEach(d => {
        const [dx, dy] = DXY[d];
        const nx = x + dx, ny = y + dy;
        if (!inBounds(nx, ny)) return;
        const next = grid[ny][nx];
        if (!next || next.connected) return;
        if (!next.openings.has(OPP[d])) return;
        next.connected = true;
        // direction water enters `next` is the opposite of d (d = parent->child)
        next.parent = { px: x, py: y, entryDir: OPP[d] };
        q.push([nx, ny]);
      });
    }
  }

  // Reconstruct the ordered chain from src to sink.
  // Each entry is { x, y, entry } where entry is the side water enters from.
  function findFlowPath() {
    const snk = grid[snkPos.y][snkPos.x];
    if (!snk.connected) return null;
    const chain = [];
    let cx = snkPos.x, cy = snkPos.y;
    while (cx !== srcPos.x || cy !== srcPos.y) {
      const cell = grid[cy][cx];
      chain.unshift({ x: cx, y: cy, entry: cell.parent.entryDir });
      const p = cell.parent;
      cx = p.px; cy = p.py;
    }
    chain.unshift({ x: srcPos.x, y: srcPos.y, entry: 'W' });
    return chain;
  }

  // ---------- Sizing ----------
  function resize() {
    const stage = document.getElementById('stage');
    const r = stage.getBoundingClientRect();
    const maxW = r.width - 12;
    const maxH = r.height - 12;
    const sz = Math.floor(Math.min(maxW / COLS, maxH / ROWS));
    cellSize = Math.max(36, sz);
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

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = grid[y][x];
        if (!cell) continue;
        if (cell.type === 'src') drawEndpoint(x, y, cell, '#3dff9a', 'C');
        else if (cell.type === 'snk') drawEndpoint(x, y, cell, '#2ff5ff', 'T');
        else drawPipe(x, y, cell);
      }
    }
  }

  function armRect(x, y, dir) {
    const pipeW = Math.max(8, Math.floor(cellSize * 0.36));
    const half = pipeW / 2;
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    const halfCell = cellSize / 2;
    if (dir === 'E') return { x: cx, y: cy - half, w: halfCell, h: pipeW };
    if (dir === 'W') return { x: x, y: cy - half, w: halfCell, h: pipeW };
    if (dir === 'N') return { x: cx - half, y: y, w: pipeW, h: halfCell };
    if (dir === 'S') return { x: cx - half, y: cy, w: pipeW, h: halfCell };
  }

  // Fill a fraction t of an arm. inward=true grows from outer edge to center,
  // inward=false grows from center to outer edge.
  function fillArm(x, y, dir, t, inward) {
    if (t <= 0) return;
    const r = armRect(x, y, dir);
    const inset = 3;
    let fx = r.x + inset, fy = r.y + inset;
    let fw = r.w - 2 * inset, fh = r.h - 2 * inset;
    if (dir === 'E') {
      const w = fw * t;
      if (inward) fx = r.x + r.w - inset - w; // grow from right edge inward
      fw = w;
    } else if (dir === 'W') {
      const w = fw * t;
      if (!inward) fx = r.x + r.w - inset - w; // grow from center toward left edge
      fw = w;
    } else if (dir === 'S') {
      const h = fh * t;
      if (inward) fy = r.y + r.h - inset - h;
      fh = h;
    } else if (dir === 'N') {
      const h = fh * t;
      if (!inward) fy = r.y + r.h - inset - h;
      fh = h;
    }
    ctx.fillRect(fx, fy, fw, fh);
  }

  function drawPipe(cx, cy, cell) {
    const x = cx * cellSize, y = cy * cellSize;
    const wallEmpty = '#1a0a3a';
    const wallEdge = '#5b2bb0';
    const sewage = '#c47a2a';
    const sewageGlow = '#ffd47a';

    // base arms
    ctx.fillStyle = wallEmpty;
    cell.openings.forEach(d => {
      const r = armRect(x, y, d);
      ctx.fillRect(r.x, r.y, r.w, r.h);
    });
    ctx.strokeStyle = wallEdge;
    ctx.lineWidth = 1.5;
    cell.openings.forEach(d => {
      const r = armRect(x, y, d);
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    });

    // hub
    const hub = Math.max(8, Math.floor(cellSize * 0.36));
    const hx = x + (cellSize - hub) / 2;
    const hy = y + (cellSize - hub) / 2;
    ctx.fillStyle = wallEmpty;
    ctx.fillRect(hx, hy, hub, hub);

    // Resolve fill amount: animFill overrides connected when set.
    const fill = (cell.animFill === undefined || cell.animFill === null)
      ? (cell.connected ? 1 : 0)
      : cell.animFill;
    if (fill <= 0) return;

    ctx.fillStyle = sewage;
    ctx.shadowColor = sewageGlow;
    ctx.shadowBlur = 8;

    if (fill >= 1) {
      cell.openings.forEach(d => {
        const r = armRect(x, y, d);
        const inset = 3;
        ctx.fillRect(r.x + inset, r.y + inset, r.w - 2 * inset, r.h - 2 * inset);
      });
      ctx.fillRect(hx + 2, hy + 2, hub - 4, hub - 4);
    } else {
      const entry = cell.animEntry;
      // First half: entry arm fills from edge to hub.
      const inT = Math.min(1, fill / 0.5);
      if (entry && cell.openings.has(entry)) {
        fillArm(x, y, entry, inT, true);
      }
      if (fill > 0.5) {
        const outT = Math.min(1, (fill - 0.5) / 0.5);
        // Hub fades in proportional to outT.
        ctx.fillRect(hx + 2, hy + 2, hub - 4, hub - 4);
        // All other arms fill from hub outward.
        cell.openings.forEach(d => {
          if (d === entry) return;
          fillArm(x, y, d, outT, false);
        });
      }
    }
    ctx.shadowBlur = 0;
  }

  function drawEndpoint(cx, cy, cell, color, label) {
    const x = cx * cellSize, y = cy * cellSize;
    const m = Math.floor(cellSize * 0.16);
    // During the win animation the sink is "connected" before water reaches it;
    // honor animFill so the box only lights up when the flow actually arrives.
    const lit = (cell.animFill === undefined || cell.animFill === null)
      ? cell.connected
      : cell.animFill >= 1;
    ctx.fillStyle = '#0a0228';
    ctx.fillRect(x + m, y + m, cellSize - 2 * m, cellSize - 2 * m);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = lit ? 12 : 6;
    ctx.strokeRect(x + m, y + m, cellSize - 2 * m, cellSize - 2 * m);
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.floor(cellSize * 0.45)}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + cellSize / 2, y + cellSize / 2 + 1);

    // stub
    cell.openings.forEach(d => {
      const r = armRect(x, y, d);
      const stub = { ...r };
      if (d === 'E') { stub.x = x + cellSize - m; stub.w = m; }
      if (d === 'W') { stub.x = x; stub.w = m; }
      if (d === 'N') { stub.y = y; stub.h = m; }
      if (d === 'S') { stub.y = y + cellSize - m; stub.h = m; }
      ctx.fillStyle = lit ? '#c47a2a' : color;
      ctx.fillRect(stub.x, stub.y, stub.w, stub.h);
    });
  }

  // ---------- Input ----------
  function cellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    const px = t.clientX - rect.left;
    const py = t.clientY - rect.top;
    const x = Math.floor(px / cellSize);
    const y = Math.floor(py / cellSize);
    return inBounds(x, y) ? { x, y } : null;
  }

  function tapAt(x, y) {
    if (phase !== 'play') return;
    const cell = grid[y][x];
    if (!cell || cell.locked) return;
    cell.openings = rotateOpenings(cell.openings);
    moves++;
    recomputeConnectivity();
    updateHud();
    draw();
    if (grid[snkPos.y][snkPos.x].connected) startFlowAnim();
  }

  // ---------- Win flow animation ----------
  function startFlowAnim() {
    const chain = findFlowPath();
    if (!chain) { winLevel(); return; }
    // Reset visual fill on every chain cell so the animation starts fresh.
    for (const node of chain) {
      const c = grid[node.y][node.x];
      c.animFill = 0;
      c.animEntry = node.entry;
    }
    // Source pops to full immediately so flow appears to come "from" it.
    const srcCell = grid[chain[0].y][chain[0].x];
    srcCell.animFill = 1;

    flowAnim = {
      chain,
      idx: 1,
      t: 0,
      msPerCell: 160,
      lastTime: performance.now(),
    };
    phase = 'flowing';
    statusEl.classList.remove('win');
    statusEl.textContent = 'FLOWING...';
    requestAnimationFrame(flowTick);
  }

  function flowTick(now) {
    if (phase !== 'flowing' || !flowAnim) return;
    const dt = Math.min(64, now - flowAnim.lastTime);
    flowAnim.lastTime = now;
    flowAnim.t += dt / flowAnim.msPerCell;
    if (flowAnim.t >= 1) flowAnim.t = 1;
    const node = flowAnim.chain[flowAnim.idx];
    grid[node.y][node.x].animFill = flowAnim.t;
    draw();
    if (flowAnim.t >= 1) {
      flowAnim.idx++;
      flowAnim.t = 0;
      if (flowAnim.idx >= flowAnim.chain.length) {
        // animation complete — clear overrides and show overlay
        for (const n of flowAnim.chain) {
          const c = grid[n.y][n.x];
          c.animFill = undefined;
          c.animEntry = undefined;
        }
        flowAnim = null;
        draw();
        winLevel();
        return;
      }
    }
    requestAnimationFrame(flowTick);
  }

  canvas.addEventListener('click', e => {
    const c = cellFromEvent(e);
    if (c) tapAt(c.x, c.y);
  });

  shuffleBtn.addEventListener('click', () => {
    if (phase === 'play') startLevel(false);
  });

  overlayBtn.addEventListener('click', () => {
    if (phase === 'won') level++;
    else if (phase === 'idle' || phase === 'lost') { level = 1; }
    startLevel(true);
  });

  // ---------- Level lifecycle ----------
  function startLevel(resetMoves) {
    if (resetMoves) moves = 0;
    newBoard();
    recomputeConnectivity();
    phase = 'play';
    overlay.classList.add('hidden');
    statusEl.classList.remove('win');
    statusEl.textContent = 'TAP A PIPE TO ROTATE';
    updateHud();
    resize();
  }

  function updateHud() {
    movesEl.textContent = moves;
    levelEl.textContent = level;
    parEl.textContent = par;
  }

  function winLevel() {
    phase = 'won';
    statusEl.classList.add('win');
    statusEl.textContent = 'CLEAN BEACH!';
    const ratio = moves / par;
    let rating;
    if (ratio <= 1.0) rating = '★ ★ ★';
    else if (ratio <= 1.4) rating = '★ ★';
    else rating = '★';
    overlayTitle.textContent = 'CLEAN BEACH!';
    overlayText.innerHTML =
      `Sewage flowing to the plant.<br>` +
      `<span class="snk">${moves}</span> moves &bull; par ${par}<br>` +
      `<span style="color: var(--neon-yellow); text-shadow: 0 0 6px var(--neon-yellow); font-size: 20px;">${rating}</span>`;
    overlayBtn.textContent = 'NEXT LEVEL';
    overlay.classList.remove('hidden');
  }

  // ---------- Boot ----------
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  resize();
  overlayBtn.textContent = 'START';
})();
