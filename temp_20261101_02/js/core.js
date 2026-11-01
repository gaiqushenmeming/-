/* ============================================================
 * core.js —— 游戏核心引擎
 * 提供：Canvas 渲染循环、游戏基类、皮肤绘制、网络同步
 * ============================================================ */

// roundRect 兼容性补丁
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    this.beginPath();
    this.moveTo(x + r[0], y);
    this.lineTo(x + w - r[1], y);
    this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
    this.lineTo(x + w, y + h - r[2]);
    this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
    this.lineTo(x + r[3], y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
    this.lineTo(x, y + r[0]);
    this.quadraticCurveTo(x, y, x + r[0], y);
    this.closePath();
    return this;
  };
}

// ---------- 皮肤定义 ----------
const SKINS = [
  { id: 'default-red',  name: '经典红',  price: 0,   colors: { body: '#FF6B6B', dark: '#C92A2A', light: '#FFE0E0' } },
  { id: 'default-blue', name: '经典蓝',  price: 0,   colors: { body: '#4ECDC4', dark: '#0B7285', light: '#E0FBFC' } },
  { id: 'gold',         name: '黄金战士', price: 200, colors: { body: '#FFD700', dark: '#B8860B', light: '#FFF8DC' } },
  { id: 'purple',       name: '神秘紫',  price: 150, colors: { body: '#A29BFE', dark: '#5F3DC4', light: '#E5DBFF' } },
  { id: 'pink',         name: '樱花粉',  price: 150, colors: { body: '#FD79A8', dark: '#C2185B', light: '#FFE0EC' } },
  { id: 'green',        name: '森林绿',  price: 150, colors: { body: '#6BCB77', dark: '#2D6A4F', light: '#D8F3DC' } },
  { id: 'orange',       name: '烈焰橙',  price: 180, colors: { body: '#FF9F43', dark: '#D9480F', light: '#FFE8CC' } },
  { id: 'rainbow',      name: '彩虹英雄', price: 500, colors: { body: 'rainbow', dark: '#333', light: '#fff' } },
];

function getSkin(id) {
  return SKINS.find(s => s.id === id) || SKINS[0];
}

// ---------- 绘制卡通角色（圆形+眼睛+嘴巴） ----------
function drawCartoonCharacter(ctx, x, y, radius, skin, dir = 0, opts = {}) {
  const colors = skin.colors;
  ctx.save();
  ctx.translate(x, y);

  // 身体（圆）
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  if (colors.body === 'rainbow') {
    const grad = ctx.createLinearGradient(-radius, -radius, radius, radius);
    grad.addColorStop(0, '#FF6B6B'); grad.addColorStop(0.3, '#FFD700');
    grad.addColorStop(0.6, '#6BCB77'); grad.addColorStop(1, '#4ECDC4');
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = colors.body;
  }
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = colors.dark;
  ctx.stroke();

  // 高光
  ctx.beginPath();
  ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();

  // 眼睛（朝向 dir 方向偏移）
  const ex = Math.cos(dir) * radius * 0.15;
  const ey = Math.sin(dir) * radius * 0.15;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-radius * 0.3 + ex, -radius * 0.1 + ey, radius * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(radius * 0.3 + ex, -radius * 0.1 + ey, radius * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(-radius * 0.3 + ex, -radius * 0.1 + ey, radius * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(radius * 0.3 + ex, -radius * 0.1 + ey, radius * 0.09, 0, Math.PI * 2); ctx.fill();

  // 嘴巴
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, radius * 0.25, radius * 0.2, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

// ---------- 游戏基类 ----------
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;
    this.running = false;
    this.lastTime = 0;
    this.winner = null;
    this.scores = { p1: 0, p2: 0 };
    this.targetScore = 5;
    this.skinP1 = getSkin(Storage.get().equippedP1);
    this.skinP2 = getSkin(Storage.get().equippedP2);
    this.onScore = null;
    this.onGameOver = null;
    this.gameTime = 0;
  }

  // 子类实现
  init() {}
  update(dt, inputs) {}
  render(ctx) {}

  // 网络同步：返回完整状态
  getState() { return {}; }
  setState(s) {}

  loop = (t) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this.lastTime) / 1000);
    this.lastTime = t;

    if (!this.remoteMode) {
      // 本地 / 房主：正常跑模拟
      this.gameTime += dt;
      const inputs = this.getInputs();
      this.update(dt, inputs);
    }
    // 客户端：仅渲染房主同步过来的状态
    this.render(this.ctx);

    // 分数更新
    if (this.onScore) this.onScore(this.scores.p1, this.scores.p2);

    // 客户端也需要检测胜负（房主在 update 内检测）
    if (this.remoteMode && !this.winner) this.checkWinner();

    requestAnimationFrame(this.loop);
  };

  getInputs() {
    return Input.snapshot();
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
  }

  reset() {
    this.scores = { p1: 0, p2: 0 };
    this.winner = null;
    this.gameTime = 0;
    this.init();
  }

  checkWinner() {
    if (this.scores.p1 >= this.targetScore) { this.winner = 1; this.running = false; }
    else if (this.scores.p2 >= this.targetScore) { this.winner = 2; this.running = false; }
    if (this.winner && this.onGameOver) this.onGameOver(this.winner);
    return this.winner;
  }
}

// ---------- 游戏管理器 ----------
const GameEngine = {
  canvas: null,
  current: null,
  games: {},

  init() {
    this.canvas = document.getElementById('game-canvas');
  },

  register(id, cls) { this.games[id] = cls; },

  create(id) {
    const cls = this.games[id];
    if (!cls) return null;
    this.current = new cls(this.canvas);
    return this.current;
  },
};
