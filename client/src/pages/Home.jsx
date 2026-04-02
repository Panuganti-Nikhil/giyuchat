import { useState } from 'react';
import { MessageCircle, Plus, LogIn, Sparkles, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Home({ onLogin, onCreateRoom, onJoinRoom, username, isAuthenticated }) {
  const { isDark } = useTheme();
  const [nameInput, setNameInput] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('create');

  const handleLogin = () => {
    if (!nameInput.trim()) return setError('Enter a username');
    if (nameInput.trim().length < 2) return setError('At least 2 characters');
    setError('');
    onLogin(nameInput.trim());
  };

  const handleCreate = () => {
    if (!roomName.trim()) return setError('Enter a room name');
    setError('');
    onCreateRoom(roomName.trim());
    setRoomName('');
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return setError('Enter a room code');
    setError('');
    onJoinRoom(roomCode.trim().toUpperCase());
    setRoomCode('');
  };

  return (
    <div className={`min-h-screen flex items-center justify-center relative overflow-hidden ${isDark ? 'bg-app-dark' : 'bg-app-light'}`}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] -top-60 -left-60 animate-glow" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px] -bottom-40 -right-40 animate-glow-delayed" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-cyan-500/8 blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-float" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-btn mb-4 shadow-lg shadow-violet-500/20">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold gradient-text tracking-tight">Giyu Chat</h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Private rooms · Real-time chat · Zero signup</p>
        </div>

        {/* Card */}
        <div className={`rounded-3xl p-8 shadow-2xl ${isDark ? 'glass' : 'glass-light'}`}>
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
            <div className="space-y-5">
              <div className={`text-center py-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-violet-50'}`}>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Logged in as</p>
                <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>{username}</p>
              </div>

              {/* Tabs */}
              <div className={`flex rounded-xl p-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <button
                  onClick={() => { setTab('create'); setError(''); }}
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
                <div className="space-y-3">
                  <input
                    id="room-name-input"
                    type="text"
                    value={roomName}
                    onChange={e => { setRoomName(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    placeholder="Room name (e.g. Dev Team)"
                    maxLength={50}
                    className={`w-full px-4 py-3.5 rounded-xl outline-none transition-all
                      ${isDark
                        ? 'bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-violet-500/50'
                        : 'bg-black/5 border border-black/10 text-slate-900 placeholder-slate-400 focus:border-violet-500/50'
                      }`}
                  />
                  <button
                    id="create-room-btn"
                    onClick={handleCreate}
                    className="w-full py-3.5 rounded-xl gradient-btn text-white font-semibold flex items-center justify-center gap-2"
                  >
                    Create Room <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    id="room-code-input"
                    type="text"
                    value={roomCode}
                    onChange={e => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    placeholder="Enter 6-character code"
                    maxLength={6}
                    className={`w-full px-4 py-3.5 rounded-xl outline-none transition-all tracking-[0.3em] text-center font-mono text-lg
                      ${isDark
                        ? 'bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-violet-500/50'
                        : 'bg-black/5 border border-black/10 text-slate-900 placeholder-slate-400 focus:border-violet-500/50'
                      }`}
                  />
                  <button
                    id="join-room-btn"
                    onClick={handleJoin}
                    className="w-full py-3.5 rounded-xl gradient-btn text-white font-semibold flex items-center justify-center gap-2"
                  >
                    Join Room <ArrowRight className="w-4 h-4" />
                  </button>
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
