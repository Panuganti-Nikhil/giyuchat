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

  // Keep refs in sync
  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);
  useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);

  // ── Toast helper ──
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
      // Re-authenticate on reconnect
      const savedName = sessionStorage.getItem('cs-username');
      if (savedName && !username) {
        socket.emit('set-username', { username: savedName }, (res) => {
          if (res?.success) {
            setUsername(res.username);
            setIsAuthenticated(true);
            // Rejoin saved rooms
            const savedRooms = JSON.parse(sessionStorage.getItem('cs-rooms') || '[]');
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

      // Sound notification for messages from others
      if (msg.type === 'user' && msg.sender !== username && soundRef.current) {
        playNotification();
      }
    });

    socket.on('room-update', ({ roomCode, members, backgroundUrl }) => {
      setMembersByRoom(prev => ({ ...prev, [roomCode]: members }));
      if (backgroundUrl !== undefined) {
        setRooms(prev => prev.map(r => r.code === roomCode ? { ...r, backgroundUrl } : r));
      }
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

  // ── Save to session storage ──
  useEffect(() => {
    if (username) sessionStorage.setItem('cs-username', username);
  }, [username]);

  useEffect(() => {
    if (rooms.length > 0) sessionStorage.setItem('cs-rooms', JSON.stringify(rooms));
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
      showToast(`Welcome, ${res.username}!`, 'success');
    });
  };

  const handleCreateRoom = (roomName, isPublic = false) => {
    socketRef.current?.emit('create-room', { roomName, isPublic }, (res) => {
      if (res?.error) return showToast(res.error, 'error');
      setRooms(prev => [...prev, res.room]);
      setMessagesByRoom(prev => ({ ...prev, [res.room.code]: res.messages || [] }));
      setActiveRoom(res.room.code);
      if (soundRef.current) playJoin();
      showToast(`Room "${res.room.name}" created! Code: ${res.room.code}`, 'success');
    });
  };

  const handleJoinRoom = (code) => {
    if (rooms.find(r => r.code === code)) {
      setActiveRoom(code);
      return;
    }
    socketRef.current?.emit('join-room', { roomCode: code }, (res) => {
      if (res?.error) return showToast(res.error, 'error');
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
    socketRef.current?.emit('send-message', { roomCode: activeRoom, text }, (res) => {
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
    sessionStorage.removeItem('cs-username');
    sessionStorage.removeItem('cs-rooms');
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
          sidebarOpen={sidebarOpen}
          onToggleSidebar={setSidebarOpen}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] toast">
          <div className={`px-5 py-3 rounded-xl shadow-2xl backdrop-blur-xl text-sm font-medium
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
