import { useState, useEffect } from 'react';
import { MessageCircle, Plus, LogIn, Sparkles, ArrowRight, Globe, Key, Users, Clock, ArrowLeft, Search, RefreshCw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Home({ onLogin, onCreateRoom, onJoinRoom, username, isAuthenticated, socket }) {
  const { isDark } = useTheme();
  const [nameInput, setNameInput] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('create'); // 'create' | 'join'
  const [joinMode, setJoinMode] = useState(null); // null | 'code' | 'global'
  const [publicRooms, setPublicRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogin = () => {
    if (!nameInput.trim()) return setError('Enter a username');
    if (nameInput.trim().length < 2) return setError('At least 2 characters');
    setError('');
    onLogin(nameInput.trim());
  };

  const handleCreate = () => {
    if (!roomName.trim()) return setError('Enter a room name');
    setError('');
    onCreateRoom(roomName.trim(), isPublic);
    setRoomName('');
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return setError('Enter a room code');
    setError('');
    onJoinRoom(roomCode.trim().toUpperCase());
    setRoomCode('');
  };

  const fetchPublicRooms = () => {
    if (!socket) return;
    setLoadingRooms(true);
    socket.emit('list-public-rooms', {}, (res) => {
      setLoadingRooms(false);
      if (res?.success) {
        setPublicRooms(res.rooms);
      }
    });
  };

  useEffect(() => {
    if (joinMode === 'global' && socket) {
      fetchPublicRooms();
    }
  }, [joinMode, socket]);

  const filteredRooms = publicRooms.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimeAgo = (ts) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className={`min-h-screen flex items-center justify-center relative overflow-hidden ${isDark ? 'bg-app-dark' : 'bg-app-light'}`}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] -top-60 -left-60 animate-glow" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px] -bottom-40 -right-40 animate-glow-delayed" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-btn mb-4 shadow-lg shadow-violet-500/20">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold gradient-text tracking-tight">Giyu Chat</h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Private & Public rooms · Ultra-lightweight</p>
        </div>

        {/* Card */}
        <div className={`rounded-3xl p-6 sm:p-8 shadow-2xl ${isDark ? 'glass' : 'glass-light'}`}>
          {!isAuthenticated ? (
            /* Username Entry */
            <div className="space-y-5">
              <div>
                <label className={`text-sm font-medium mb-2 block ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Choose your name
                </label>
                <input
                  id="username-input"
                  type="text"
                  value={nameInput}
                  onChange={e => { setNameInput(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="e.g. Alex"
                  maxLength={20}
                  className={`w-full px-4 py-3.5 rounded-xl outline-none transition-all text-base
                    ${isDark
                      ? 'bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-violet-500/50 focus:bg-white/8'
                      : 'bg-black/5 border border-black/10 text-slate-900 placeholder-slate-400 focus:border-violet-500/50'
                    }`}
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                id="login-btn"
                onClick={handleLogin}
                className="w-full py-3.5 rounded-xl gradient-btn text-white font-semibold flex items-center justify-center gap-2 text-base"
              >
                <Sparkles className="w-4 h-4" /> Get Started
              </button>
            </div>
          ) : (
            /* Room Actions */
            <div className="space-y-4">
              <div className={`text-center py-2.5 rounded-xl ${isDark ? 'bg-white/5' : 'bg-violet-50'}`}>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Logged in as</p>
                <p className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>{username}</p>
              </div>

              {/* Tabs */}
              <div className={`flex rounded-xl p-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <button
                  onClick={() => { setTab('create'); setJoinMode(null); setError(''); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                    ${tab === 'create'
                      ? 'gradient-btn text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <Plus className="w-4 h-4" /> Create
                </button>
                <button
                  onClick={() => { setTab('join'); setError(''); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                    ${tab === 'join'
                      ? 'gradient-btn text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <LogIn className="w-4 h-4" /> Join
                </button>
              </div>

              {tab === 'create' ? (
                /* ── CREATE TAB ── */
                <div className="space-y-3">
                  <input
                    id="room-name-input"
                    type="text"
                    value={roomName}
                    onChange={e => { setRoomName(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    placeholder="Room name (e.g. Dev Team)"
                    maxLength={50}
                    className={`w-full px-4 py-3 rounded-xl outline-none transition-all
                      ${isDark
                        ? 'bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-violet-500/50'
                        : 'bg-black/5 border border-black/10 text-slate-900 placeholder-slate-400 focus:border-violet-500/50'
                      }`}
                  />

                  {/* Public/Private Toggle */}
                  <div className={`flex rounded-xl p-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                    <button
                      onClick={() => setIsPublic(false)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                        ${!isPublic
                          ? 'bg-violet-600 text-white shadow-md'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      <Key className="w-3.5 h-3.5" /> Private
                    </button>
                    <button
                      onClick={() => setIsPublic(true)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                        ${isPublic
                          ? 'bg-emerald-600 text-white shadow-md'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      <Globe className="w-3.5 h-3.5" /> Public
                    </button>
                  </div>

                  <p className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isPublic
                      ? '🌐 Anyone can find and join this room'
                      : '🔒 Only people with the code can join'}
                  </p>

                  <button
                    id="create-room-btn"
                    onClick={handleCreate}
                    className="w-full py-3 rounded-xl gradient-btn text-white font-semibold flex items-center justify-center gap-2"
                  >
                    Create Room <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* ── JOIN TAB ── */
                <div className="space-y-3">
                  {joinMode === null ? (
                    /* Join Mode Selection */
                    <div className="space-y-3">
                      <button
                        onClick={() => setJoinMode('global')}
                        className={`w-full py-4 rounded-xl border transition-all flex items-center gap-4 px-4
                          ${isDark
                            ? 'bg-white/5 border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5'
                            : 'bg-black/5 border-black/10 hover:border-emerald-500/40 hover:bg-emerald-50'
                          }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <Globe className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-left">
                          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Search Global</p>
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Browse public rooms</p>
                        </div>
                      </button>

                      <button
                        onClick={() => setJoinMode('code')}
                        className={`w-full py-4 rounded-xl border transition-all flex items-center gap-4 px-4
                          ${isDark
                            ? 'bg-white/5 border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5'
                            : 'bg-black/5 border-black/10 hover:border-violet-500/40 hover:bg-violet-50'
                          }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                          <Key className="w-5 h-5 text-violet-400" />
                        </div>
                        <div className="text-left">
                          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Join with Code</p>
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Enter a private room code</p>
                        </div>
                      </button>
                    </div>
                  ) : joinMode === 'code' ? (
                    /* Join with Code */
                    <div className="space-y-3">
                      <button
                        onClick={() => setJoinMode(null)}
                        className={`flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                      </button>
                      <input
                        id="room-code-input"
                        type="text"
                        value={roomCode}
                        onChange={e => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleJoin()}
                        placeholder="Enter 6-character code"
                        maxLength={6}
                        className={`w-full px-4 py-3 rounded-xl outline-none transition-all tracking-[0.3em] text-center font-mono text-lg
                          ${isDark
                            ? 'bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-violet-500/50'
                            : 'bg-black/5 border border-black/10 text-slate-900 placeholder-slate-400 focus:border-violet-500/50'
                          }`}
                      />
                      <button
                        id="join-room-btn"
                        onClick={handleJoin}
                        className="w-full py-3 rounded-xl gradient-btn text-white font-semibold flex items-center justify-center gap-2"
                      >
                        Join Room <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    /* Global Server Browser */
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setJoinMode(null); setSearchQuery(''); }}
                          className={`flex items-center gap-1 text-sm font-medium flex-shrink-0 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Back
                        </button>
                        <h3 className={`font-semibold text-sm flex-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>Public Rooms</h3>
                        <button
                          onClick={fetchPublicRooms}
                          disabled={loadingRooms}
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 hover:bg-black/10'} ${loadingRooms ? 'animate-spin' : ''}`}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Search */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border
                        ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                        <Search className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search rooms..."
                          className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                        />
                      </div>

                      {/* Room List */}
                      <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                        {loadingRooms ? (
                          <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" />
                            <p className="text-sm">Loading rooms...</p>
                          </div>
                        ) : filteredRooms.length === 0 ? (
                          <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-medium">No public rooms found</p>
                            <p className="text-xs mt-1">Be the first to create one!</p>
                          </div>
                        ) : (
                          filteredRooms.map(room => (
                            <button
                              key={room.code}
                              onClick={() => onJoinRoom(room.code)}
                              className={`w-full p-3 rounded-xl border transition-all text-left group
                                ${isDark
                                  ? 'bg-white/3 border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5'
                                  : 'bg-white border-black/5 hover:border-violet-500/30 hover:bg-violet-50'
                                }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                  {room.name}
                                </p>
                                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 flex-shrink-0 ml-2">
                                  JOIN
                                </span>
                              </div>
                              <div className={`flex items-center gap-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" /> {room.onlineCount}/{room.memberCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {formatTimeAgo(room.createdAt)}
                                </span>
                                <span className="truncate">by {room.owner}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            </div>
          )}
        </div>

        <p className={`text-center mt-6 text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          End-to-end private · No data stored permanently · Open source
        </p>
      </div>
    </div>
  );
}
