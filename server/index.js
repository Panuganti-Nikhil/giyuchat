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
  pingInterval: 25000,
  pingTimeout: 60000,
});

// ── In-Memory Stores ──
const rooms = new Map();
const messages = new Map();
const socketData = new Map();
const rateLimits = new Map();
const userTokens = new Map();  // token -> { username, createdAt }

const MAX_MESSAGES = 100;
const RATE_WINDOW = 3000;
const RATE_MAX = 5;

// ── Profanity Filter ──
const PROFANITY_LIST = [
  'fuck','shit','bitch','ass','dick','damn','bastard','crap',
  'piss','slut','whore','cock','nigger','nigga','faggot','retard',
  'cunt','motherfucker','asshole','bullshit','dumbass','jackass',
];

function filterProfanity(text) {
  let filtered = text;
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  }
  return filtered;
}

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

// ── Burner cleanup intervals per room ──
const burnerIntervals = new Map();

function startBurnerInterval(code) {
  if (burnerIntervals.has(code)) return;
  const interval = setInterval(() => {
    const room = rooms.get(code);
    if (!room || !room.burnerMode) {
      clearInterval(interval);
      burnerIntervals.delete(code);
      return;
    }
    const now = Date.now();
    const roomMsgs = messages.get(code);
    if (!roomMsgs) return;
    const expired = [];
    const remaining = [];
    for (const msg of roomMsgs) {
      if (msg.type === 'user' && now - msg.timestamp > 30000) {
        expired.push(msg.id);
      } else {
        remaining.push(msg);
      }
    }
    if (expired.length > 0) {
      messages.set(code, remaining);
      io.to(code).emit('messages-expired', { roomCode: code, messageIds: expired });
    }
  }, 5000);
  burnerIntervals.set(code, interval);
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

  // ── Token-based Auth (persistent username) ──
  socket.on('auth-token', ({ token }, cb) => {
    if (!token || typeof token !== 'string') return cb({ error: 'Invalid token.' });
    const saved = userTokens.get(token);
    if (!saved) return cb({ error: 'Token expired or invalid.' });

    // Check if username is currently in use by another socket
    for (let [id, sData] of socketData.entries()) {
      if (id !== socket.id && sData.username?.toLowerCase() === saved.username.toLowerCase()) {
        // Force disconnect the old socket
        const oldSocket = io.sockets.sockets.get(id);
        if (oldSocket) oldSocket.disconnect(true);
        socketData.delete(id);
        break;
      }
    }

    socketData.get(socket.id).username = saved.username;
    cb({ success: true, username: saved.username });
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

    // Generate a persistent token
    const token = uuidv4();
    userTokens.set(token, { username: clean, createdAt: Date.now() });

    cb({ success: true, username: clean, token });
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

    // Update token mapping
    for (const [token, td] of userTokens.entries()) {
      if (td.username === oldName) {
        td.username = clean;
        break;
      }
    }
    
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

  socket.on('create-room', ({ roomName, isPublic, pin, tags }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb({ error: 'Set username first.' });
    const name = sanitize(roomName);
    if (!name || name.length < 2 || name.length > 50) return cb({ error: 'Room name must be 2-50 characters.' });

    let code = generateCode();
    while (rooms.has(code)) code = generateCode();

    const visibility = isPublic ? 'public' : 'private';
    const roomPin = (isPublic && pin && /^\d{4}$/.test(pin)) ? pin : null;
    const roomTags = Array.isArray(tags) ? tags.filter(t => typeof t === 'string').slice(0, 3).map(t => sanitize(t).slice(0, 20)) : [];

    rooms.set(code, {
      name, code, owner: data.username,
      admins: new Set(),
      members: new Map([[data.username, { socketId: socket.id, online: true, joinedAt: Date.now() }]]),
      createdAt: Date.now(),
      totalMessages: 0,
      messageCounts: new Map([[data.username, 0]]),
      backgroundUrl: null,
      visibility,
      pin: roomPin,
      tags: roomTags,
      burnerMode: false,
      peakOnline: 1,
    });
    messages.set(code, []);
    data.rooms.add(code);
    socket.join(code);

    cb({ success: true, room: { name, code, role: 'owner', backgroundUrl: null, visibility, hasPin: !!roomPin, tags: roomTags, burnerMode: false }, messages: [] });
    io.to(code).emit('room-update', { roomCode: code, members: getRoomMembers(code), backgroundUrl: null });
  });

  // ── List public rooms ──
  socket.on('list-public-rooms', (_, cb) => {
    const publicRooms = [];
    for (const [code, room] of rooms.entries()) {
      if (room.visibility === 'public') {
        const onlineCount = Array.from(room.members.values()).filter(m => m.online).length;
        publicRooms.push({
          code,
          name: room.name,
          owner: room.owner,
          memberCount: room.members.size,
          onlineCount,
          createdAt: room.createdAt,
          hasPin: !!room.pin,
          tags: room.tags || [],
        });
      }
    }
    publicRooms.sort((a, b) => b.onlineCount - a.onlineCount);
    cb({ success: true, rooms: publicRooms });
  });

  socket.on('join-room', ({ roomCode, pin }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb({ error: 'Set username first.' });
    const code = roomCode?.toUpperCase()?.trim();
    const room = rooms.get(code);
    if (!room) return cb({ error: 'Room not found. Check the code.' });

    // Check PIN for protected public rooms
    if (room.pin && !room.members.has(data.username)) {
      if (!pin || pin !== room.pin) return cb({ error: 'This room requires a 4-digit PIN to enter.', needsPin: true });
    }

    const isRejoining = room.members.has(data.username);
    room.members.set(data.username, { socketId: socket.id, online: true, joinedAt: Date.now() });
    if (!room.messageCounts.has(data.username)) room.messageCounts.set(data.username, 0);

    data.rooms.add(code);
    socket.join(code);

    // Track peak online
    const currentOnline = Array.from(room.members.values()).filter(m => m.online).length;
    if (currentOnline > (room.peakOnline || 0)) room.peakOnline = currentOnline;

    const role = room.owner === data.username ? 'owner' : room.admins.has(data.username) ? 'admin' : 'member';
    cb({ success: true, room: { name: room.name, code, role, backgroundUrl: room.backgroundUrl, burnerMode: room.burnerMode, tags: room.tags || [] }, messages: messages.get(code) || [] });

    io.to(code).emit('room-update', { roomCode: code, members: getRoomMembers(code), backgroundUrl: room.backgroundUrl });
    if (!isRejoining) emitSystem(code, `${data.username} joined the room`);
  });

  socket.on('send-message', ({ roomCode, text }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb?.({ error: 'Not authenticated.' });
    if (isRateLimited(socket.id)) return cb?.({ error: 'Slow down! Too many messages.' });

    const room = rooms.get(roomCode);
    if (!room || !room.members.has(data.username)) return cb?.({ error: 'Not in this room.' });

    let clean = sanitize(text);
    if (!clean) return cb?.({ error: 'Empty message.' });

    // Apply profanity filter
    clean = filterProfanity(clean);

    const msg = { id: uuidv4(), sender: data.username, text: clean, timestamp: Date.now(), type: 'user', roomCode, reactions: {} };
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

  // ── Reactions ──
  socket.on('react-message', ({ roomCode, messageId, emoji }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb?.({ error: 'Not authenticated.' });
    const room = rooms.get(roomCode);
    if (!room || !room.members.has(data.username)) return cb?.({ error: 'Not in this room.' });

    const allowedEmojis = ['❤️', '👍', '😂', '😮', '😢', '🔥'];
    if (!allowedEmojis.includes(emoji)) return cb?.({ error: 'Invalid reaction.' });

    const roomMsgs = messages.get(roomCode);
    const msg = roomMsgs?.find(m => m.id === messageId);
    if (!msg) return cb?.({ error: 'Message not found.' });

    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

    const idx = msg.reactions[emoji].indexOf(data.username);
    if (idx > -1) {
      msg.reactions[emoji].splice(idx, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    } else {
      msg.reactions[emoji].push(data.username);
    }

    io.to(roomCode).emit('message-reaction', { roomCode, messageId, reactions: msg.reactions });
    cb?.({ success: true });
  });

  // ── Burner Mode Toggle ──
  socket.on('toggle-burner', ({ roomCode }, cb) => {
    const data = socketData.get(socket.id);
    if (!data?.username) return cb?.({ error: 'Not authenticated.' });
    const room = rooms.get(roomCode);
    if (!room) return cb?.({ error: 'Room not found.' });
    if (room.owner !== data.username && !room.admins.has(data.username)) return cb?.({ error: 'Not authorized.' });

    room.burnerMode = !room.burnerMode;
    if (room.burnerMode) {
      startBurnerInterval(roomCode);
      emitSystem(roomCode, `🔥 Burner mode ON — messages disappear after 30s`);
    } else {
      emitSystem(roomCode, `Burner mode OFF — messages will persist`);
    }
    io.to(roomCode).emit('burner-update', { roomCode, burnerMode: room.burnerMode });
    cb?.({ success: true, burnerMode: room.burnerMode });
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
      if (burnerIntervals.has(roomCode)) {
        clearInterval(burnerIntervals.get(roomCode));
        burnerIntervals.delete(roomCode);
      }
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
          peakOnline: room.peakOnline || 0,
          burnerMode: room.burnerMode || false,
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
