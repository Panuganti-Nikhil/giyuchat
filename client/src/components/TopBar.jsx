import { Users, Settings as SettingsIcon, Menu, Copy, Check, Crown, Shield, User } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function TopBar({ room, members, onToggleRightPanel, showRightPanel, onToggleSidebar }) {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  const onlineCount = members.filter(m => m.online).length;

  const copyCode = () => {
    navigator.clipboard.writeText(room?.code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roleIcon = (role) => {
    if (role === 'owner') return <Crown className="w-3.5 h-3.5 text-amber-400" />;
    if (role === 'admin') return <Shield className="w-3.5 h-3.5 text-cyan-400" />;
    return <User className="w-3.5 h-3.5 text-slate-500" />;
  };

  if (!room) return null;

  return (
    <div className={`relative px-4 py-3 flex items-center justify-between border-b
      ${isDark ? 'glass border-white/5' : 'glass-light border-black/5'}`}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className={`p-2  lg:hidden ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/10 text-slate-700'}`}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{room.name}</h2>
            <button onClick={copyCode} className={`flex items-center gap-1 px-2 py-0.5  text-xs font-mono
              ${isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-black/5 text-slate-500 hover:bg-black/10'}`}>
              {room.code}
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="w-1.5 h-1.5  bg-green-400 animate-pulse" />
            {onlineCount} online · {members.length} members
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onToggleRightPanel('members')}
          className={`p-2  transition-colors ${showRightPanel === 'members'
            ? 'bg-violet-500/20 text-violet-400'
            : isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-black/10 text-slate-500'
          }`}
          title="Members"
        >
          <Users className="w-4 h-4" />
        </button>
        <button
          onClick={() => onToggleRightPanel('settings')}
          className={`p-2  transition-colors ${showRightPanel === 'settings'
            ? 'bg-violet-500/20 text-violet-400'
            : isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-black/10 text-slate-500'
          }`}
          title="Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
