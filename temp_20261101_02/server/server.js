/* ============================================================
 * server.js —— 欢乐对战屋 联机 WebSocket 服务器 + 静态网页托管
 * 功能：房间创建 / 加入 / 状态转发 / 输入转发 / 托管游戏网页
 * ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const os = require('os');

const PORT = process.env.PORT || 8080;
// 静态文件根目录：server.js 在 server/ 下，网页在上级目录
const ROOT = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const filePath = path.join(ROOT, url);
  // 防止目录穿越
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + url);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

// 房间存储: roomCode -> { host: ws, guest: ws, hostName, guestName }
const rooms = new Map();

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

function send(ws, obj) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function getRoomOf(ws) {
  for (const [code, room] of rooms) {
    if (room.host === ws || room.guest === ws) return { code, room };
  }
  return null;
}

wss.on('connection', (ws) => {
  ws.name = '玩家';

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }

    switch (msg.type) {
      case 'create': {
        const code = genCode();
        ws.name = msg.name || '玩家';
        rooms.set(code, { host: ws, guest: null, hostName: ws.name, guestName: '' });
        ws.currentRoom = code;
        send(ws, { type: 'created', room: code });
        console.log(`[房间] ${ws.name} 创建房间 ${code}`);
        break;
      }

      case 'join': {
        const code = (msg.room || '').toUpperCase();
        const room = rooms.get(code);
        if (!room) { send(ws, { type: 'error', msg: '房间不存在' }); return; }
        if (room.guest) { send(ws, { type: 'error', msg: '房间已满' }); return; }
        ws.name = msg.name || '玩家';
        room.guest = ws;
        room.guestName = ws.name;
        ws.currentRoom = code;
        send(ws, { type: 'joined', room: code, isHost: false });
        // 通知房主有玩家加入
        send(room.host, { type: 'player_join', name: ws.name });
        console.log(`[房间] ${ws.name} 加入房间 ${code}`);
        break;
      }

      case 'start': {
        const r = getRoomOf(ws);
        if (!r) return;
        const { room } = r;
        if (room.host !== ws) return; // 只有房主能开始
        if (!room.guest) { send(ws, { type: 'error', msg: '对手还未加入' }); return; }
        send(room.host, { type: 'start' });
        send(room.guest, { type: 'start' });
        console.log(`[房间] ${r.code} 开始游戏`);
        break;
      }

      case 'input': {
        // 客户端输入转发给房主
        const r = getRoomOf(ws);
        if (!r) return;
        const { room } = r;
        if (ws === room.guest) {
          send(room.host, { type: 'input', input: msg.input });
        }
        break;
      }

      case 'state': {
        // 房主状态转发给客户端
        const r = getRoomOf(ws);
        if (!r) return;
        const { room } = r;
        if (ws === room.host && room.guest) {
          send(room.guest, { type: 'state', state: msg.state });
        }
        break;
      }

      case 'leave': {
        handleLeave(ws);
        break;
      }
    }
  });

  ws.on('close', () => {
    handleLeave(ws);
  });
});

function handleLeave(ws) {
  const r = getRoomOf(ws);
  if (!r) return;
  const { code, room } = r;
  if (ws === room.host) {
    // 房主离开：通知客户端，销毁房间
    if (room.guest) send(room.guest, { type: 'error', msg: '房主已离开，房间关闭' });
    rooms.delete(code);
    console.log(`[房间] ${code} 已销毁（房主离开）`);
  } else if (ws === room.guest) {
    // 客户端离开：通知房主
    send(room.host, { type: 'player_leave', name: room.guestName });
    room.guest = null;
    room.guestName = '';
    console.log(`[房间] ${code} 对手离开`);
  }
}

// 打印局域网IP
function getLocalIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name in nets) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

server.listen(PORT, () => {
  console.log('========================================');
  console.log('  🎮 欢乐对战屋 联机服务器已启动');
  console.log('========================================');
  console.log(`  本地访问:  ws://localhost:${PORT}`);
  getLocalIPs().forEach(ip => {
    console.log(`  局域网访问: ws://${ip}:${PORT}`);
  });
  console.log('  按 Ctrl+C 停止');
  console.log('========================================');
});
