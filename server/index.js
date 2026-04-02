const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// ── In-Memory Stores ──
const rooms = new Map();       // code -> { name, code, owner, admins, members, createdAt, totalMessages, messageCounts }
const messages = new Map();    // code -> [{ id, sender, text, timestamp, type }]
const socketData = new Map();  // socketId -> { username, rooms, sessionStart, messagesSent, lastActive }
const rateLimits = new Map();  // socketId -> [timestamps]

const MAX_MESSAGES = 100;
const RATE_WINDOW = 3000;
const RATE_MAX = 5;

// ── Helpers ──
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
    .slice(0, 2000);
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function isRateLimited(sid) {
  const now = Date.now();
  const ts = (rateLimits.get(sid) || []).filter(t => now - t < RATE_WINDOW);
  rateLimits.set(sid, ts);
  if (ts.length >= RATE_MAX) return true;
  ts.push(now);
  return false;
}

function getRoomMembers(code) {
  const room = rooms.get(code);
  if (!room) return [];
  return Array.from(room.members.entries()).map(([username, d]) => ({
    username,
    role: room.owner === username ? 'owner' : room.admins.has(username) ? 'admin' : 'member',
    online: d.online,
  }));
}

function getLeaderboard(code) {
  const room = rooms.get(code);
  if (!room) return [];
  return Array.from(room.messageCounts.entries())
    .map(([username, count]) => ({ username, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function emitSystem(code, text) {
  const msg = { id: uuidv4(), text, type: 'system', timestamp: Date.now(), roomCode: code };
  const roomMsgs = messages.get(code);
  if (roomMsgs) {
    roomMsgs.push(msg);
    if (roomMsgs.length > MAX_MESSAGES) roomMsgs.shift();
  }
  io.to(code).emit('new-message', msg);
}

// ── Socket Handling ──
io.on('connection', (socket) => {
  console.log(`+ connected: ${socket.id}`);
  socketData.set(socket.id, {
    username: null,
    rooms: new Set(),
    sessionStart: Date.now(),
    messagesSent: 0,
    lastActive: Date.now(),
  });

  socket.on('set-username', ({ username }, cb) => {
    const clean = sanitize(username);
    if (!/^[A-Za-z0-9]{2,20}$/.test(clean)) return cb({ error: 'Username must be 2-20 alphanumeric characters, no spaces or symbols.' });
    
    for (let [id, sData] of socketData.entries()) {
      if (id !== socket.id && sData.username?.toLowerCase() === clean.toLowerCase()) {
        return cb({ error: 'Username is already taken.' });
      }
    }
    
    socketData.get(socket.id).username = clean;
    cb({ success: true, username: clean });
  });
  
  socket.on('change-username', ({ newUsername }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb?.({ error: 'Not authenticated.' });
    
    const clean = sanitize(newUsername);
    if (!/^[A-Za-z0-9]{2,20}$/.test(clean)) return cb({ error: 'Username must be 2-20 alphanumeric characters, no spaces or symbols.' });
    
    if (clean.toLowerCase() === data.username.toLowerCase() && clean !== data.username) {
        // just a case change, which is fine
    } else {
      for (let [id, sData] of socketData.entries()) {
        if (id !== socket.id && sData.username?.toLowerCase() === clean.toLowerCase()) {
          return cb({ error: 'Username is already taken.' });
        }
      }
    }
    
    const oldName = data.username;
    data.username = clean;
    
    for (const code of data.rooms) {
      const room = rooms.get(code);
      if (room) {
        if (room.owner === oldName) room.owner = clean;
        if (room.admins.has(oldName)) { room.admins.delete(oldName); room.admins.add(clean); }
        
        const memberData = room.members.get(oldName);
        if (memberData) {
           room.members.delete(oldName);
           room.members.set(clean, memberData);
        }
        
        const count = room.messageCounts.get(oldName) || 0;
        room.messageCounts.delete(oldName);
        room.messageCounts.set(clean, count);
        
        const roomMsgs = messages.get(code);
        if (roomMsgs) {
           roomMsgs.forEach(m => { if (m.sender === oldName) m.sender = clean; });
        }
        
        emitSystem(code, `${oldName} changed their name to ${clean}`);
        io.to(code).emit('room-update', { roomCode: code, members: getRoomMembers(code), backgroundUrl: room.backgroundUrl });
      }
    }
    
    cb({ success: true, username: clean });
  });

  socket.on('create-room', ({ roomName }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb({ error: 'Set username first.' });
    const name = sanitize(roomName);
    if (!name || name.length < 2 || name.length > 50) return cb({ error: 'Room name must be 2-50 characters.' });

    let code = generateCode();
    while (rooms.has(code)) code = generateCode();

    rooms.set(code, {
      name, code, owner: data.username,
      admins: new Set(),
      members: new Map([[data.username, { socketId: socket.id, online: true, joinedAt: Date.now() }]]),
      createdAt: Date.now(),
      totalMessages: 0,
      messageCounts: new Map([[data.username, 0]]),
      backgroundUrl: null,
    });
    messages.set(code, []);
    data.rooms.add(code);
    socket.join(code);

    cb({ success: true, room: { name, code, role: 'owner', backgroundUrl: null }, messages: [] });
    io.to(code).emit('room-update', { roomCode: code, members: getRoomMembers(code), backgroundUrl: null });
  });

  socket.on('join-room', ({ roomCode }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb({ error: 'Set username first.' });
    const code = roomCode?.toUpperCase()?.trim();
    const room = rooms.get(code);
    if (!room) return cb({ error: 'Room not found. Check the code.' });

    const isRejoining = room.members.has(data.username);
    room.members.set(data.username, { socketId: socket.id, online: true, joinedAt: Date.now() });
    if (!room.messageCounts.has(data.username)) room.messageCounts.set(data.username, 0);

    data.rooms.add(code);
    socket.join(code);

    const role = room.owner === data.username ? 'owner' : room.admins.has(data.username) ? 'admin' : 'member';
    cb({ success: true, room: { name: room.name, code, role, backgroundUrl: room.backgroundUrl }, messages: messages.get(code) || [] });

    io.to(code).emit('room-update', { roomCode: code, members: getRoomMembers(code), backgroundUrl: room.backgroundUrl });
    if (!isRejoining) emitSystem(code, `${data.username} joined the room`);
  });

  socket.on('send-message', ({ roomCode, text }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb?.({ error: 'Not authenticated.' });
    if (isRateLimited(socket.id)) return cb?.({ error: 'Slow down! Too many messages.' });

    const room = rooms.get(roomCode);
    if (!room || !room.members.has(data.username)) return cb?.({ error: 'Not in this room.' });

    const clean = sanitize(text);
    if (!clean) return cb?.({ error: 'Empty message.' });

    const msg = { id: uuidv4(), sender: data.username, text: clean, timestamp: Date.now(), type: 'user', roomCode };
    const roomMsgs = messages.get(roomCode);
    roomMsgs.push(msg);
    if (roomMsgs.length > MAX_MESSAGES) roomMsgs.shift();

    room.totalMessages++;
    room.messageCounts.set(data.username, (room.messageCounts.get(data.username) || 0) + 1);
    data.messagesSent++;
    data.lastActive = Date.now();

    io.to(roomCode).emit('new-message', msg);
    cb?.({ success: true });
  });

  socket.on('typing', ({ roomCode }) => {
    const data = socketData.get(socket.id);
    if (data?.username) socket.to(roomCode).emit('user-typing', { roomCode, username: data.username });
  });

  socket.on('stop-typing', ({ roomCode }) => {
    const data = socketData.get(socket.id);
    if (data?.username) socket.to(roomCode).emit('user-stop-typing', { roomCode, username: data.username });
  });

  socket.on('kick-user', ({ roomCode, targetUsername }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb?.({ error: 'Not authenticated.' });
    const room = rooms.get(roomCode);
    if (!room) return cb?.({ error: 'Room not found.' });

    const isOwner = room.owner === data.username;
    const isAdmin = room.admins.has(data.username);
    if (!isOwner && !isAdmin) return cb?.({ error: 'Not authorized.' });
    if (targetUsername === room.owner) return cb?.({ error: 'Cannot kick the owner.' });
    if (isAdmin && room.admins.has(targetUsername)) return cb?.({ error: 'Admins cannot kick other admins.' });

    const target = room.members.get(targetUsername);
    if (!target) return cb?.({ error: 'User not in room.' });

    room.members.delete(targetUsername);
    room.admins.delete(targetUsername);

    if (target.socketId) {
      const ts = io.sockets.sockets.get(target.socketId);
      if (ts) {
        ts.leave(roomCode);
        ts.emit('kicked', { roomCode, by: data.username });
        const td = socketData.get(target.socketId);
        if (td) td.rooms.delete(roomCode);
      }
    }

    io.to(roomCode).emit('room-update', { roomCode, members: getRoomMembers(roomCode), backgroundUrl: room.backgroundUrl });
    emitSystem(roomCode, `${targetUsername} was kicked by ${data.username}`);
    cb?.({ success: true });
  });

  socket.on('promote-user', ({ roomCode, targetUsername }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb?.({ error: 'Not authenticated.' });
    const room = rooms.get(roomCode);
    if (!room) return cb?.({ error: 'Room not found.' });
    if (room.owner !== data.username && !room.admins.has(data.username)) return cb?.({ error: 'Only owner/admins can promote.' });
    if (!room.members.has(targetUsername)) return cb?.({ error: 'User not in room.' });
    if (targetUsername === room.owner) return cb?.({ error: 'Cannot change owner role.' });

    room.admins.add(targetUsername);
    io.to(roomCode).emit('room-update', { roomCode, members: getRoomMembers(roomCode), backgroundUrl: room.backgroundUrl });
    emitSystem(roomCode, `${targetUsername} was promoted to admin`);
    cb?.({ success: true });
  });

  socket.on('demote-user', ({ roomCode, targetUsername }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb?.({ error: 'Not authenticated.' });
    const room = rooms.get(roomCode);
    if (!room) return cb?.({ error: 'Room not found.' });
    if (room.owner !== data.username) return cb?.({ error: 'Only owner can demote.' });
    if (!room.admins.has(targetUsername)) return cb?.({ error: 'User is not an admin.' });

    room.admins.delete(targetUsername);
    io.to(roomCode).emit('room-update', { roomCode, members: getRoomMembers(roomCode), backgroundUrl: room.backgroundUrl });
    emitSystem(roomCode, `${targetUsername} was demoted to member`);
    cb?.({ success: true });
  });

  socket.on('transfer-ownership', ({ roomCode, targetUsername }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb?.({ error: 'Not authenticated.' });
    const room = rooms.get(roomCode);
    if (!room) return cb?.({ error: 'Room not found.' });
    if (room.owner !== data.username) return cb?.({ error: 'Only owner can transfer ownership.' });
    if (!room.members.has(targetUsername)) return cb?.({ error: 'User not in room.' });
    if (targetUsername === room.owner) return cb?.({ error: 'Already the owner.' });

    room.owner = targetUsername;
    room.admins.add(data.username);
    io.to(roomCode).emit('room-update', { roomCode, members: getRoomMembers(roomCode), backgroundUrl: room.backgroundUrl });
    emitSystem(roomCode, `${targetUsername} is now the room owner`);
    cb?.({ success: true });
  });

  socket.on('set-background', ({ roomCode, url }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb?.({ error: 'Not authenticated.' });
    const room = rooms.get(roomCode);
    if (!room) return cb?.({ error: 'Room not found.' });
    if (room.owner !== data.username && !room.admins.has(data.username)) return cb?.({ error: 'Not authorized to change background.' });
    
    room.backgroundUrl = url || null;
    io.to(roomCode).emit('room-update', { roomCode, members: getRoomMembers(roomCode), backgroundUrl: room.backgroundUrl });
    emitSystem(roomCode, `${data.username} updated the room background`);
    cb?.({ success: true });
  });

  socket.on('leave-room', ({ roomCode }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb?.({ error: 'Not authenticated.' });
    const room = rooms.get(roomCode);
    if (!room) return cb?.({ error: 'Room not found.' });

    room.members.delete(data.username);
    room.admins.delete(data.username);
    data.rooms.delete(roomCode);
    socket.leave(roomCode);

    if (room.members.size === 0) {
      rooms.delete(roomCode);
      messages.delete(roomCode);
    } else {
      io.to(roomCode).emit('room-update', { roomCode, members: getRoomMembers(roomCode), backgroundUrl: room.backgroundUrl });
      emitSystem(roomCode, `${data.username} left the room`);
    }
    cb?.({ success: true });
  });

  socket.on('get-dashboard', ({ roomCode }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb?.({ error: 'Not authenticated.' });
    const room = rooms.get(roomCode);

    cb?.({
      success: true,
      stats: {
        username: data.username,
        timeOnline: Date.now() - data.sessionStart,
        messagesSent: data.messagesSent,
        lastActive: data.lastActive,
        activeStreak: Math.floor((Date.now() - data.sessionStart) / 60000),
        roomStats: room ? {
          name: room.name,
          totalMessages: room.totalMessages,
          onlineCount: Array.from(room.members.values()).filter(m => m.online).length,
          memberCount: room.members.size,
        } : null,
        leaderboard: room ? getLeaderboard(roomCode) : [],
      },
    });
  });

  socket.on('disconnect', () => {
    const data = socketData.get(socket.id);
    if (data?.username) {
      for (const code of data.rooms) {
        const room = rooms.get(code);
        if (room) {
          const member = room.members.get(data.username);
          if (member) { member.online = false; member.socketId = null; }
          io.to(code).emit('room-update', { roomCode: code, members: getRoomMembers(code), backgroundUrl: room.backgroundUrl });
        }
      }
    }
    socketData.delete(socket.id);
    rateLimits.delete(socket.id);
    console.log(`- disconnected: ${socket.id}`);
  });
});

// Serve static files from React build if running in production
app.use(express.static(path.join(__dirname, '../client/dist')));

// Catch-all to serve index.html for React Router (if requested)
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/socket.io') || req.url.startsWith('/health')) return next();
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', rooms: rooms.size }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`✨ Giyu Chat server running on port ${PORT}`));
