import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { ThemeProvider } from './context/ThemeContext';
import Home from './pages/Home';
import Chat from './components/Chat';
import { playNotification, playJoin } from './utils/sounds';

const SERVER_URL = import.meta.env.MODE === 'development' ? 'http://localhost:3001' : window.location.origin;

export default function App() {
  // ── Core State ──
  const [username, setUsername] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messagesByRoom, setMessagesByRoom] = useState({});
  const [membersByRoom, setMembersByRoom] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const socketRef = useRef(null);
  const activeRoomRef = useRef(activeRoom);
  const soundRef = useRef(soundEnabled);

  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);
  useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Socket Setup ──
  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
      // Try token-based auth first
      const savedToken = localStorage.getItem('giyu-token');
      if (savedToken) {
        socket.emit('auth-token', { token: savedToken }, (res) => {
          if (res?.success) {
            setUsername(res.username);
            setIsAuthenticated(true);
            // Rejoin saved rooms
            const savedRooms = JSON.parse(localStorage.getItem('giyu-rooms') || '[]');
            savedRooms.forEach(room => {
              socket.emit('join-room', { roomCode: room.code }, (jr) => {
                if (jr?.success) {
                  setRooms(prev => {
                    if (prev.find(r => r.code === jr.room.code)) return prev;
                    return [...prev, jr.room];
                  });
                  setMessagesByRoom(prev => ({ ...prev, [jr.room.code]: jr.messages || [] }));
                }
              });
            });
          } else {
            // Token invalid, clear it
            localStorage.removeItem('giyu-token');
          }
        });
      }
    });

    // ── Real-time Events ──
    socket.on('new-message', (msg) => {
      setMessagesByRoom(prev => {
        const roomMsgs = prev[msg.roomCode] || [];
        if (roomMsgs.find(m => m.id === msg.id)) return prev;
        return { ...prev, [msg.roomCode]: [...roomMsgs, msg] };
      });

      if (msg.type === 'user' && msg.sender !== username && soundRef.current) {
        playNotification();
      }
    });

    socket.on('room-update', ({ roomCode, members, backgroundUrl, pinnedMessageId }) => {
      setMembersByRoom(prev => ({ ...prev, [roomCode]: members }));
      setRooms(prev => prev.map(r => {
        if (r.code !== roomCode) return r;
        const updates = {};
        if (backgroundUrl !== undefined) updates.backgroundUrl = backgroundUrl;
        if (pinnedMessageId !== undefined) updates.pinnedMessageId = pinnedMessageId;
        return { ...r, ...updates };
      }));
    });

    socket.on('message-updated', ({ roomCode, messageId, updates }) => {
      setMessagesByRoom(prev => {
        const roomMsgs = prev[roomCode];
        if (!roomMsgs) return prev;
        return {
          ...prev,
          [roomCode]: roomMsgs.map(m => m.id === messageId ? { ...m, ...updates } : m),
        };
      });
    });

    socket.on('message-deleted', ({ roomCode, messageId }) => {
      setMessagesByRoom(prev => {
        const roomMsgs = prev[roomCode];
        if (!roomMsgs) return prev;
        return {
          ...prev,
          [roomCode]: roomMsgs.filter(m => m.id !== messageId),
        };
      });
    });

    socket.on('message-reaction', ({ roomCode, messageId, reactions }) => {
      setMessagesByRoom(prev => {
        const roomMsgs = prev[roomCode];
        if (!roomMsgs) return prev;
        return {
          ...prev,
          [roomCode]: roomMsgs.map(m => m.id === messageId ? { ...m, reactions } : m),
        };
      });
    });

    socket.on('messages-expired', ({ roomCode, messageIds }) => {
      setMessagesByRoom(prev => {
        const roomMsgs = prev[roomCode];
        if (!roomMsgs) return prev;
        return {
          ...prev,
          [roomCode]: roomMsgs.filter(m => !messageIds.includes(m.id)),
        };
      });
    });

    socket.on('burner-update', ({ roomCode, burnerMode }) => {
      setRooms(prev => prev.map(r => r.code === roomCode ? { ...r, burnerMode } : r));
    });

    socket.on('user-typing', ({ roomCode, username: typingUser }) => {
      setTypingUsers(prev => {
        const current = prev[roomCode] || [];
        if (current.includes(typingUser)) return prev;
        return { ...prev, [roomCode]: [...current, typingUser] };
      });
    });

    socket.on('user-stop-typing', ({ roomCode, username: typingUser }) => {
      setTypingUsers(prev => {
        const current = prev[roomCode] || [];
        return { ...prev, [roomCode]: current.filter(u => u !== typingUser) };
      });
    });

    socket.on('kicked', ({ roomCode, by }) => {
      setRooms(prev => prev.filter(r => r.code !== roomCode));
      setMessagesByRoom(prev => { const n = { ...prev }; delete n[roomCode]; return n; });
      setMembersByRoom(prev => { const n = { ...prev }; delete n[roomCode]; return n; });
      if (activeRoomRef.current === roomCode) setActiveRoom(null);
      showToast(`You were kicked from the room by ${by}`, 'error');
    });

    socket.on('disconnect', () => console.log('Disconnected'));

    return () => { socket.disconnect(); };
  }, []); // eslint-disable-line

  // ── Save to localStorage ──
  useEffect(() => {
    if (rooms.length > 0) localStorage.setItem('giyu-rooms', JSON.stringify(rooms));
    else localStorage.removeItem('giyu-rooms');
  }, [rooms]);

  // ── Dashboard polling ──
  useEffect(() => {
    if (!activeRoom) return;
    const fetchStats = () => {
      socketRef.current?.emit('get-dashboard', { roomCode: activeRoom }, (res) => {
        if (res?.success) setDashboardData(res.stats);
      });
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [activeRoom]);

  // ── Handlers ──
  const handleLogin = (name) => {
    socketRef.current?.emit('set-username', { username: name }, (res) => {
      if (res?.error) return showToast(res.error, 'error');
      setUsername(res.username);
      setIsAuthenticated(true);
      // Save the token for persistence
      if (res.token) localStorage.setItem('giyu-token', res.token);
      showToast(`Welcome, ${res.username}!`, 'success');
    });
  };

  const handleCreateRoom = (roomName, isPublic = false, pin = null, tags = [], announcementOnly = false) => {
    socketRef.current?.emit('create-room', { roomName, isPublic, pin, tags, announcementOnly }, (res) => {
      if (res?.error) return showToast(res.error, 'error');
      setRooms(prev => [...prev, res.room]);
      setMessagesByRoom(prev => ({ ...prev, [res.room.code]: res.messages || [] }));
      setActiveRoom(res.room.code);
      if (soundRef.current) playJoin();
      showToast(`Room "${res.room.name}" created! Code: ${res.room.code}`, 'success');
    });
  };

  const handleJoinRoom = (code, pin = null) => {
    if (rooms.find(r => r.code === code)) {
      setActiveRoom(code);
      return;
    }
    socketRef.current?.emit('join-room', { roomCode: code, pin }, (res) => {
      if (res?.error) {
        if (res.needsPin) return showToast('This room requires a PIN', 'error');
        return showToast(res.error, 'error');
      }
      setRooms(prev => {
        if (prev.find(r => r.code === res.room.code)) return prev;
        return [...prev, res.room];
      });
      setMessagesByRoom(prev => ({ ...prev, [res.room.code]: res.messages || [] }));
      setActiveRoom(res.room.code);
      if (soundRef.current) playJoin();
      showToast(`Joined "${res.room.name}"!`, 'success');
    });
  };

  const handleLeaveRoom = (roomCode) => {
    socketRef.current?.emit('leave-room', { roomCode }, (res) => {
      if (res?.error) return showToast(res.error, 'error');
      setRooms(prev => prev.filter(r => r.code !== roomCode));
      setMessagesByRoom(prev => { const n = { ...prev }; delete n[roomCode]; return n; });
      setMembersByRoom(prev => { const n = { ...prev }; delete n[roomCode]; return n; });
      if (activeRoom === roomCode) setActiveRoom(rooms.length > 1 ? rooms.find(r => r.code !== roomCode)?.code : null);
    });
  };

  const handleSendMessage = (text) => {
    if (!activeRoom) return;
    // Return a promise so MessageArea can track delivery
    return new Promise((resolve) => {
      socketRef.current?.emit('send-message', { roomCode: activeRoom, text }, (res) => {
        if (res?.error) { showToast(res.error, 'error'); resolve(false); }
        else resolve(res.delivered || false);
      });
    });
  };

  const handleSetColor = (color) => {
    socketRef.current?.emit('set-color', { color }, (res) => {
      if (res?.error) showToast(res.error, 'error');
      else showToast(`Name color set to ${res.color}!`, 'success');
    });
  };

  const handlePingTest = () => {
    return new Promise((resolve) => {
      const start = Date.now();
      socketRef.current?.emit('ping-test', {}, (res) => {
        const latency = Date.now() - start;
        resolve(latency);
      });
    });
  };

  const handleEditMessage = (messageId, newText) => {
    if (!activeRoom) return;
    socketRef.current?.emit('edit-message', { roomCode: activeRoom, messageId, newText }, (res) => {
      if (res?.error) showToast(res.error, 'error');
    });
  };

  const handleDeleteMessage = (messageId) => {
    if (!activeRoom) return;
    socketRef.current?.emit('delete-message', { roomCode: activeRoom, messageId }, (res) => {
      if (res?.error) showToast(res.error, 'error');
    });
  };

  const handlePinMessage = (messageId) => {
    if (!activeRoom) return;
    socketRef.current?.emit('pin-message', { roomCode: activeRoom, messageId }, (res) => {
      if (res?.error) showToast(res.error, 'error');
    });
  };

  const handleHighlightMessage = (messageId) => {
    if (!activeRoom) return;
    socketRef.current?.emit('highlight-message', { roomCode: activeRoom, messageId }, (res) => {
      if (res?.error) showToast(res.error, 'error');
    });
  };

  const handleTyping = () => {
    if (activeRoom) socketRef.current?.emit('typing', { roomCode: activeRoom });
  };

  const handleStopTyping = () => {
    if (activeRoom) socketRef.current?.emit('stop-typing', { roomCode: activeRoom });
  };

  const handleKick = (targetUsername) => {
    if (!activeRoom) return;
    socketRef.current?.emit('kick-user', { roomCode: activeRoom, targetUsername }, (res) => {
      if (res?.error) showToast(res.error, 'error');
    });
  };

  const handlePromote = (targetUsername) => {
    if (!activeRoom) return;
    socketRef.current?.emit('promote-user', { roomCode: activeRoom, targetUsername }, (res) => {
      if (res?.error) showToast(res.error, 'error');
    });
  };

  const handleDemote = (targetUsername) => {
    if (!activeRoom) return;
    socketRef.current?.emit('demote-user', { roomCode: activeRoom, targetUsername }, (res) => {
      if (res?.error) showToast(res.error, 'error');
    });
  };

  const handleTransferOwnership = (targetUsername) => {
    if (!activeRoom) return;
    socketRef.current?.emit('transfer-ownership', { roomCode: activeRoom, targetUsername }, (res) => {
      if (res?.error) showToast(res.error, 'error');
    });
  };

  const handleSetBackground = (url) => {
    if (!activeRoom) return;
    socketRef.current?.emit('set-background', { roomCode: activeRoom, url }, (res) => {
      if (res?.error) showToast(res.error, 'error');
      else showToast('Background updated', 'success');
    });
  };

  const handleReaction = (messageId, emoji) => {
    if (!activeRoom) return;
    socketRef.current?.emit('react-message', { roomCode: activeRoom, messageId, emoji }, (res) => {
      if (res?.error) showToast(res.error, 'error');
    });
  };

  const handleToggleBurner = () => {
    if (!activeRoom) return;
    socketRef.current?.emit('toggle-burner', { roomCode: activeRoom }, (res) => {
      if (res?.error) showToast(res.error, 'error');
      else showToast(res.burnerMode ? '🔥 Burner mode ON' : 'Burner mode OFF', 'success');
    });
  };

  const handleChangeUsername = (newUsername) => {
    socketRef.current?.emit('change-username', { newUsername }, (res) => {
      if (res?.error) return showToast(res.error, 'error');
      setUsername(res.username);
      showToast('Username changed successfully', 'success');
    });
  };

  const handleSignOut = () => {
    rooms.forEach(r => { socketRef.current?.emit('leave-room', { roomCode: r.code }); });
    setUsername('');
    setIsAuthenticated(false);
    setRooms([]);
    setActiveRoom(null);
    setMessagesByRoom({});
    setMembersByRoom({});
    localStorage.removeItem('giyu-token');
    localStorage.removeItem('giyu-rooms');
    showToast('Signed out', 'success');
  };

  return (
    <ThemeProvider>
      {!isAuthenticated || rooms.length === 0 ? (
        <Home
          username={username}
          isAuthenticated={isAuthenticated}
          onLogin={handleLogin}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          socket={socketRef.current}
        />
      ) : (
        <Chat
          username={username}
          rooms={rooms}
          activeRoom={activeRoom}
          messagesByRoom={messagesByRoom}
          membersByRoom={membersByRoom}
          typingUsers={typingUsers}
          showDashboard={showDashboard}
          dashboardData={dashboardData}
          soundEnabled={soundEnabled}
          onSelectRoom={setActiveRoom}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={handleLeaveRoom}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
          onToggleDashboard={() => setShowDashboard(p => !p)}
          onToggleSound={() => setSoundEnabled(p => !p)}
          onKick={handleKick}
          onPromote={handlePromote}
          onDemote={handleDemote}
          onTransferOwnership={handleTransferOwnership}
          onChangeUsername={handleChangeUsername}
          onSignOut={handleSignOut}
          onSetBackground={handleSetBackground}
          onReaction={handleReaction}
          onToggleBurner={handleToggleBurner}
          onSetColor={handleSetColor}
          onPingTest={handlePingTest}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onPinMessage={handlePinMessage}
          onHighlightMessage={handleHighlightMessage}
          socket={socketRef.current}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={setSidebarOpen}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] toast">
          <div className={`px-5 py-3   text-sm font-medium
            ${toast.type === 'error'
              ? 'bg-red-500/20 border border-red-500/30 text-red-300'
              : toast.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
              : 'bg-white/10 border border-white/10 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}
