/* ============================================================
 * games/pong.js —— 弹球对决（双人乒乓，带道具）
 * ============================================================ */
class PongGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.targetScore = 7;
  }

  init() {
    const W = this.W, H = this.H;
    this.paddleW = 16, this.paddleH = 100;
    this.p1 = { x: 30, y: H / 2, w: this.paddleW, h: this.paddleH, speed: 420 };
    this.p2 = { x: W - 30 - this.paddleW, y: H / 2, w: this.paddleW, h: this.paddleH, speed: 420 };
    this.ball = { x: W / 2, y: H / 2, vx: 300, vy: 180, r: 12 };
    this.powerups = [];
    this.powerupTimer = 5;
    this.particles = [];
  }

  update(dt, inputs) {
    const W = this.W, H = this.H;
    let in1 = inputs.p1, in2 = inputs.p2;
    if (this.aiPlayer === 2) in2 = AI.pong(this.p2.y + this.p2.h / 2, this.ball.y, this.ball.vy, dt);
    if (this.aiPlayer === 1) in1 = AI.pong(this.p1.y + this.p1.h / 2, this.ball.y, this.ball.vy, dt);

    // 移动挡板
    for (const [p, inp] of [[this.p1, in1], [this.p2, in2]]) {
      if (inp.up) p.y -= p.speed * dt;
      if (inp.down) p.y += p.speed * dt;
      p.y = Math.max(0, Math.min(H - p.h, p.y));
    }

    // 球移动
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;
    // 上下弹
    if (this.ball.y - this.ball.r < 0) { this.ball.y = this.ball.r; this.ball.vy *= -1; Audio.bounce(); }
    if (this.ball.y + this.ball.r > H) { this.ball.y = H - this.ball.r; this.ball.vy *= -1; Audio.bounce(); }

    // 挡板碰撞
    if (this.collidePaddle(this.p1)) { this.ball.vx = Math.abs(this.ball.vx) * 1.05; this.deflect(this.p1); }
    if (this.collidePaddle(this.p2)) { this.ball.vx = -Math.abs(this.ball.vx) * 1.05; this.deflect(this.p2); }

    // 进球
    if (this.ball.x < 0) { this.scores.p2++; this.resetBall(1); Audio.hit(); this.checkWinner(); }
    if (this.ball.x > W) { this.scores.p1++; this.resetBall(-1); Audio.hit(); this.checkWinner(); }

    // 道具
    this.powerupTimer -= dt;
    if (this.powerupTimer <= 0) {
      this.powerupTimer = 8 + Math.random() * 6;
      this.powerups.push({
        x: W / 2 + (Math.random() - 0.5) * 300,
        y: 80 + Math.random() * (H - 160),
        r: 18, type: Math.random() < 0.5 ? 'big' : 'fast', life: 8,
      });
    }
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      pu.life -= dt;
      const dx = this.ball.x - pu.x, dy = this.ball.y - pu.y;
      if (dx * dx + dy * dy < (pu.r + this.ball.r) * (pu.r + this.ball.r)) {
        if (pu.type === 'big') {
          // 把当前球速方向上的挡板变大（谁最后碰的？简单：球速方向相反的挡板）
          const target = this.ball.vx > 0 ? this.p1 : this.p2;
          target.h = Math.min(180, target.h + 30);
        } else {
          this.ball.vx *= 1.4; this.ball.vy *= 1.4;
        }
        this.powerups.splice(i, 1);
        Audio.eat();
        this.spawnSparkles(pu.x, pu.y);
      } else if (pu.life <= 0) {
        this.powerups.splice(i, 1);
      }
    }

    // 粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  collidePaddle(p) {
    return this.ball.x - this.ball.r < p.x + p.w && this.ball.x + this.ball.r > p.x &&
      this.ball.y > p.y && this.ball.y < p.y + p.h;
  }

  deflect(p) {
    const rel = (this.ball.y - (p.y + p.h / 2)) / (p.h / 2);
    this.ball.vy = rel * 300;
    Audio.bounce();
  }

  resetBall(dir) {
    this.ball.x = this.W / 2; this.ball.y = this.H / 2;
    this.ball.vx = 300 * dir; this.ball.vy = (Math.random() - 0.5) * 200;
    // 重置挡板大小
    this.p1.h = this.paddleH; this.p2.h = this.paddleH;
  }

  spawnSparkles(x, y) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 120;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, r: 3, color: '#FFE66D' });
    }
  }

  render(ctx) {
    const W = this.W, H = this.H;
    // 背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);
    // 中线
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 12]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    // 道具
    for (const pu of this.powerups) {
      ctx.save();
      ctx.translate(pu.x, pu.y);
      ctx.rotate(this.gameTime * 3);
      ctx.fillStyle = pu.type === 'big' ? '#FFE66D' : '#FF6B6B';
      ctx.fillRect(-pu.r, -pu.r, pu.r * 2, pu.r * 2);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
      ctx.strokeRect(-pu.r, -pu.r, pu.r * 2, pu.r * 2);
      ctx.fillStyle = '#222'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(pu.type === 'big' ? '大' : '快', 0, 7);
      ctx.restore();
    }

    // 挡板
    this.drawPaddle(ctx, this.p1, this.skinP1);
    this.drawPaddle(ctx, this.p2, this.skinP2);

    // 球
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.stroke();

    // 粒子
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawPaddle(ctx, p, skin) {
    const c = skin.colors;
    ctx.fillStyle = c.body === 'rainbow' ? '#6BCB77' : c.body;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 8);
    ctx.fill();
    ctx.strokeStyle = c.dark; ctx.lineWidth = 3; ctx.stroke();
    // 眼睛
    ctx.fillStyle = '#fff';
    const ey = p.y + p.h / 2;
    ctx.beginPath(); ctx.arc(p.x + p.w / 2, ey - 15, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + p.w / 2, ey + 15, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(p.x + p.w / 2, ey - 15, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + p.w / 2, ey + 15, 3, 0, Math.PI * 2); ctx.fill();
  }

  getState() {
    return { p1: this.p1, p2: this.p2, ball: this.ball, scores: this.scores, powerups: this.powerups };
  }
  setState(s) {
    this.p1 = s.p1; this.p2 = s.p2; this.ball = s.ball;
    if (s.scores) this.scores = s.scores;
    if (s.powerups) this.powerups = s.powerups;
  }
}
GameEngine.register('pong', PongGame);
