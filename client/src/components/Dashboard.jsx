import { Clock, MessageSquare, Flame, Users, Trophy, Activity, Wifi } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTime(ts) {
  if (!ts) return 'Never';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function StatCard({ icon: Icon, title, value, color }) {
  const colorMap = {
    purple: { bg: 'bg-[#A100FF]/10', border: 'border-[#A100FF]/15', text: 'text-[#A100FF]', glow: 'shadow-[0_0_10px_rgba(161,0,255,0.1)]' },
    pink: { bg: 'bg-[#FF00C8]/10', border: 'border-[#FF00C8]/15', text: 'text-[#FF00C8]', glow: 'shadow-[0_0_10px_rgba(255,0,200,0.1)]' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/15', text: 'text-amber-400', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.1)]' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', text: 'text-emerald-400', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.1)]' },
    blue: { bg: 'bg-[#FF4DFF]/10', border: 'border-[#FF4DFF]/15', text: 'text-[#FF4DFF]', glow: 'shadow-[0_0_10px_rgba(255,77,255,0.1)]' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/15', text: 'text-rose-400', glow: 'shadow-[0_0_10px_rgba(244,63,94,0.1)]' },
  };
  const c = colorMap[color] || colorMap.purple;

  return (
    <div className={`p-5 rounded-2xl border ${c.bg} ${c.border} ${c.glow} animate-fade-in neon-card-hover`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        <div>
          <p className="text-xs text-[#BFA6D9]">{title}</p>
          <p className="text-xl font-bold text-[#F5E9FF]">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ stats }) {
  const { isDark } = useTheme();

  if (!stats) {
    return (
      <div className="p-4 flex items-center justify-center text-[#7B5EA0]">
        <p>Loading stats...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="text-xs mb-4 text-[#BFA6D9]">Your engagement stats for this session</p>

      {/* Stats Grid */}
      <div className="flex flex-col gap-3 mb-6">
        <StatCard icon={Clock} title="Time Online" value={formatDuration(stats.timeOnline)} color="purple" />
        <StatCard icon={MessageSquare} title="Messages Sent" value={stats.messagesSent} color="pink" />
        <StatCard icon={Flame} title="Active Streak" value={`${stats.activeStreak} min`} color="amber" />
        <StatCard icon={Activity} title="Last Active" value={formatTime(stats.lastActive)} color="emerald" />
        {stats.roomStats && (
          <>
            <StatCard icon={MessageSquare} title="Room Messages" value={stats.roomStats.totalMessages} color="blue" />
            <StatCard icon={Wifi} title="Online Now" value={`${stats.roomStats.onlineCount} / ${stats.roomStats.memberCount}`} color="rose" />
          </>
        )}
      </div>

      {/* Leaderboard */}
      {stats.leaderboard?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-[#F5E9FF]">Leaderboard</h3>
          </div>
          <div className="space-y-2">
            {stats.leaderboard.map((entry, i) => (
              <div
                key={entry.username}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all animate-fade-in neon-card-hover
                  ${i === 0 ? 'bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/15 shadow-[0_0_10px_rgba(245,158,11,0.08)]'
                  : i === 1 ? 'bg-gradient-to-r from-[#BFA6D9]/10 to-transparent border border-[#BFA6D9]/10'
                  : i === 2 ? 'bg-gradient-to-r from-orange-600/10 to-transparent border border-orange-600/10'
                  : 'bg-[#A100FF]/3 border border-[#A100FF]/8'
                  }`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className={`text-lg font-extrabold w-7 text-center
                  ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-[#BFA6D9]' : i === 2 ? 'text-orange-500' : 'text-[#7B5EA0]'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  ${entry.username === stats.username ? 'bg-[#A100FF]/25 text-[#A100FF]' : 'bg-[#A100FF]/8 text-[#BFA6D9]'}`}>
                  {entry.username[0].toUpperCase()}
                </div>
                <span className={`flex-1 font-medium text-sm text-[#F5E9FF]
                  ${entry.username === stats.username ? 'text-[#A100FF]' : ''}`}>
                  {entry.username} {entry.username === stats.username && '(you)'}
                </span>
                <span className="text-sm font-semibold text-[#BFA6D9]">
                  {entry.count} msg{entry.count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
