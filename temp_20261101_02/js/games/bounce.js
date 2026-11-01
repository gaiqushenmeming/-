/* ============================================================
 * games/bounce.js —— 弹射炸弹（双方炮台对射，带物理弹跳）
 * ============================================================ */
class BounceGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.targetScore = 5;
    this.gravity = 600;
  }

  init() {
    const W = this.W, H = this.H;
    this.groundY = H - 80;
    this.cannons = {
      p1: { x: 120, y: this.groundY - 30, angle: -Math.PI / 4, power: 400, r: 28, cooldown: 0 },
      p2: { x: W - 120, y: this.groundY - 30, angle: -Math.PI + Math.PI / 4, power: 400, r: 28, cooldown: 0 },
    };
    this.bombs = [];
    this.particles = [];
    this.wind = (Math.random() - 0.5) * 40;
  }

  update(dt, inputs) {
    let in1 = inputs.p1, in2 = inputs.p2;
    if (this.aiPlayer === 2) {
      const ai = AI.bounce(this.cannons.p2.angle, this.cannons.p1.x, this.cannons.p1.y, this.cannons.p2.x, this.cannons.p2.y);
      this.cannons.p2.angle += ai.angleDelta || 0;
      in2 = { up: false, down: false, left: false, right: false, fire: ai.fire };
    }
    if (this.aiPlayer === 1) {
      const ai = AI.bounce(this.cannons.p1.angle, this.cannons.p2.x, this.cannons.p2.y, this.cannons.p1.x, this.cannons.p1.y);
      this.cannons.p1.angle += ai.angleDelta || 0;
      in1 = { up: false, down: false, left: false, right: false, fire: ai.fire };
    }

    // 控制
    this.controlCannon(this.cannons.p1, in1, dt, 1);
    this.controlCannon(this.cannons.p2, in2, dt, -1);

    // 炸弹物理
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.vy += this.gravity * dt;
      b.vx += this.wind * dt * 0.3;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.vx * 0.01;
      b.life -= dt;
      // 落地爆炸
      if (b.y > this.groundY) {
        this.explode(b);
        this.bombs.splice(i, 1);
        continue;
      }
      // 命中炮台
      for (const key of ['p1', 'p2']) {
        const c = this.cannons[key];
        if (b.owner === key) continue;
        const dx = b.x - c.x, dy = b.y - c.y;
        if (dx * dx + dy * dy < (c.r + b.r) * (c.r + b.r)) {
          const winner = key === 'p1' ? 'p2' : 'p1';
          this.scores[winner]++;
          this.explode(b);
          this.bombs.splice(i, 1);
          Audio.hit();
          this.checkWinner();
          break;
        }
      }
      if (b.life <= 0 || b.x < -50 || b.x > this.W + 50) this.bombs.splice(i, 1);
    }

    // 粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += 200 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  controlCannon(c, inp, dt, dir) {
    const rotSpeed = 1.5;
    if (inp.left) c.angle -= rotSpeed * dt;
    if (inp.right) c.angle += rotSpeed * dt;
    // 限制角度（朝上方向）
    c.angle = Math.max(-Math.PI, Math.min(0, c.angle));
    if (inp.up) c.power = Math.min(700, c.power + 200 * dt);
    if (inp.down) c.power = Math.max(150, c.power - 200 * dt);
    c.cooldown -= dt;
    if (inp.fire && c.cooldown <= 0) {
      c.cooldown = 1.2;
      const bx = c.x + Math.cos(c.angle) * 40;
      const by = c.y + Math.sin(c.angle) * 40;
      this.bombs.push({
        x: bx, y: by, vx: Math.cos(c.angle) * c.power, vy: Math.sin(c.angle) * c.power,
        r: 12, life: 6, rot: 0, owner: c === this.cannons.p1 ? 'p1' : 'p2',
      });
      Audio.shoot();
    }
  }

  explode(b) {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 200;
      this.particles.push({
        x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
        life: 0.5 + Math.random() * 0.3, r: 4 + Math.random() * 5,
        color: ['#FF6B6B', '#FFD700', '#FF9F43', '#fff'][Math.floor(Math.random() * 4)],
      });
    }
    Audio.boom();
  }

  render(ctx) {
    const W = this.W, H = this.H;
    // 天空
    const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, '#87CEEB'); sky.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, this.groundY);
    // 云
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    this.cloud(ctx, 150, 80, 40);
    this.cloud(ctx, 500, 60, 50);
    this.cloud(ctx, 750, 100, 35);
    // 地面
    ctx.fillStyle = '#8BC34A';
    ctx.fillRect(0, this.groundY, W, H - this.groundY);
    ctx.fillStyle = '#689F38';
    ctx.fillRect(0, this.groundY, W, 12);
    // 风指示
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('风向: ' + (this.wind > 0 ? '→' : this.wind < 0 ? '←' : '无风'), W / 2, 24);

    // 炮台
    this.drawCannon(ctx, this.cannons.p1, this.skinP1);
    this.drawCannon(ctx, this.cannons.p2, this.skinP2);

    // 炸弹
    for (const b of this.bombs) {
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(b.rot);
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FF6B6B';
      ctx.beginPath(); ctx.arc(-b.r * 0.4, -b.r * 0.4, b.r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // 引信火花
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(b.x, b.y - b.r - 2, 3, 0, Math.PI * 2); ctx.fill();
    }

    // 粒子
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  cloud(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.8, y + 5, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x - r * 0.8, y + 5, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCannon(ctx, c, skin) {
    const col = skin.colors;
    // 底座
    ctx.fillStyle = col.dark;
    ctx.beginPath();
    ctx.roundRect(c.x - c.r, c.y, c.r * 2, c.r, 8);
    ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.stroke();
    // 炮管
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    ctx.fillStyle = '#555';
    ctx.fillRect(0, -8, 45, 16);
    ctx.strokeRect(0, -8, 45, 16);
    ctx.restore();
    // 角色头
    drawCartoonCharacter(ctx, c.x, c.y - 5, c.r * 0.6, skin, c.angle);
    // 力度条
    const pw = c.power / 700;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(c.x - 30, c.y + c.r + 8, 60, 8);
    ctx.fillStyle = pw > 0.7 ? '#FF6B6B' : pw > 0.4 ? '#FFD700' : '#6BCB77';
    ctx.fillRect(c.x - 30, c.y + c.r + 8, 60 * pw, 8);
  }

  getState() {
    return { cannons: this.cannons, bombs: this.bombs, scores: this.scores, wind: this.wind };
  }
  setState(s) {
    this.cannons = s.cannons; this.bombs = s.bombs;
    if (s.scores) this.scores = s.scores;
    if (s.wind !== undefined) this.wind = s.wind;
  }
}
GameEngine.register('bounce', BounceGame);
