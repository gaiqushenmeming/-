/* ============================================================
 * ai.js —— 人机对战 AI 逻辑
 * 为不同游戏提供简单但有挑战性的 AI
 * ============================================================ */
const AI = (() => {
  let difficulty = 'normal';

  function setDifficulty(d) { difficulty = d; }

  // 通用：根据难度返回"反应速度"和"精准度"
  function params() {
    if (difficulty === 'easy') return { speed: 0.5, acc: 0.6, delay: 0.15 };
    if (difficulty === 'hard') return { speed: 0.95, acc: 0.95, delay: 0.03 };
    return { speed: 0.75, acc: 0.8, delay: 0.08 };
  }

  let _lastUpdate = 0;
  let _cached = { up: false, down: false, left: false, right: false, fire: false };

  /**
   * 坦克AI：追踪玩家并射击
   * @param {object} self 自己的坦克 {x,y,angle}
   * @param {object} enemy 玩家坦克
   * @param {number} dt
   */
  function tank(self, enemy, dt) {
    const p = params();
    if (performance.now() - _lastUpdate < p.delay * 1000) return _cached;
    _lastUpdate = performance.now();

    const dx = enemy.x - self.x;
    const dy = enemy.y - self.y;
    const dist = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);

    // 角度差
    let diff = targetAngle - self.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const out = { up: false, down: false, left: false, right: false, fire: false };

    if (Math.abs(diff) > 0.1) {
      out.left = diff < 0;
      out.right = diff > 0;
    } else {
      // 对准后前进或后退
      if (dist > 180) out.up = true;
      else if (dist < 100) out.down = true;
      // 射击
      if (Math.random() < p.acc) out.fire = true;
    }
    // 偶尔加入随机扰动
    if (Math.random() > p.acc) {
      out.left = Math.random() < 0.5;
      out.right = !out.left;
    }
    _cached = out;
    return out;
  }

  /**
   * Pong AI：跟随球的 y 坐标
   */
  function pong(selfY, ballY, ballVy, dt) {
    const p = params();
    const out = { up: false, down: false, left: false, right: false, fire: false };
    const target = ballY + (ballVy > 0 ? 20 : -20);
    const diff = target - selfY;
    if (Math.abs(diff) > 10) {
      if (Math.random() < p.acc) {
        out.up = diff < 0;
        out.down = diff > 0;
      }
    }
    return out;
  }

  /**
   * 贪吃蛇AI：朝食物方向移动，避免撞墙和自己
   */
  function snake(self, food, gridW, gridH) {
    const p = params();
    const head = self[0];
    const dir = self.length > 1 ? { x: head.x - self[1].x, y: head.y - self[1].y } : { x: 1, y: 0 };
    const out = { up: dir.y < 0, down: dir.y > 0, left: dir.x < 0, right: dir.x > 0, fire: false };

    if (Math.random() < p.acc) {
      const dx = food.x - head.x;
      const dy = food.y - head.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        out.left = dx < 0; out.right = dx > 0; out.up = out.down = false;
      } else {
        out.up = dy < 0; out.down = dy > 0; out.left = out.right = false;
      }
    }

    // 避障检测：如果下一步会撞，转向
    const next = { x: head.x + (out.right ? 1 : out.left ? -1 : 0), y: head.y + (out.down ? 1 : out.up ? -1 : 0) };
    const willHit = next.x < 0 || next.x >= gridW || next.y < 0 || next.y >= gridH ||
      self.some(s => s.x === next.x && s.y === next.y);
    if (willHit) {
      const opts = [{ up: true }, { down: true }, { left: true }, { right: true }];
      for (const opt of opts) {
        const nx = { x: head.x + (opt.right ? 1 : opt.left ? -1 : 0), y: head.y + (opt.down ? 1 : opt.up ? -1 : 0) };
        if (nx.x >= 0 && nx.x < gridW && nx.y >= 0 && nx.y < gridH && !self.some(s => s.x === nx.x && s.y === nx.y)) {
          Object.assign(out, { up: false, down: false, left: false, right: false }, opt);
          break;
        }
      }
    }
    return out;
  }

  /**
   * 弹射炸弹AI：瞄准玩家发射
   */
  function bounce(selfAngle, enemyX, enemyY, selfX, selfY) {
    const p = params();
    const target = Math.atan2(enemyY - selfY, enemyX - selfX);
    let diff = target - selfAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const out = { fire: Math.abs(diff) < 0.3 && Math.random() < p.acc };
    out.angleDelta = diff * p.speed * 0.1;
    return out;
  }

  return { setDifficulty, tank, pong, snake, bounce, params };
})();
