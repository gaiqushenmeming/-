/* ============================================================
 * net.js —— 远程联机 WebSocket 客户端
 * 协议（JSON）：
 *   客户端 -> 服务器:
 *     {type:'create'}                      创建房间
 *     {type:'join', room:'ABCD12'}         加入房间
 *     {type:'input', input:{...}}          发送输入快照
 *     {type:'state', state:{...}}          房主广播游戏状态
 *     {type:'start'}                       房主开始游戏
 *     {type:'leave'}                       离开房间
 *     {type:'chat', msg}                   聊天
 *   服务器 -> 客户端:
 *     {type:'created', room:'ABCD12'}
 *     {type:'joined', room, players:[...]}
 *     {type:'player_join', name}
 *     {type:'player_leave', name}
 *     {type:'start'}
 *     {type:'input', from, input}
 *     {type:'state', state}               发给非房主
 *     {type:'error', msg}
 * ============================================================ */
const Net = (() => {
  let ws = null;
  let room = '';
  let isHost = false;
  let listeners = {};
  let reconnectTimer = null;

  function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); }
  function emit(ev, data) { (listeners[ev] || []).forEach(fn => fn(data)); }

  function connect(serverUrl, onOpen) {
    return new Promise((resolve, reject) => {
      try {
        ws = new WebSocket(serverUrl);
      } catch (e) { reject(e); return; }
      ws.onopen = () => { emit('open'); if (onOpen) onOpen(); resolve(); };
      ws.onmessage = e => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        handleMessage(msg);
      };
      ws.onerror = e => { emit('error', e); reject(e); };
      ws.onclose = () => {
        emit('close');
        ws = null;
      };
    });
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case 'created':
        room = msg.room; isHost = true;
        emit('created', msg.room);
        break;
      case 'joined':
        room = msg.room; isHost = msg.isHost;
        emit('joined', msg);
        break;
      case 'player_join':
        emit('player_join', msg.name);
        break;
      case 'player_leave':
        emit('player_leave', msg.name);
        break;
      case 'start':
        emit('start');
        break;
      case 'input':
        emit('input', msg.input);
        break;
      case 'state':
        emit('state', msg.state);
        break;
      case 'error':
        emit('error', msg.msg);
        break;
      case 'chat':
        emit('chat', msg);
        break;
    }
  }

  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }

  function createRoom() { send({ type: 'create', name: Storage.get().nickname }); }
  function joinRoom(code) { send({ type: 'join', room: code.toUpperCase(), name: Storage.get().nickname }); }
  function sendInput(input) { send({ type: 'input', input }); }
  function sendState(state) { send({ type: 'state', state }); }
  function startGame() { send({ type: 'start' }); }
  function leaveRoom() { send({ type: 'leave' }); room = ''; isHost = false; }

  function disconnect() {
    if (ws) { try { ws.close(); } catch (e) {} ws = null; }
    room = ''; isHost = false;
  }

  function isConnected() { return ws && ws.readyState === WebSocket.OPEN; }

  return {
    connect, createRoom, joinRoom, sendInput, sendState, startGame, leaveRoom, disconnect,
    isConnected, on, emit,
    getRoom: () => room,
    isHost: () => isHost,
  };
})();
