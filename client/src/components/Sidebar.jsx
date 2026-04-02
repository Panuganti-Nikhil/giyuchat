import { Plus, LogIn, Hash, Crown, Shield, LogOut, Copy, Check, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar({ rooms, activeRoom, username, onSelectRoom, onCreateRoom, onJoinRoom, onLeaveRoom, isOpen, onClose }) {
  const { isDark } = useTheme();
  const [mode, setMode] = useState(null); // 'create' | 'join' | null
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(null);

  const handleSubmit = () => {
    if (!input.trim()) return;
    if (mode === 'create') onCreateRoom(input.trim());
    else onJoinRoom(input.trim().toUpperCase());
    setInput('');
    setMode(null);
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const roleIcon = (role) => {
    if (role === 'owner') return <Crown className="w-3 h-3 text-amber-400" />;
    if (role === 'admin') return <Shield className="w-3 h-3 text-cyan-400" />;
    return null;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed lg:relative z-40 h-full w-72 flex flex-col transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isDark ? 'glass border-r border-white/5' : 'glass-light border-r border-black/5'}
      `}>
        {/* Header */}
        <div className={`px-5 py-4 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Giyu Chat</h2>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{username}</p>
            </div>
          </div>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {rooms.length === 0 && (
            <div className={`text-center py-10 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No rooms yet</p>
              <p className="text-xs mt-1">Create or join one below</p>
            </div>
          )}

          {rooms.map(room => (
            <div
              key={room.code}
              onClick={() => { onSelectRoom(room.code); onClose?.(); }}
              className={`group px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200
                ${activeRoom === room.code
                  ? 'glass-active'
                  : isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Hash className={`w-4 h-4 flex-shrink-0 ${activeRoom === room.code ? 'text-violet-400' : isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <span className={`font-medium text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{room.name}</span>
                  {roleIcon(room.role)}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); copyCode(room.code); }}
                    className={`p-1 rounded-md ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                    title="Copy room code"
                  >
                    {copied === room.code ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onLeaveRoom(room.code); }}
                    className="p-1 rounded-md hover:bg-red-500/20"
                    title="Leave room"
                  >
                    <LogOut className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
              <p className={`text-xs ml-6 mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{room.code}</p>
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className={`p-3 border-t space-y-2 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          {mode && (
            <div className="animate-fade-in flex gap-2">
              <input
                autoFocus
                value={input}
                onChange={e => setInput(mode === 'join' ? e.target.value.toUpperCase() : e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder={mode === 'create' ? 'Room name...' : 'Room code...'}
                maxLength={mode === 'create' ? 50 : 6}
                className={`flex-1 px-3 py-2 rounded-lg text-sm outline-none
                  ${isDark
                    ? 'bg-white/5 border border-white/10 text-white placeholder-slate-500'
                    : 'bg-black/5 border border-black/10 text-slate-900 placeholder-slate-400'
                  }`}
              />
              <button onClick={handleSubmit} className="px-3 py-2 rounded-lg gradient-btn text-white text-sm font-medium">Go</button>
              <button onClick={() => { setMode(null); setInput(''); }} className={`px-2 py-2 rounded-lg text-sm ${isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-black/5'}`}>✕</button>
            </div>
          )}

          {!mode && (
            <div className="flex gap-2">
              <button
                id="sidebar-create-btn"
                onClick={() => setMode('create')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all
                  ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-black/5 text-slate-700 hover:bg-black/10'}`}
              >
                <Plus className="w-4 h-4" /> Create
              </button>
              <button
                id="sidebar-join-btn"
                onClick={() => setMode('join')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all
                  ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-black/5 text-slate-700 hover:bg-black/10'}`}
              >
                <LogIn className="w-4 h-4" /> Join
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
