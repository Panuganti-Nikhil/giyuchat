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
    if (role === 'admin') return <Shield className="w-3.5 h-3.5 text-[#FF00C8]" />;
    return <User className="w-3.5 h-3.5 text-[#7B5EA0]" />;
  };

  if (!room) return null;

  return (
    <div className={`relative px-4 py-3 flex items-center justify-between border-b
      ${isDark
        ? 'bg-[#0B0616]/80 backdrop-blur-xl border-[#A100FF]/10'
        : 'bg-[#0E0820]/80 backdrop-blur-xl border-[#A100FF]/15'}`}
    >
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <button
          onClick={onToggleSidebar}
          className="p-2 shrink-0 lg:hidden rounded-xl hover:bg-[#A100FF]/10 text-[#F5E9FF] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-semibold truncate text-[#F5E9FF]">{room.name}</h2>
            <button onClick={copyCode} className="flex items-center shrink-0 gap-1 px-2 py-0.5 rounded-lg text-xs font-mono
              bg-[#A100FF]/8 text-[#BFA6D9] hover:bg-[#A100FF]/15 border border-[#A100FF]/10 transition-all">
              {room.code}
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#BFA6D9]">
            <span className="w-2 h-2 rounded-full neon-online-dot" />
            {onlineCount} online · {members.length} members
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onToggleRightPanel('members')}
          className={`p-2 rounded-xl transition-all ${showRightPanel === 'members'
            ? 'bg-[#A100FF]/20 text-[#A100FF] shadow-[0_0_10px_rgba(161,0,255,0.2)]'
            : 'hover:bg-[#A100FF]/10 text-[#BFA6D9]'
          }`}
          title="Members"
        >
          <Users className="w-4 h-4" />
        </button>
        <button
          onClick={() => onToggleRightPanel('settings')}
          className={`p-2 rounded-xl transition-all ${showRightPanel === 'settings'
            ? 'bg-[#FF00C8]/20 text-[#FF00C8] shadow-[0_0_10px_rgba(255,0,200,0.2)]'
            : 'hover:bg-[#A100FF]/10 text-[#BFA6D9]'
          }`}
          title="Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
