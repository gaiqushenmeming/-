/* ============================================================
 * games/snake.js —— 贪吃蛇对战（双人同屏抢食物）
 * ============================================================ */
class SnakeGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.targetScore = 8;
    this.cell = 24;
    this.cols = Math.floor(canvas.width / this.cell);
    this.rows = Math.floor(canvas.height / this.cell);
  }

  init() {
    const cx = this.cols, cy = this.rows;
    this.snakes = {
      p1: { body: [{ x: 5, y: Math.floor(cy / 2) }, { x: 4, y: Math.floor(cy / 2) }, { x: 3, y: Math.floor(cy / 2) }], dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 }, alive: true, respawn: 0 },
      p2: { body: [{ x: cx - 6, y: Math.floor(cy / 2) }, { x: cx - 5, y: Math.floor(cy / 2) }, { x: cx - 4, y: Math.floor(cy / 2) }], dir: { x: -1, y: 0 }, nextDir: { x: -1, y: 0 }, alive: true, respawn: 0 },
    };
    this.food = this.spawnFood();
    this.moveTimer = 0;
    this.moveInterval = 0.12;
    this.particles = [];
  }

  spawnFood() {
    let f;
    do {
      f = { x: Math.floor(Math.random() * this.cols), y: Math.floor(Math.random() * this.rows) };
    } while (this.snakes.p1.body.some(s => s.x === f.x && s.y === f.y) ||
             this.snakes.p2.body.some(s => s.x === f.x && s.y === f.y));
    return f;
  }

  update(dt, inputs) {
    let in1 = inputs.p1, in2 = inputs.p2;
    if (this.aiPlayer === 2) in2 = AI.snake(this.snakes.p2.body, this.food, this.cols, this.rows);
    if (this.aiPlayer === 1) in1 = AI.snake(this.snakes.p1.body, this.food, this.cols, this.rows);

    this.setDir(this.snakes.p1, in1);
    this.setDir(this.snakes.p2, in2);

    this.moveTimer += dt;
    if (this.moveTimer >= this.moveInterval) {
      this.moveTimer = 0;
      this.step();
    }

    // 粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  setDir(s, inp) {
    const d = { x: 0, y: 0 };
    if (inp.up) d.y = -1;
    else if (inp.down) d.y = 1;
    else if (inp.left) d.x = -1;
    else if (inp.right) d.x = 1;
    if (d.x || d.y) {
      // 不能180度掉头
      if (d.x !== -s.dir.x || d.y !== -s.dir.y) s.nextDir = d;
    }
  }

  step() {
    for (const key of ['p1', 'p2']) {
      const s = this.snakes[key];
      if (!s.alive) {
        s.respawn -= this.moveInterval;
        if (s.respawn <= 0) this.respawnSnake(key);
        continue;
      }
      s.dir = s.nextDir;
      const head = { x: s.body[0].x + s.dir.x, y: s.body[0].y + s.dir.y };
      // 撞墙
      if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
        this.die(key); continue;
      }
      // 撞自己或对方
      const other = key === 'p1' ? 'p2' : 'p1';
      const allBodies = [...s.body, ...this.snakes[other].body];
      if (allBodies.some(b => b.x === head.x && b.y === head.y)) {
        this.die(key); continue;
      }
      s.body.unshift(head);
      // 吃食物
      if (head.x === this.food.x && head.y === this.food.y) {
        this.scores[key]++;
        Audio.eat();
        this.spawnSparkles(this.food.x * this.cell + this.cell / 2, this.food.y * this.cell + this.cell / 2);
        this.food = this.spawnFood();
        this.checkWinner();
      } else {
        s.body.pop();
      }
    }
  }

  die(key) {
    const s = this.snakes[key];
    s.alive = false;
    s.respawn = 1.2;
    // 给对方加分
    const other = key === 'p1' ? 'p2' : 'p1';
    this.scores[other] += 2;
    Audio.boom();
    const head = s.body[0];
    this.spawnExplosion(head.x * this.cell + this.cell / 2, head.y * this.cell + this.cell / 2);
    this.checkWinner();
  }

  respawnSnake(key) {
    const s = this.snakes[key];
    const cx = this.cols, cy = this.rows;
    s.body = key === 'p1'
      ? [{ x: 5, y: Math.floor(cy / 2) }, { x: 4, y: Math.floor(cy / 2) }, { x: 3, y: Math.floor(cy / 2) }]
      : [{ x: cx - 6, y: Math.floor(cy / 2) }, { x: cx - 5, y: Math.floor(cy / 2) }, { x: cx - 4, y: Math.floor(cy / 2) }];
    s.dir = key === 'p1' ? { x: 1, y: 0 } : { x: -1, y: 0 };
    s.nextDir = { ...s.dir };
    s.alive = true;
  }

  spawnSparkles(x, y) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 80;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, r: 3, color: '#FFE66D' });
    }
  }
  spawnExplosion(x, y) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 140;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, r: 4, color: ['#FF6B6B', '#FF9F43'][Math.floor(Math.random() * 2)] });
    }
  }

  render(ctx) {
    const W = this.W, H = this.H;
    // 背景网格
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath(); ctx.moveTo(x * this.cell, 0); ctx.lineTo(x * this.cell, H); ctx.stroke();
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * this.cell); ctx.lineTo(W, y * this.cell); ctx.stroke();
    }

    // 食物（苹果）
    const fx = this.food.x * this.cell, fy = this.food.y * this.cell;
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.arc(fx + this.cell / 2, fy + this.cell / 2, this.cell / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#6BCB77';
    ctx.fillRect(fx + this.cell / 2 - 2, fy + 2, 4, 6);

    // 蛇
    this.drawSnake(ctx, this.snakes.p1, this.skinP1);
    this.drawSnake(ctx, this.snakes.p2, this.skinP2);

    // 粒子
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawSnake(ctx, s, skin) {
    if (!s.alive) return;
    const c = skin.colors;
    for (let i = s.body.length - 1; i >= 0; i--) {
      const seg = s.body[i];
      const x = seg.x * this.cell, y = seg.y * this.cell;
      ctx.fillStyle = c.body === 'rainbow' ? `hsl(${(i * 30) % 360}, 70%, 60%)` : c.body;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, this.cell - 2, this.cell - 2, 6);
      ctx.fill();
      ctx.strokeStyle = c.dark; ctx.lineWidth = 2; ctx.stroke();
      if (i === 0) {
        // 头：画眼睛
        ctx.fillStyle = '#fff';
        const ex = x + this.cell / 2, ey = y + this.cell / 2;
        ctx.beginPath(); ctx.arc(ex - 5, ey - 3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex + 5, ey - 3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(ex - 5 + s.dir.x * 2, ey - 3 + s.dir.y * 2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex + 5 + s.dir.x * 2, ey - 3 + s.dir.y * 2, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  getState() {
    return { snakes: this.snakes, food: this.food, scores: this.scores };
  }
  setState(s) {
    this.snakes = s.snakes; this.food = s.food;
    if (s.scores) this.scores = s.scores;
  }
}
GameEngine.register('snake', SnakeGame);
