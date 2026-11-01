/* ============================================================
 * games/tank.js —— 坦克大战（双人俯视角射击）
 * ============================================================ */
class TankGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.targetScore = 5;
  }

  init() {
    const W = this.W, H = this.H;
    this.tanks = {
      p1: { x: 120, y: H / 2, angle: 0, r: 22, cooldown: 0, alive: true, respawn: 0 },
      p2: { x: W - 120, y: H / 2, angle: Math.PI, r: 22, cooldown: 0, alive: true, respawn: 0 },
    };
    this.bullets = [];
    this.walls = this.makeWalls();
    this.particles = [];
  }

  makeWalls() {
    const W = this.W, H = this.H;
    return [
      { x: W / 2 - 20, y: 80, w: 40, h: 120 },
      { x: W / 2 - 20, y: H - 200, w: 40, h: 120 },
      { x: 250, y: H / 2 - 20, w: 120, h: 40 },
      { x: W - 370, y: H / 2 - 20, w: 120, h: 40 },
    ];
  }

  update(dt, inputs) {
    const W = this.W, H = this.H;

    // 玩家1输入
    let in1 = inputs.p1;
    let in2 = inputs.p2;

    // AI 模式
    if (this.aiPlayer === 2) in2 = AI.tank(this.tanks.p2, this.tanks.p1, dt);
    if (this.aiPlayer === 1) in1 = AI.tank(this.tanks.p1, this.tanks.p2, dt);

    this.moveTank(this.tanks.p1, in1, dt);
    this.moveTank(this.tanks.p2, in2, dt);

    // 子弹
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      // 撞墙
      let hitWall = false;
      for (const w of this.walls) {
        if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
          hitWall = true; break;
        }
      }
      if (hitWall || b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) {
        this.bullets.splice(i, 1);
        continue;
      }
      // 命中坦克
      for (const key of ['p1', 'p2']) {
        const t = this.tanks[key];
        if (!t.alive) continue;
        if (b.owner === key) continue;
        const dx = b.x - t.x, dy = b.y - t.y;
        if (dx * dx + dy * dy < (t.r + b.r) * (t.r + b.r)) {
          t.alive = false; t.respawn = 1.5;
          this.bullets.splice(i, 1);
          const winner = key === 'p1' ? 'p2' : 'p1';
          this.scores[winner]++;
          Audio.hit();
          this.spawnExplosion(t.x, t.y);
          this.checkWinner();
          break;
        }
      }
    }

    // 重生
    for (const key of ['p1', 'p2']) {
      const t = this.tanks[key];
      if (!t.alive) {
        t.respawn -= dt;
        if (t.respawn <= 0) {
          t.alive = true;
          t.x = key === 'p1' ? 120 : W - 120;
          t.y = H / 2;
          t.angle = key === 'p1' ? 0 : Math.PI;
        }
      }
    }

    // 粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  moveTank(t, inp, dt) {
    if (!t.alive) return;
    const speed = 180;
    const rotSpeed = 3.2;
    if (inp.left) t.angle -= rotSpeed * dt;
    if (inp.right) t.angle += rotSpeed * dt;
    let move = 0;
    if (inp.up) move = 1;
    if (inp.down) move = -0.7;
    const nx = t.x + Math.cos(t.angle) * speed * move * dt;
    const ny = t.y + Math.sin(t.angle) * speed * move * dt;
    // 边界
    if (nx > t.r && nx < this.W - t.r) t.x = nx;
    if (ny > t.r && ny < this.H - t.r) t.y = ny;
    // 墙体碰撞（简单推开）
    for (const w of this.walls) {
      if (this.circleRect(t.x, t.y, t.r, w)) {
        t.x -= Math.cos(t.angle) * speed * move * dt;
        t.y -= Math.sin(t.angle) * speed * move * dt;
      }
    }
    // 射击
    t.cooldown -= dt;
    if (inp.fire && t.cooldown <= 0) {
      t.cooldown = 0.5;
      this.bullets.push({
        x: t.x + Math.cos(t.angle) * (t.r + 10),
        y: t.y + Math.sin(t.angle) * (t.r + 10),
        vx: Math.cos(t.angle) * 500, vy: Math.sin(t.angle) * 500,
        r: 6, life: 2, owner: t === this.tanks.p1 ? 'p1' : 'p2',
      });
      Audio.shoot();
    }
  }

  circleRect(cx, cy, r, rect) {
    const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  spawnExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 200;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.4 + Math.random() * 0.3, r: 3 + Math.random() * 4,
        color: ['#FF6B6B', '#FFD700', '#FF9F43'][Math.floor(Math.random() * 3)],
      });
    }
    Audio.boom();
  }

  render(ctx) {
    const W = this.W, H = this.H;
    // 背景
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, W, H);
    // 草地纹理
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i < 80; i++) {
      ctx.fillRect((i * 137) % W, (i * 211) % H, 6, 6);
    }
    // 墙
    for (const w of this.walls) {
      ctx.fillStyle = '#8D6E63';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 4;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    }

    // 坦克
    this.drawTank(ctx, this.tanks.p1, this.skinP1, true);
    this.drawTank(ctx, this.tanks.p2, this.skinP2, false);

    // 子弹
    for (const b of this.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = '#FFE66D';
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 粒子
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawTank(ctx, t, skin, isP1) {
    if (!t.alive) return;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    const c = skin.colors;
    // 履带
    ctx.fillStyle = c.dark;
    ctx.fillRect(-t.r, -t.r - 6, t.r * 2, 6);
    ctx.fillRect(-t.r, t.r, t.r * 2, 6);
    // 车身
    ctx.fillStyle = c.body === 'rainbow' ? '#A29BFE' : c.body;
    ctx.beginPath();
    ctx.roundRect(-t.r, -t.r, t.r * 2, t.r * 2, 8);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = c.dark;
    ctx.stroke();
    // 炮管
    ctx.fillStyle = '#444';
    ctx.fillRect(t.r - 4, -5, 18, 10);
    ctx.strokeRect(t.r - 4, -5, 18, 10);
    ctx.restore();
    // 脸
    drawCartoonCharacter(ctx, t.x, t.y, t.r * 0.55, skin, t.angle);
  }

  getState() {
    return { tanks: this.tanks, bullets: this.bullets, scores: this.scores, particles: this.particles };
  }
  setState(s) {
    this.tanks = s.tanks; this.bullets = s.bullets;
    if (s.scores) this.scores = s.scores;
    if (s.particles) this.particles = s.particles;
  }
}
GameEngine.register('tank', TankGame);
