(() => {
  'use strict';

  // ---------- Layout: classic "turtle" (144 tiles) ----------
  // Coordinates are in tile units; half units allowed. Internally doubled to integers.
  function turtleLayout() {
    const p = [];
    const add = (x, y, z) => p.push({ x: Math.round(x * 2), y: Math.round(y * 2), z });
    const row = (y, x1, x2, z) => { for (let x = x1; x <= x2; x++) add(x, y, z); };

    // layer 0
    row(0, 1, 12, 0);
    row(1, 3, 10, 0);
    row(2, 2, 11, 0);
    row(3, 1, 12, 0);
    row(4, 1, 12, 0);
    row(5, 2, 11, 0);
    row(6, 3, 10, 0);
    row(7, 1, 12, 0);
    add(0, 3.5, 0);
    add(13, 3.5, 0);
    add(14, 3.5, 0);
    // layer 1..3
    for (let y = 1; y <= 6; y++) row(y, 4, 9, 1);
    for (let y = 2; y <= 5; y++) row(y, 5, 8, 2);
    for (let y = 3; y <= 4; y++) row(y, 6, 7, 3);
    // top
    add(6.5, 3.5, 4);
    return p;
  }

  // ---------- Tile set ----------
  const NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const WINDS = [['東', 'E'], ['南', 'S'], ['西', 'W'], ['北', 'N']];
  const FLOWERS = [['🌸', 'SZILVA'], ['🌺', 'ORCHIDEA'], ['🌼', 'KRIZANTÉM'], ['🎋', 'BAMBUSZ']];
  const SEASONS = [['🌱', 'TAVASZ'], ['☀️', 'NYÁR'], ['🍂', 'ŐSZ'], ['❄️', 'TÉL']];

  // Each face: { key: unique look, match: matching group }
  function buildFacePairs() {
    const pairs = [];
    const four = (key) => { pairs.push([{ key, match: key }, { key, match: key }]); pairs.push([{ key, match: key }, { key, match: key }]); };
    for (let n = 1; n <= 9; n++) { four('d' + n); four('b' + n); four('c' + n); }
    for (let i = 0; i < 4; i++) four('w' + i);
    ['dr', 'dg', 'dw'].forEach(four);
    pairs.push([{ key: 'f0', match: 'f' }, { key: 'f1', match: 'f' }]);
    pairs.push([{ key: 'f2', match: 'f' }, { key: 'f3', match: 'f' }]);
    pairs.push([{ key: 's0', match: 's' }, { key: 's1', match: 's' }]);
    pairs.push([{ key: 's2', match: 's' }, { key: 's3', match: 's' }]);
    return pairs; // 72 pairs
  }

  // 3×3 grid placements for 1..9 pips: [col, row]
  const PIP_LAYOUT = {
    2: [[1, 0], [1, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
    7: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
    8: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
    9: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
  };
  const DOT_COLORS = ['c-blue', 'c-red', 'c-green'];

  function faceHTML(key) {
    if (key === 'dr') return `<div class="face honor dragon-red">中</div>`;
    if (key === 'dg') return `<div class="face honor dragon-green">發</div>`;
    if (key === 'dw') return `<div class="face honor"><span class="dragon-white"></span></div>`;
    const t = key[0], v = key.slice(1);
    if (t === 'c') {
      return `<div class="face chars"><span class="num">${NUMS[v - 1]}</span><span class="wan">萬</span></div>`;
    }
    if (t === 'd' || t === 'b') {
      const n = +v;
      if (n === 1) {
        return t === 'd'
          ? `<div class="face pips"><span class="dot big c-red"></span></div>`
          : `<div class="face pips"><span class="bird">🦚</span></div>`;
      }
      const cells = PIP_LAYOUT[n].map(([c, r], i) => {
        const pos = `grid-column:${c + 1};grid-row:${r + 1}`;
        if (t === 'd') return `<span class="dot ${DOT_COLORS[(i + n) % 3]}" style="${pos}"></span>`;
        const red = (n === 5 || n === 9) && c === 1 && r === 1 || (n === 7 && r === 0 && c === 1);
        return `<span class="stick${red ? ' red' : ''}" style="${pos}"></span>`;
      }).join('');
      return `<div class="face pips">${cells}</div>`;
    }
    if (t === 'w') {
      const [ch, en] = WINDS[v];
      return `<div class="face honor"><span class="corner">${en}</span>${ch}</div>`;
    }
    const [emoji, label] = (t === 'f' ? FLOWERS : SEASONS)[v];
    return `<div class="face bonus"><span class="emoji">${emoji}</span><span class="label">${label}</span></div>`;
  }

  // ---------- Geometry / rules ----------
  // A tile is free if nothing lies on top of it and its left or right side is open.
  function isFree(tile, tiles) {
    let left = false, right = false;
    for (const o of tiles) {
      if (o === tile || o.removed) continue;
      const dx = o.x - tile.x, dy = o.y - tile.y;
      if (Math.abs(dy) >= 2) continue;
      if (o.z === tile.z + 1 && Math.abs(dx) < 2) return false;
      if (o.z === tile.z) {
        if (dx === -2) left = true;
        else if (dx === 2) right = true;
      }
    }
    return !(left && right);
  }

  const shuffled = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Simulate removing random free pairs from a full board. Assigning face pairs in
  // that order guarantees the resulting deal is solvable.
  function solvableAssign(tiles, facePairs) {
    for (let attempt = 0; attempt < 300; attempt++) {
      tiles.forEach(t => (t.removed = false));
      const order = [];
      let ok = true;
      while (order.length * 2 < tiles.length) {
        const free = shuffled(tiles.filter(t => !t.removed && isFree(t, tiles)));
        if (free.length < 2) { ok = false; break; }
        // Prefer higher tiles to avoid burying stacks (reduces dead ends).
        free.sort((a, b) => b.z - a.z + (Math.random() - 0.5) * 1.5);
        const a = free[0], b = free[1];
        a.removed = b.removed = true;
        order.push([a, b]);
      }
      tiles.forEach(t => (t.removed = false));
      if (!ok) continue;
      const fp = shuffled(facePairs);
      order.forEach(([a, b], i) => { a.face = fp[i][0]; b.face = fp[i][1]; });
      return true;
    }
    // Fallback: plain random assignment (practically never reached).
    const faces = shuffled(facePairs.flat());
    tiles.forEach((t, i) => (t.face = faces[i]));
    return false;
  }

  // ---------- State ----------
  const boardEl = document.getElementById('board');
  const stageEl = document.getElementById('stage');
  const $ = (id) => document.getElementById(id);

  let tiles = [];
  let selected = null;
  let history = [];
  let startTime = 0, elapsed = 0, timerId = null, finished = false;
  let hintTimer = null;

  function newGame() {
    tiles = turtleLayout().map((p, i) => ({ ...p, id: i, removed: false, face: null, el: null }));
    solvableAssign(tiles, buildFacePairs());
    selected = null;
    history = [];
    finished = false;
    elapsed = 0;
    startTime = Date.now();
    clearInterval(timerId);
    timerId = setInterval(updateTime, 1000);
    hideDialog();
    render();
    layout();
    updateStatus();
    updateTime();
  }

  function render() {
    boardEl.innerHTML = '';
    for (const t of tiles) {
      const el = document.createElement('div');
      el.className = 'tile';
      el.innerHTML = faceHTML(t.face.key);
      el.style.zIndex = t.z * 1000 + t.x + t.y * 2 + 10;
      el.addEventListener('click', () => onTileClick(t));
      t.el = el;
      if (t.removed) el.style.display = 'none';
      boardEl.appendChild(el);
    }
  }

  // Scale & position tiles to fit the available area.
  function layout() {
    const availW = stageEl.clientWidth - 24;
    const availH = stageEl.clientHeight - 24;
    const cols = 15, rows = 8, ratio = 1.32;
    const w = Math.max(22, Math.floor(Math.min(availW / (cols + 0.5), availH / (rows * ratio + 0.5))));
    const h = w * ratio;
    const depth = w * 0.13;
    const pad = depth * 4;
    document.documentElement.style.setProperty('--w', w + 'px');
    boardEl.style.width = cols * w + pad + 'px';
    boardEl.style.height = rows * h + pad + 'px';
    for (const t of tiles) {
      t.el.style.left = pad + t.x * w / 2 - t.z * depth + 'px';
      t.el.style.top = pad + t.y * h / 2 - t.z * depth + 'px';
    }
  }

  const remaining = () => tiles.filter(t => !t.removed);

  function availablePairs() {
    const free = remaining().filter(t => isFree(t, tiles));
    const pairs = [];
    for (let i = 0; i < free.length; i++)
      for (let j = i + 1; j < free.length; j++)
        if (free[i].face.match === free[j].face.match) pairs.push([free[i], free[j]]);
    return pairs;
  }

  function updateStatus() {
    for (const t of tiles) {
      if (t.removed) continue;
      const free = isFree(t, tiles);
      t.el.classList.toggle('free', free);
      t.el.classList.toggle('blocked', !free);
    }
    const left = remaining().length;
    const moves = availablePairs().length;
    $('left').textContent = left;
    $('moves').textContent = moves;
    $('btn-undo').disabled = history.length === 0;

    if (left === 0) return win();
    if (moves === 0) {
      showDialog('Elakadtál', 'Nincs több szabad pár. Megkeverjük a megmaradt köveket?', [
        ['🔀 Keverés', shuffleRemaining, true],
        ['↶ Visszavonás', () => { hideDialog(); undo(); }],
        ['Új játék', newGame],
      ]);
    }
  }

  function onTileClick(t) {
    if (finished || t.removed) return;
    if (!isFree(t, tiles)) {
      t.el.classList.remove('shake');
      void t.el.offsetWidth;
      t.el.classList.add('shake');
      return;
    }
    clearHint();
    if (selected === t) {
      t.el.classList.remove('selected');
      selected = null;
      return;
    }
    if (selected && selected.face.match === t.face.match) {
      removePair(selected, t);
      selected = null;
      return;
    }
    if (selected) selected.el.classList.remove('selected');
    selected = t;
    t.el.classList.add('selected');
  }

  function removePair(a, b) {
    for (const t of [a, b]) {
      t.removed = true;
      t.el.classList.remove('selected');
      t.el.classList.add('removing');
      const el = t.el;
      setTimeout(() => { if (t.removed) el.style.display = 'none'; }, 260);
    }
    history.push({ type: 'pair', tiles: [a, b] });
    updateStatus();
  }

  function undo() {
    if (finished || !history.length) return;
    clearHint();
    if (selected) { selected.el.classList.remove('selected'); selected = null; }
    const h = history.pop();
    if (h.type === 'pair') {
      for (const t of h.tiles) {
        t.removed = false;
        t.el.style.display = '';
        t.el.classList.remove('removing');
      }
    } else {
      h.faces.forEach(([t, face]) => { t.face = face; t.el.innerHTML = faceHTML(face.key); });
    }
    updateStatus();
  }

  function shuffleRemaining() {
    hideDialog();
    if (finished) return;
    clearHint();
    if (selected) { selected.el.classList.remove('selected'); selected = null; }
    const rest = remaining();
    if (rest.length < 2) return;
    const before = rest.map(t => [t, t.face]);
    // Regroup current faces into matching pairs, then deal them solvably.
    const groups = {};
    rest.forEach(t => (groups[t.face.match] ||= []).push(t.face));
    const pairs = [];
    Object.values(groups).forEach(g => { for (let i = 0; i + 1 < g.length; i += 2) pairs.push([g[i], g[i + 1]]); });

    solvableAssign(rest, pairs);
    rest.forEach(t => (t.el.innerHTML = faceHTML(t.face.key)));
    history.push({ type: 'shuffle', faces: before });
    updateStatus();
  }

  function clearHint() {
    clearTimeout(hintTimer);
    tiles.forEach(t => t.el && t.el.classList.remove('hint'));
  }

  function hint() {
    if (finished) return;
    clearHint();
    const pairs = availablePairs();
    if (!pairs.length) return updateStatus();
    const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];
    a.el.classList.add('hint');
    b.el.classList.add('hint');
    hintTimer = setTimeout(clearHint, 2800);
  }

  // ---------- Timer & dialogs ----------
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function updateTime() {
    if (!finished) elapsed = Math.floor((Date.now() - startTime) / 1000);
    $('time').textContent = fmt(elapsed);
  }

  function win() {
    finished = true;
    clearInterval(timerId);
    updateTime();
    let best = null;
    try {
      best = +localStorage.getItem('mahjong-best') || null;
      if (!best || elapsed < best) { localStorage.setItem('mahjong-best', elapsed); best = elapsed; }
    } catch (e) { /* storage unavailable */ }
    const bestText = best ? `<br>Legjobb idő: <b>${fmt(best)}</b>` : '';
    showDialog('Gratulálok! 🎉', `Minden követ eltüntettél <b>${fmt(elapsed)}</b> alatt.${bestText}`, [
      ['✦ Új játék', newGame, true],
    ]);
  }

  function showDialog(title, html, buttons) {
    $('dialog-title').textContent = title;
    $('dialog-text').innerHTML = html;
    const box = $('dialog-actions');
    box.innerHTML = '';
    for (const [label, fn, primary] of buttons) {
      const b = document.createElement('button');
      b.textContent = label;
      if (primary) b.className = 'primary';
      b.addEventListener('click', fn);
      box.appendChild(b);
    }
    $('overlay').classList.remove('hidden');
  }

  function hideDialog() { $('overlay').classList.add('hidden'); }

  // ---------- Wiring ----------
  $('btn-new').addEventListener('click', newGame);
  $('btn-hint').addEventListener('click', hint);
  $('btn-undo').addEventListener('click', undo);
  $('btn-shuffle').addEventListener('click', shuffleRemaining);
  window.addEventListener('resize', layout);
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); return undo(); }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'h') hint();
    else if (k === 'u') undo();
    else if (k === 's') shuffleRemaining();
    else if (k === 'n') newGame();
    else if (k === 'escape' && selected) { selected.el.classList.remove('selected'); selected = null; }
  });

  newGame();
})();
