/* ============================================================
 * input.js —— 键盘 + 触屏输入管理
 * 玩家1: W/A/S/D 移动，Space 射击
 * 玩家2: ↑/↓/←/→ 移动，Enter 射击
 * ============================================================ */
const Input = (() => {
  // 每个玩家的输入状态
  const state = {
    p1: { up: false, down: false, left: false, right: false, fire: false },
    p2: { up: false, down: false, left: false, right: false, fire: false },
  };

  // 用于网络联机：返回一个可序列化的输入快照
  function snapshot() {
    return { p1: { ...state.p1 }, p2: { ...state.p2 } };
  }

  function applyRemote(p1, p2) {
    if (p1) Object.assign(state.p1, p1);
    if (p2) Object.assign(state.p2, p2);
  }

  function reset() {
    ['p1', 'p2'].forEach(k => {
      state[k].up = state[k].down = state[k].left = state[k].right = state[k].fire = false;
    });
  }

  // 键盘
  const keyMap = {
    'w': ['p1', 'up'], 'arrowup': ['p2', 'up'],
    's': ['p1', 'down'], 'arrowdown': ['p2', 'down'],
    'a': ['p1', 'left'], 'arrowleft': ['p2', 'left'],
    'd': ['p1', 'right'], 'arrowright': ['p2', 'right'],
    ' ': ['p1', 'fire'], 'enter': ['p2', 'fire'],
  };

  window.addEventListener('keydown', e => {
    const m = keyMap[e.key.toLowerCase()];
    if (m) { state[m[0]][m[1]] = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', e => {
    const m = keyMap[e.key.toLowerCase()];
    if (m) { state[m[0]][m[1]] = false; e.preventDefault(); }
  });

  // 触屏按钮
  function bindTouch(el, player, key) {
    if (!el) return;
    const down = e => { e.preventDefault(); state[player][key] = true; };
    const up = e => { e.preventDefault(); state[player][key] = false; };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up);
    el.addEventListener('touchcancel', up);
    el.addEventListener('mousedown', down);
    el.addEventListener('mouseup', up);
    el.addEventListener('mouseleave', up);
  }

  // 构建触屏控件
  function buildTouchControls(container) {
    container.innerHTML = '';
    const mkBtn = (text, player, key, cls = '') => {
      const b = document.createElement('div');
      b.className = 'touch-btn ' + cls;
      b.textContent = text;
      bindTouch(b, player, key);
      return b;
    };
    // 玩家1（左侧）
    const p1pad = document.createElement('div');
    p1pad.className = 'touch-pad';
    p1pad.appendChild(mkBtn('↑', 'p1', 'up'));
    const row1 = document.createElement('div'); row1.style.display = 'flex'; row1.style.gap = '6px';
    row1.appendChild(mkBtn('←', 'p1', 'left'));
    row1.appendChild(mkBtn('↓', 'p1', 'down'));
    row1.appendChild(mkBtn('→', 'p1', 'right'));
    p1pad.appendChild(row1);
    p1pad.appendChild(mkBtn('🔥', 'p1', 'fire', 'fire'));

    // 玩家2（右侧）
    const p2pad = document.createElement('div');
    p2pad.className = 'touch-pad';
    p2pad.appendChild(mkBtn('↑', 'p2', 'up'));
    const row2 = document.createElement('div'); row2.style.display = 'flex'; row2.style.gap = '6px';
    row2.appendChild(mkBtn('←', 'p2', 'left'));
    row2.appendChild(mkBtn('↓', 'p2', 'down'));
    row2.appendChild(mkBtn('→', 'p2', 'right'));
    p2pad.appendChild(row2);
    p2pad.appendChild(mkBtn('🔥', 'p2', 'fire', 'fire'));

    container.appendChild(p1pad);
    container.appendChild(p2pad);
  }

  return { state, snapshot, applyRemote, reset, buildTouchControls };
})();
