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

function StatCard({ icon: Icon, title, value, color, isDark }) {
  const colorMap = {
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400',
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/20 text-cyan-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400',
    rose: 'from-rose-500/20 to-rose-600/10 border-rose-500/20 text-rose-400',
  };
  const c = colorMap[color] || colorMap.violet;

  return (
    <div className={` p-5 border bg-gradient-to-br ${c} animate-fade-in`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10  bg-${color}-500/20 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.split(' ').pop()}`} />
        </div>
        <div>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
          <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ stats }) {
  const { isDark } = useTheme();

  if (!stats) {
    return (
      <div className={`p-4 flex items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        <p>Loading stats...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Your engagement stats for this session</p>

      {/* Stats Grid */}
      <div className="flex flex-col gap-3 mb-6">
        <StatCard icon={Clock} title="Time Online" value={formatDuration(stats.timeOnline)} color="violet" isDark={isDark} />
        <StatCard icon={MessageSquare} title="Messages Sent" value={stats.messagesSent} color="cyan" isDark={isDark} />
        <StatCard icon={Flame} title="Active Streak" value={`${stats.activeStreak} min`} color="amber" isDark={isDark} />
        <StatCard icon={Activity} title="Last Active" value={formatTime(stats.lastActive)} color="emerald" isDark={isDark} />
        {stats.roomStats && (
          <>
            <StatCard icon={MessageSquare} title="Room Messages" value={stats.roomStats.totalMessages} color="blue" isDark={isDark} />
            <StatCard icon={Wifi} title="Online Now" value={`${stats.roomStats.onlineCount} / ${stats.roomStats.memberCount}`} color="rose" isDark={isDark} />
          </>
        )}
      </div>

      {/* Leaderboard */}
      {stats.leaderboard?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className={`w-5 h-5 text-amber-400`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Leaderboard</h3>
          </div>
          <div className="space-y-2">
            {stats.leaderboard.map((entry, i) => (
              <div
                key={entry.username}
                className={`flex items-center gap-3 px-4 py-3  transition-all animate-fade-in
                  ${i === 0 ? 'bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20'
                  : i === 1 ? 'bg-gradient-to-r from-slate-400/10 to-transparent border border-slate-400/10'
                  : i === 2 ? 'bg-gradient-to-r from-orange-600/10 to-transparent border border-orange-600/10'
                  : isDark ? 'bg-white/3 border border-white/5' : 'bg-black/3 border border-black/5'
                  }`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className={`text-lg font-extrabold w-7 text-center
                  ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-500' : isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div className={`w-8 h-8  flex items-center justify-center text-xs font-bold
                  ${entry.username === stats.username ? 'bg-violet-500/30 text-violet-300' : isDark ? 'bg-white/5 text-slate-400' : 'bg-black/5 text-slate-500'}`}>
                  {entry.username[0].toUpperCase()}
                </div>
                <span className={`flex-1 font-medium text-sm ${isDark ? 'text-white' : 'text-slate-800'}
                  ${entry.username === stats.username ? 'text-violet-400' : ''}`}>
                  {entry.username} {entry.username === stats.username && '(you)'}
                </span>
                <span className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
