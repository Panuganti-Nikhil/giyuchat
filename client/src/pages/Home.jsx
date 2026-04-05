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
    <div className={`min-h-[100dvh] flex items-center justify-center relative overflow-hidden ${isDark ? 'bg-app-dark' : 'bg-app-light'}`}>
      {/* Floating neon orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] blur-[140px] -top-60 -left-60 animate-glow" />
        <div className="absolute w-[500px] h-[500px] blur-[120px] -bottom-40 -right-40 animate-glow-delayed" />
        <div className="absolute w-[300px] h-[300px] blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]" style={{background: 'radial-gradient(circle, #FF4DFF, transparent 70%)'}} />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up home-sharp">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 premium-btn mb-4 glow-pulse">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold premium-text tracking-tight">Giyu Chat</h1>
          <p className={`mt-2 ${isDark ? 'text-[#BFA6D9]' : 'text-[#BFA6D9]'}`}>Private & Public rooms · Ultra-lightweight</p>
        </div>

        {/* Main Card — Sharp edges */}
        <div className={`p-6 sm:p-8 ${isDark ? 'glass-sharp' : 'glass-sharp-light'}`}>
          {!isAuthenticated ? (
            <div className="space-y-5">
              <div>
                <label className={`text-sm font-medium mb-2 block ${isDark ? 'text-[#BFA6D9]' : 'text-[#BFA6D9]'}`}>
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
                  className={`w-full px-4 py-3.5 outline-none transition-all text-base
                    ${isDark
                      ? 'bg-[#A100FF]/5 border border-[#A100FF]/15 text-[#F5E9FF] placeholder-[#7B5EA0] focus:border-[#A100FF]/50'
                      : 'bg-[#A100FF]/8 border border-[#A100FF]/20 text-[#F5E9FF] placeholder-[#7B5EA0] focus:border-[#A100FF]/50'
                    }`}
                />
              </div>
              {error && <p className="text-[#FF4DFF] text-sm">{error}</p>}
              <button id="login-btn" onClick={handleLogin}
                className="w-full py-3.5 premium-btn text-white font-semibold flex items-center justify-center gap-2 text-base">
                <Sparkles className="w-4 h-4" /> Get Started
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`text-center py-2.5 ${isDark ? 'bg-[#A100FF]/8 border border-[#A100FF]/15' : 'bg-[#A100FF]/10 border border-[#A100FF]/20'}`}>
                <p className="text-xs text-[#BFA6D9]">Logged in as</p>
                <p className="font-bold text-base text-[#F5E9FF]">{username}</p>
              </div>

              {/* PIN Entry Modal */}
              {pinRoom && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPinRoom(null)}
                      className="flex items-center gap-1 text-sm font-medium text-[#BFA6D9] hover:text-[#F5E9FF] transition-colors">
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <h3 className="font-semibold text-sm text-[#F5E9FF]">
                      <Shield className="w-4 h-4 inline mr-1" />Enter PIN for "{pinRoom.name}"
                    </h3>
                  </div>
                  <input type="text" value={joinPin} onChange={e => { setJoinPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                    placeholder="4-digit PIN" maxLength={4}
                    className={`w-full px-4 py-3 outline-none transition-all tracking-[0.5em] text-center font-mono text-xl
                      bg-[#A100FF]/5 border border-[#A100FF]/15 text-[#F5E9FF] placeholder-[#7B5EA0] focus:border-[#A100FF]/50`} />
                  <button onClick={handlePinSubmit}
                    className="w-full py-3 premium-btn text-white font-semibold flex items-center justify-center gap-2">
                    Unlock & Join <ArrowRight className="w-4 h-4" />
                  </button>
                  {error && <p className="text-[#FF4DFF] text-sm text-center">{error}</p>}
                </div>
              )}

              {!pinRoom && (
                <>
                  {/* Tabs */}
                  <div className="flex p-1 bg-[#A100FF]/5">
                    <button onClick={() => { setTab('create'); setJoinMode(null); setError(''); }}
                      className={`flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2
                        ${tab === 'create' ? 'premium-btn text-white' : 'text-[#BFA6D9] hover:text-[#F5E9FF]'}`}>
                      <Plus className="w-4 h-4" /> Create
                    </button>
                    <button onClick={() => { setTab('join'); setError(''); }}
                      className={`flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2
                        ${tab === 'join' ? 'premium-btn text-white' : 'text-[#BFA6D9] hover:text-[#F5E9FF]'}`}>
                      <LogIn className="w-4 h-4" /> Join
                    </button>
                  </div>

                  {tab === 'create' ? (
                    <div className="space-y-3">
                      <input id="room-name-input" type="text" value={roomName}
                        onChange={e => { setRoomName(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        placeholder="Room name (e.g. Dev Team)" maxLength={50}
                        className="w-full px-4 py-3 outline-none transition-all bg-[#A100FF]/5 border border-[#A100FF]/15 text-[#F5E9FF] placeholder-[#7B5EA0] focus:border-[#A100FF]/50" />

                      {/* Public/Private Toggle */}
                      <div className="flex p-1 bg-[#A100FF]/5">
                        <button onClick={() => { setIsPublic(false); setPinEnabled(false); }}
                          className={`flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2
                            ${!isPublic ? 'bg-[#A100FF] text-white shadow-[0_0_12px_rgba(161,0,255,0.3)]' : 'text-[#BFA6D9] hover:text-[#F5E9FF]'}`}>
                          <Key className="w-3.5 h-3.5" /> Private
                        </button>
                        <button onClick={() => setIsPublic(true)}
                          className={`flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2
                            ${isPublic ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'text-[#BFA6D9] hover:text-[#F5E9FF]'}`}>
                          <Globe className="w-3.5 h-3.5" /> Public
                        </button>
                      </div>

                      {isPublic && (
                        <>
                          {/* PIN protection toggle */}
                          <div className="flex items-center justify-between px-3 py-2 bg-[#A100FF]/5">
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-amber-400" />
                              <span className="text-sm text-[#BFA6D9]">PIN Protected</span>
                            </div>
                            <button onClick={() => setPinEnabled(!pinEnabled)}
                              className={`w-10 h-5 rounded-full flex items-center transition-all ${pinEnabled ? 'bg-amber-500 justify-end' : 'bg-[#A100FF]/15 justify-start'}`}>
                              <div className="w-4 h-4 bg-white rounded-full mx-0.5" />
                            </button>
                          </div>

                          {pinEnabled && (
                            <input type="text" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="Set 4-digit PIN" maxLength={4}
                              className="w-full px-4 py-2.5 outline-none transition-all tracking-[0.3em] text-center font-mono bg-[#A100FF]/5 border border-[#A100FF]/15 text-[#F5E9FF] placeholder-[#7B5EA0] focus:border-amber-500/50" />
                          )}

                          {/* Tags */}
                          <div>
                            <p className="text-xs font-medium mb-2 flex items-center gap-1 text-[#BFA6D9]">
                              <Tag className="w-3 h-3" /> Tags (max 3)
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {TAG_OPTIONS.map(tag => (
                                <button key={tag} onClick={() => toggleTag(tag)}
                                  className={`px-2.5 py-1 text-xs font-medium transition-all
                                    ${selectedTags.includes(tag)
                                      ? 'bg-[#A100FF] text-white shadow-[0_0_8px_rgba(161,0,255,0.3)]'
                                      : 'bg-[#A100FF]/5 text-[#BFA6D9] hover:bg-[#A100FF]/10 hover:text-[#F5E9FF]'
                                    }`}>
                                  {tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <p className="text-xs text-center text-[#7B5EA0]">
                        {isPublic
                          ? pinEnabled ? '🔐 Listed publicly but requires PIN to enter' : '🌐 Anyone can find and join this room'
                          : '🔒 Only people with the code can join'}
                      </p>

                      {/* Announcement Room Toggle */}
                      <div className={`flex items-center justify-between px-3 py-2 ${announcementOnly ? 'bg-[#FF00C8]/10 border border-[#FF00C8]/20' : 'bg-[#A100FF]/5'}`}>
                        <div className="flex items-center gap-2">
                          <Megaphone className={`w-4 h-4 ${announcementOnly ? 'text-[#FF00C8]' : 'text-[#BFA6D9]'}`} />
                          <span className="text-sm text-[#BFA6D9]">Announcement Only</span>
                        </div>
                        <button onClick={() => setAnnouncementOnly(!announcementOnly)}
                          className={`w-10 h-5 rounded-full flex items-center transition-all ${announcementOnly ? 'bg-[#FF00C8] justify-end shadow-[0_0_10px_rgba(255,0,200,0.3)]' : 'bg-[#A100FF]/15 justify-start'}`}>
                          <div className="w-4 h-4 bg-white rounded-full mx-0.5" />
                        </button>
                      </div>

                      <button id="create-room-btn" onClick={handleCreate}
                        className="w-full py-3 premium-btn text-white font-semibold flex items-center justify-center gap-2">
                        Create Room <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {joinMode === null ? (
                        <div className="space-y-3">
                          <button onClick={() => setJoinMode('global')}
                            className="w-full py-4 border transition-all flex items-center gap-4 px-4 bg-[#A100FF]/5 border-[#A100FF]/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 neon-card-hover">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                              <Globe className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-sm text-[#F5E9FF]">Search Global</p>
                              <p className="text-xs text-[#BFA6D9]">Browse public rooms</p>
                            </div>
                          </button>
                          <button onClick={() => setJoinMode('code')}
                            className="w-full py-4 border transition-all flex items-center gap-4 px-4 bg-[#A100FF]/5 border-[#A100FF]/10 hover:border-[#A100FF]/40 hover:bg-[#A100FF]/5 neon-card-hover">
                            <div className="w-10 h-10 rounded-xl bg-[#A100FF]/20 flex items-center justify-center flex-shrink-0">
                              <Key className="w-5 h-5 text-[#A100FF]" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-sm text-[#F5E9FF]">Join with Code</p>
                              <p className="text-xs text-[#BFA6D9]">Enter a private room code</p>
                            </div>
                          </button>
                        </div>
                      ) : joinMode === 'code' ? (
                        <div className="space-y-3">
                          <button onClick={() => setJoinMode(null)}
                            className="flex items-center gap-1.5 text-sm font-medium text-[#BFA6D9] hover:text-[#F5E9FF] transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5" /> Back
                          </button>
                          <input id="room-code-input" type="text" value={roomCode}
                            onChange={e => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleJoin()}
                            placeholder="Enter 6-character code" maxLength={6}
                            className="w-full px-4 py-3 outline-none transition-all tracking-[0.3em] text-center font-mono text-lg bg-[#A100FF]/5 border border-[#A100FF]/15 text-[#F5E9FF] placeholder-[#7B5EA0] focus:border-[#A100FF]/50" />
                          <button id="join-room-btn" onClick={handleJoin}
                            className="w-full py-3 premium-btn text-white font-semibold flex items-center justify-center gap-2">
                            Join Room <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setJoinMode(null); setSearchQuery(''); }}
                              className="flex items-center gap-1 text-sm font-medium flex-shrink-0 text-[#BFA6D9] hover:text-[#F5E9FF] transition-colors">
                              <ArrowLeft className="w-3.5 h-3.5" /> Back
                            </button>
                            <h3 className="font-semibold text-sm flex-1 text-[#F5E9FF]">Public Rooms</h3>
                            <button onClick={fetchPublicRooms} disabled={loadingRooms}
                              className={`p-1.5 transition-colors text-[#BFA6D9] hover:text-[#F5E9FF] hover:bg-[#A100FF]/10 rounded-lg ${loadingRooms ? 'animate-spin' : ''}`}>
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 px-3 py-2 border bg-[#A100FF]/5 border-[#A100FF]/10">
                            <Search className="w-4 h-4 flex-shrink-0 text-[#7B5EA0]" />
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                              placeholder="Search rooms or tags..."
                              className="flex-1 bg-transparent outline-none text-sm text-[#F5E9FF] placeholder-[#7B5EA0]" />
                          </div>

                          <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                            {loadingRooms ? (
                              <div className="text-center py-8 text-[#7B5EA0]">
                                <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" />
                                <p className="text-sm">Loading rooms...</p>
                              </div>
                            ) : filteredRooms.length === 0 ? (
                              <div className="text-center py-8 text-[#7B5EA0]">
                                <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-medium">No public rooms found</p>
                                <p className="text-xs mt-1">Be the first to create one!</p>
                              </div>
                            ) : (
                              filteredRooms.map(room => (
                                <button key={room.code} onClick={() => handleJoinPublic(room)}
                                  className="w-full p-3 border transition-all text-left group bg-[#A100FF]/3 border-[#A100FF]/8 hover:border-[#A100FF]/30 hover:bg-[#A100FF]/8 neon-card-hover">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="font-semibold text-sm truncate flex items-center gap-1.5 text-[#F5E9FF]">
                                      {room.hasPin && <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                                      {room.name}
                                    </p>
                                    <span className="text-xs font-mono px-1.5 py-0.5 bg-[#A100FF]/20 text-[#A100FF] flex-shrink-0 ml-2">
                                      JOIN
                                    </span>
                                  </div>
                                  {(room.tags || []).length > 0 && (
                                    <div className="flex gap-1 mb-1">
                                      {room.tags.map(t => (
                                        <span key={t} className="text-[10px] px-1.5 py-0.5 bg-[#A100FF]/10 text-[#A100FF]">{t}</span>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-3 text-xs text-[#7B5EA0]">
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
                  {error && <p className="text-[#FF4DFF] text-sm text-center">{error}</p>}
                </>
              )}
            </div>
          )}
        </div>

        <p className="text-center mt-6 text-xs text-[#7B5EA0]">
          End-to-end private · No data stored permanently · Open source
        </p>
      </div>
    </div>
  );
}
