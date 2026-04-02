import { useState, useEffect } from 'react';
import { MessageCircle, Plus, LogIn, Sparkles, ArrowRight, Globe, Key, Users, Clock, ArrowLeft, Search, RefreshCw, Lock, Tag, Shield, Megaphone } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const TAG_OPTIONS = ['Gaming', 'Study', 'Emergency', 'Chill', 'Work', 'Music', 'Anime', 'Tech'];

export default function Home({ onLogin, onCreateRoom, onJoinRoom, username, isAuthenticated, socket }) {
  const { isDark } = useTheme();
  const [nameInput, setNameInput] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pin, setPin] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [announcementOnly, setAnnouncementOnly] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('create');
  const [joinMode, setJoinMode] = useState(null);
  const [publicRooms, setPublicRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [joinPin, setJoinPin] = useState('');
  const [pinRoom, setPinRoom] = useState(null);

  const handleLogin = () => {
    if (!nameInput.trim()) return setError('Enter a username');
    if (nameInput.trim().length < 2) return setError('At least 2 characters');
    setError('');
    onLogin(nameInput.trim());
  };

  const handleCreate = () => {
    if (!roomName.trim()) return setError('Enter a room name');
    if (pinEnabled && !/^\d{4}$/.test(pin)) return setError('PIN must be exactly 4 digits');
    setError('');
    onCreateRoom(roomName.trim(), isPublic, pinEnabled ? pin : null, selectedTags, announcementOnly);
    setRoomName('');
    setPin('');
    setSelectedTags([]);
    setAnnouncementOnly(false);
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return setError('Enter a room code');
    setError('');
    onJoinRoom(roomCode.trim().toUpperCase());
    setRoomCode('');
  };

  const handleJoinPublic = (room) => {
    if (room.hasPin) {
      setPinRoom(room);
      setJoinPin('');
    } else {
      onJoinRoom(room.code);
    }
  };

  const handlePinSubmit = () => {
    if (!joinPin || joinPin.length !== 4) return setError('Enter the 4-digit PIN');
    setError('');
    onJoinRoom(pinRoom.code, joinPin);
    setPinRoom(null);
    setJoinPin('');
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
    );
  };

  const fetchPublicRooms = () => {
    if (!socket) return;
    setLoadingRooms(true);
    socket.emit('list-public-rooms', {}, (res) => {
      setLoadingRooms(false);
      if (res?.success) setPublicRooms(res.rooms);
    });
  };

  useEffect(() => {
    if (joinMode === 'global' && socket) fetchPublicRooms();
  }, [joinMode, socket]);

  const filteredRooms = publicRooms.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
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
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] -top-60 -left-60 animate-glow" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px] -bottom-40 -right-40 animate-glow-delayed" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-btn mb-4 shadow-lg shadow-violet-500/20">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold gradient-text tracking-tight">Giyu Chat</h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Private & Public rooms · Ultra-lightweight</p>
        </div>

        <div className={`rounded-3xl p-6 sm:p-8 shadow-2xl ${isDark ? 'glass' : 'glass-light'}`}>
          {!isAuthenticated ? (
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
                      ? 'bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-violet-500/50'
                      : 'bg-black/5 border border-black/10 text-slate-900 placeholder-slate-400 focus:border-violet-500/50'
                    }`}
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button id="login-btn" onClick={handleLogin}
                className="w-full py-3.5 rounded-xl gradient-btn text-white font-semibold flex items-center justify-center gap-2 text-base">
                <Sparkles className="w-4 h-4" /> Get Started
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`text-center py-2.5 rounded-xl ${isDark ? 'bg-white/5' : 'bg-violet-50'}`}>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Logged in as</p>
                <p className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>{username}</p>
              </div>

              {/* PIN Entry Modal */}
              {pinRoom && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPinRoom(null)}
                      className={`flex items-center gap-1 text-sm font-medium ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      <Shield className="w-4 h-4 inline mr-1" />Enter PIN for "{pinRoom.name}"
                    </h3>
                  </div>
                  <input type="text" value={joinPin} onChange={e => { setJoinPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                    placeholder="4-digit PIN" maxLength={4}
                    className={`w-full px-4 py-3 rounded-xl outline-none transition-all tracking-[0.5em] text-center font-mono text-xl
                      ${isDark ? 'bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-violet-500/50'
                        : 'bg-black/5 border border-black/10 text-slate-900 placeholder-slate-400 focus:border-violet-500/50'}`} />
                  <button onClick={handlePinSubmit}
                    className="w-full py-3 rounded-xl gradient-btn text-white font-semibold flex items-center justify-center gap-2">
                    Unlock & Join <ArrowRight className="w-4 h-4" />
                  </button>
                  {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                </div>
              )}

              {!pinRoom && (
                <>
                  {/* Tabs */}
                  <div className={`flex rounded-xl p-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                    <button onClick={() => { setTab('create'); setJoinMode(null); setError(''); }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                        ${tab === 'create' ? 'gradient-btn text-white shadow-md' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                      <Plus className="w-4 h-4" /> Create
                    </button>
                    <button onClick={() => { setTab('join'); setError(''); }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                        ${tab === 'join' ? 'gradient-btn text-white shadow-md' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                      <LogIn className="w-4 h-4" /> Join
                    </button>
                  </div>

                  {tab === 'create' ? (
                    <div className="space-y-3">
                      <input id="room-name-input" type="text" value={roomName}
                        onChange={e => { setRoomName(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        placeholder="Room name (e.g. Dev Team)" maxLength={50}
                        className={`w-full px-4 py-3 rounded-xl outline-none transition-all
                          ${isDark ? 'bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-violet-500/50'
                            : 'bg-black/5 border border-black/10 text-slate-900 placeholder-slate-400 focus:border-violet-500/50'}`} />

                      {/* Public/Private Toggle */}
                      <div className={`flex rounded-xl p-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                        <button onClick={() => { setIsPublic(false); setPinEnabled(false); }}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                            ${!isPublic ? 'bg-violet-600 text-white shadow-md' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                          <Key className="w-3.5 h-3.5" /> Private
                        </button>
                        <button onClick={() => setIsPublic(true)}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                            ${isPublic ? 'bg-emerald-600 text-white shadow-md' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                          <Globe className="w-3.5 h-3.5" /> Public
                        </button>
                      </div>

                      {isPublic && (
                        <>
                          {/* PIN protection toggle */}
                          <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                            <div className="flex items-center gap-2">
                              <Lock className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                              <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>PIN Protected</span>
                            </div>
                            <button onClick={() => setPinEnabled(!pinEnabled)}
                              className={`w-10 h-5 rounded-full flex items-center transition-all ${pinEnabled ? 'bg-amber-500 justify-end' : isDark ? 'bg-white/10 justify-start' : 'bg-black/10 justify-start'}`}>
                              <div className="w-4 h-4 bg-white rounded-full mx-0.5 shadow" />
                            </button>
                          </div>

                          {pinEnabled && (
                            <input type="text" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="Set 4-digit PIN" maxLength={4}
                              className={`w-full px-4 py-2.5 rounded-xl outline-none transition-all tracking-[0.3em] text-center font-mono
                                ${isDark ? 'bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-amber-500/50'
                                  : 'bg-black/5 border border-black/10 text-slate-900 placeholder-slate-400 focus:border-amber-500/50'}`} />
                          )}

                          {/* Tags */}
                          <div>
                            <p className={`text-xs font-medium mb-2 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              <Tag className="w-3 h-3" /> Tags (max 3)
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {TAG_OPTIONS.map(tag => (
                                <button key={tag} onClick={() => toggleTag(tag)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                                    ${selectedTags.includes(tag)
                                      ? 'bg-violet-600 text-white'
                                      : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-black/5 text-slate-500 hover:bg-black/10'
                                    }`}>
                                  {tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <p className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {isPublic
                          ? pinEnabled ? '🔐 Listed publicly but requires PIN to enter' : '🌐 Anyone can find and join this room'
                          : '🔒 Only people with the code can join'}
                      </p>

                      {/* Announcement Room Toggle */}
                      <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${announcementOnly ? 'bg-blue-500/10 border border-blue-500/20' : isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                        <div className="flex items-center gap-2">
                          <Megaphone className={`w-4 h-4 ${announcementOnly ? 'text-blue-400' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                          <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Announcement Only</span>
                        </div>
                        <button onClick={() => setAnnouncementOnly(!announcementOnly)}
                          className={`w-10 h-5 rounded-full flex items-center transition-all ${announcementOnly ? 'bg-blue-500 justify-end' : isDark ? 'bg-white/10 justify-start' : 'bg-black/10 justify-start'}`}>
                          <div className="w-4 h-4 bg-white rounded-full mx-0.5 shadow" />
                        </button>
                      </div>

                      <button id="create-room-btn" onClick={handleCreate}
                        className="w-full py-3 rounded-xl gradient-btn text-white font-semibold flex items-center justify-center gap-2">
                        Create Room <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {joinMode === null ? (
                        <div className="space-y-3">
                          <button onClick={() => setJoinMode('global')}
                            className={`w-full py-4 rounded-xl border transition-all flex items-center gap-4 px-4
                              ${isDark ? 'bg-white/5 border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5'
                                : 'bg-black/5 border-black/10 hover:border-emerald-500/40 hover:bg-emerald-50'}`}>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                              <Globe className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div className="text-left">
                              <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Search Global</p>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Browse public rooms</p>
                            </div>
                          </button>
                          <button onClick={() => setJoinMode('code')}
                            className={`w-full py-4 rounded-xl border transition-all flex items-center gap-4 px-4
                              ${isDark ? 'bg-white/5 border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5'
                                : 'bg-black/5 border-black/10 hover:border-violet-500/40 hover:bg-violet-50'}`}>
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
                        <div className="space-y-3">
                          <button onClick={() => setJoinMode(null)}
                            className={`flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                            <ArrowLeft className="w-3.5 h-3.5" /> Back
                          </button>
                          <input id="room-code-input" type="text" value={roomCode}
                            onChange={e => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleJoin()}
                            placeholder="Enter 6-character code" maxLength={6}
                            className={`w-full px-4 py-3 rounded-xl outline-none transition-all tracking-[0.3em] text-center font-mono text-lg
                              ${isDark ? 'bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-violet-500/50'
                                : 'bg-black/5 border border-black/10 text-slate-900 placeholder-slate-400 focus:border-violet-500/50'}`} />
                          <button id="join-room-btn" onClick={handleJoin}
                            className="w-full py-3 rounded-xl gradient-btn text-white font-semibold flex items-center justify-center gap-2">
                            Join Room <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setJoinMode(null); setSearchQuery(''); }}
                              className={`flex items-center gap-1 text-sm font-medium flex-shrink-0 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                              <ArrowLeft className="w-3.5 h-3.5" /> Back
                            </button>
                            <h3 className={`font-semibold text-sm flex-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>Public Rooms</h3>
                            <button onClick={fetchPublicRooms} disabled={loadingRooms}
                              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 hover:bg-black/10'} ${loadingRooms ? 'animate-spin' : ''}`}>
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </div>

                          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                            <Search className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                              placeholder="Search rooms or tags..."
                              className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`} />
                          </div>

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
                                <button key={room.code} onClick={() => handleJoinPublic(room)}
                                  className={`w-full p-3 rounded-xl border transition-all text-left group
                                    ${isDark ? 'bg-white/3 border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5'
                                      : 'bg-white border-black/5 hover:border-violet-500/30 hover:bg-violet-50'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <p className={`font-semibold text-sm truncate flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                      {room.hasPin && <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                                      {room.name}
                                    </p>
                                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 flex-shrink-0 ml-2">
                                      JOIN
                                    </span>
                                  </div>
                                  {(room.tags || []).length > 0 && (
                                    <div className="flex gap-1 mb-1">
                                      {room.tags.map(t => (
                                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400">{t}</span>
                                      ))}
                                    </div>
                                  )}
                                  <div className={`flex items-center gap-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {room.onlineCount}/{room.memberCount}</span>
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTimeAgo(room.createdAt)}</span>
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
                </>
              )}
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
