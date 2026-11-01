/* ============================================================
 * main.js —— 主控制器：菜单导航、模式启动、联机、商店、设置
 * ============================================================ */
const App = (() => {
  let currentGame = null;
  let currentMode = null; // 'local' | 'ai' | 'online'
  let currentGameId = null;
  let onlineGame = null; // 'tank'|'pong'...
  let stateSendTimer = null;
  let lastInputs = null;

  // ---------- 屏幕切换 ----------
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + id);
    if (el) el.classList.add('active');
    updateMenuDisplay();
    Audio.click();
  }

  function updateMenuDisplay() {
    const d = Storage.get();
    document.getElementById('coin-display').textContent = d.coins;
    document.getElementById('score-display').textContent = d.score;
  }

  // ---------- Toast ----------
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2000);
  }

  // ---------- 菜单按钮 ----------
  function init() {
    GameEngine.init();
    updateMenuDisplay();
    Audio.init();
    const s = Storage.get().settings;
    Audio.setSfx(s.sfx); Audio.setBgm(s.bgm);
    AI.setDifficulty(s.difficulty);

    // 游戏选择
    document.querySelectorAll('.menu-btn[data-game]').forEach(btn => {
      btn.onclick = () => {
        currentGameId = btn.dataset.game;
        const titles = { tank: '🚗 坦克大战', pong: '🏓 弹球对决', snake: '🐍 贪吃蛇战', bounce: '💣 弹射炸弹' };
        document.getElementById('mode-game-title').textContent = titles[currentGameId];
        show('mode');
      };
    });

    // 模式选择
    document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
      btn.onclick = () => startMode(btn.dataset.mode);
    });

    document.getElementById('btn-shop').onclick = () => { renderShop(); show('shop'); };
    document.getElementById('btn-settings').onclick = () => { loadSettings(); show('settings'); };
    document.getElementById('btn-help').onclick = () => show('help');

    // 联机
    document.getElementById('btn-create-room').onclick = createRoom;
    document.getElementById('btn-join-room').onclick = () => {
      const code = document.getElementById('room-code-input').value.trim();
      if (code.length === 6) joinRoom(code);
      else toast('请输入6位房间码');
    };
    document.getElementById('btn-start-online').onclick = () => Net.startGame();
    document.getElementById('btn-leave-room').onclick = leaveOnline;

    setupNetListeners();
  }

  // ---------- 模式启动 ----------
  function startMode(mode) {
    currentMode = mode;
    if (mode === 'online') {
      show('online');
      return;
    }
    launchGame(currentGameId, mode);
  }

  function launchGame(gameId, mode, onlineRole = null) {
    const game = GameEngine.create(gameId);
    if (!game) { toast('游戏加载失败'); return; }
    currentGame = game;

    // AI 玩家设置
    if (mode === 'ai') game.aiPlayer = 2;
    else game.aiPlayer = null;

    // 联机角色
    game.onlineRole = onlineRole; // 'host' | 'guest' | null
    game.remoteMode = (onlineRole === 'guest'); // 客户端只渲染不模拟
    game.init();

    // HUD
    const names = { local: ['玩家1', '玩家2'], ai: ['我', '电脑'], online: ['我', '对手'] };
    document.getElementById('p1-name').textContent = names[mode]?.[0] || '玩家1';
    document.getElementById('p2-name').textContent = names[mode]?.[1] || '玩家2';

    game.onScore = (s1, s2) => {
      document.getElementById('p1-score').textContent = s1;
      document.getElementById('p2-score').textContent = s2;
    };
    game.onGameOver = (winner) => onGameOver(winner, mode);

    // 触屏控制
    const touchSet = Storage.get().settings.touch;
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const showTouch = touchSet === 'on' || (touchSet === 'auto' && isTouch);
    const touchEl = document.getElementById('touch-controls');
    if (showTouch) {
      Input.buildTouchControls(touchEl);
      touchEl.classList.add('active');
    } else {
      touchEl.classList.remove('active');
    }

    Input.reset();
    show('game');
    game.start();
    Audio.startBgm();

    // 联机：启动状态同步
    if (mode === 'online') startOnlineSync(game);
  }

  // ---------- 联机同步 ----------
  function startOnlineSync(game) {
    // 把当前游戏挂到 Net 上供统一回调使用
    Net._currentGame = game;
    if (game.onlineRole === 'host') {
      // 房主：定时广播状态
      stateSendTimer = setInterval(() => {
        Net.sendState(game.getState());
      }, 50);
    } else {
      // 客户端：定时发送本地输入
      stateSendTimer = setInterval(() => {
        Net.sendInput(Input.state.p1);
      }, 50);
    }
  }

  function stopOnlineSync() {
    if (stateSendTimer) { clearInterval(stateSendTimer); stateSendTimer = null; }
    Net._currentGame = null;
  }

  // ---------- 网络监听 ----------
  function setupNetListeners() {
    Net.on('open', () => setOnlineStatus('已连接服务器', 'ok'));
    Net.on('error', (e) => setOnlineStatus('连接错误：' + (e || '未知'), 'err'));
    Net.on('close', () => setOnlineStatus('连接已断开', 'err'));

    Net.on('created', (room) => {
      document.getElementById('room-code-display').textContent = room;
      document.getElementById('room-info').style.display = 'block';
      document.getElementById('room-players').textContent = '等待对手加入...';
      document.getElementById('btn-start-online').disabled = true;
      toast('房间已创建！把房间码告诉好友');
    });

    Net.on('joined', (msg) => {
      document.getElementById('room-code-display').textContent = msg.room;
      document.getElementById('room-info').style.display = 'block';
      document.getElementById('room-players').textContent = '已加入房间，等待房主开始...';
      document.getElementById('btn-start-online').disabled = true;
    });

    Net.on('player_join', (name) => {
      document.getElementById('room-players').textContent = name + ' 已加入！';
      document.getElementById('btn-start-online').disabled = false;
    });

    Net.on('player_leave', (name) => {
      document.getElementById('room-players').textContent = name + ' 离开了';
      document.getElementById('btn-start-online').disabled = true;
    });

    Net.on('start', () => {
      launchGame(onlineGame, 'online', Net.isHost() ? 'host' : 'guest');
    });

    // 联机游戏内数据：房主接收客户端输入，客户端接收房主状态
    Net.on('input', (input) => {
      const g = Net._currentGame;
      if (g && g.onlineRole === 'host') Input.applyRemote(null, input);
    });
    Net.on('state', (state) => {
      const g = Net._currentGame;
      if (g && g.onlineRole === 'guest') g.setState(state);
    });

    Net.on('error', (msg) => toast(msg));
  }

  function setOnlineStatus(text, type) {
    const el = document.getElementById('online-status');
    el.textContent = text;
    el.style.color = type === 'ok' ? '#27ae60' : type === 'err' ? '#e74c3c' : '#222';
  }

  function getServerUrl() {
    const s = Storage.get().settings.server;
    if (s && s.trim()) return s.trim();
    // 未设置时，默认连接当前网页所在的服务器（部署到 Render 等平台时自动适配）
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}`;
  }

  function createRoom() {
    onlineGame = currentGameId;
    const url = getServerUrl();
    setOnlineStatus('连接中...');
    Net.connect(url, () => {
      Net.createRoom();
    }).catch(() => {
      setOnlineStatus('无法连接服务器，请检查设置中的服务器地址', 'err');
      toast('连接失败');
    });
  }

  function joinRoom(code) {
    onlineGame = currentGameId;
    const url = getServerUrl();
    setOnlineStatus('连接中...');
    Net.connect(url, () => {
      Net.joinRoom(code);
    }).catch(() => {
      setOnlineStatus('无法连接服务器', 'err');
      toast('连接失败');
    });
  }

  function leaveOnline() {
    Net.leaveRoom();
    Net.disconnect();
    stopOnlineSync();
    document.getElementById('room-info').style.display = 'none';
    show('mode');
  }

  // ---------- 结算 ----------
  function onGameOver(winner, mode) {
    Audio.stopBgm();
    stopOnlineSync();
    const won = (winner === 1);
    const title = won ? '🎉 玩家1 获胜！' : '🎉 玩家2 获胜！';
    document.getElementById('result-title').textContent = title;

    let reward = 0;
    if (mode === 'ai') {
      if (won) { reward = 30; Storage.addCoins(reward); Storage.addScore(10); Storage.recordWin(); Audio.win(); }
      else { reward = 5; Storage.addCoins(reward); Storage.recordLose(); Audio.lose(); }
    } else if (mode === 'online') {
      if (won) { reward = 50; Storage.addCoins(reward); Storage.addScore(20); Storage.recordWin(); Audio.win(); }
      else { reward = 10; Storage.addCoins(reward); Storage.recordLose(); Audio.lose(); }
    } else {
      Audio.win();
    }

    const detail = document.getElementById('result-detail');
    detail.innerHTML = `
      <p>最终比分：<b style="color:var(--c1)">${currentGame.scores.p1}</b> : <b style="color:var(--c2)">${currentGame.scores.p2}</b></p>
      <p>模式：${ { local: '本地双人', ai: '人机对战', online: '远程联机' }[mode] }</p>
    `;
    document.getElementById('reward-coin').textContent = reward;
    updateMenuDisplay();

    if (mode === 'online') {
      Net.leaveRoom();
      Net.disconnect();
    }

    setTimeout(() => show('result'), 600);
  }

  function rematch() {
    if (currentGame) {
      currentGame.stop();
      launchGame(currentGameId, currentMode);
    }
  }

  function quitGame() {
    if (currentGame) currentGame.stop();
    stopOnlineSync();
    Audio.stopBgm();
    if (currentMode === 'online') {
      Net.leaveRoom();
      Net.disconnect();
    }
    show('menu');
  }

  // ---------- 商店 ----------
  function renderShop() {
    const d = Storage.get();
    document.getElementById('shop-coin').textContent = d.coins;
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    SKINS.forEach(skin => {
      const owned = d.ownedSkins.includes(skin.id);
      const equipped = d.equippedP1 === skin.id || d.equippedP2 === skin.id;
      const item = document.createElement('div');
      item.className = 'shop-item';
      const bg = skin.colors.body === 'rainbow'
        ? 'linear-gradient(135deg,#FF6B6B,#FFD700,#6BCB77,#4ECDC4)'
        : skin.colors.body;
      item.innerHTML = `
        <div class="shop-preview" style="background:${bg}"></div>
        <div class="shop-name">${skin.name}</div>
        <div class="shop-price">${owned ? '已拥有' : skin.price + ' 🪙'}</div>
      `;
      const btn = document.createElement('button');
      btn.className = 'shop-buy' + (owned ? ' owned' : '');
      if (owned) {
        btn.textContent = equipped ? '使用中' : '装备P1';
        btn.disabled = equipped;
        btn.onclick = () => { Storage.equip(1, skin.id); toast('已装备到玩家1'); renderShop(); updateMenuDisplay(); };
      } else {
        btn.textContent = '购买';
        btn.disabled = d.coins < skin.price;
        btn.onclick = () => {
          if (Storage.buySkin(skin.id, skin.price)) {
            Audio.coin(); toast('购买成功！'); renderShop(); updateMenuDisplay();
          } else toast('金币不足');
        };
      }
      item.appendChild(btn);
      grid.appendChild(item);
    });
  }

  // ---------- 设置 ----------
  function loadSettings() {
    const s = Storage.get().settings;
    document.getElementById('set-sfx').value = s.sfx;
    document.getElementById('set-bgm').value = s.bgm;
    document.getElementById('set-difficulty').value = s.difficulty;
    document.getElementById('set-touch').value = s.touch;
    document.getElementById('set-server').value = s.server;
    document.getElementById('set-nickname').value = Storage.get().nickname;
  }

  function saveSettings() {
    const s = {
      sfx: +document.getElementById('set-sfx').value,
      bgm: +document.getElementById('set-bgm').value,
      difficulty: document.getElementById('set-difficulty').value,
      touch: document.getElementById('set-touch').value,
      server: document.getElementById('set-server').value.trim(),
    };
    Storage.updateSettings(s);
    Storage.setNickname(document.getElementById('set-nickname').value.trim());
    Audio.setSfx(s.sfx); Audio.setBgm(s.bgm);
    AI.setDifficulty(s.difficulty);
    toast('设置已保存');
    show('menu');
  }

  // 暴露
  return { show, init, quitGame, rematch, leaveOnline, saveSettings };
})();

window.addEventListener('load', App.init);
