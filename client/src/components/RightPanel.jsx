import { X, Crown, Shield, User as UserIcon, Moon, Sun, Volume2, VolumeX, Image as ImageIcon, Save, LogOut, BarChart3, Flame } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import Dashboard from './Dashboard';

export default function RightPanel({
  mode, onClose, username, members, userRole, room,
  onKick, onPromote, onDemote, onTransferOwnership,
  soundEnabled, onToggleSound, dashboardData,
  onChangeUsername, onSignOut, onSetBackground, onToggleBurner
}) {
  const { isDark, toggle } = useTheme();
  const [bgInput, setBgInput] = useState(room?.backgroundUrl || '');
  const [nameInput, setNameInput] = useState(username);
  const [transferTarget, setTransferTarget] = useState(null);
  
  if (!mode) return null;

  const roleIcon = (role) => {
    if (role === 'owner') return <Crown className="w-3.5 h-3.5 text-amber-400" />;
    if (role === 'admin') return <Shield className="w-3.5 h-3.5 text-cyan-400" />;
    return <UserIcon className="w-3.5 h-3.5 text-slate-500" />;
  };

  const handleApplyBg = () => {
    // Only apply if there's somewhat of a URL or it's empty
    onSetBackground(bgInput.trim());
  };

  const handleUpdateName = () => {
    if (nameInput.trim() && nameInput.trim() !== username) {
      onChangeUsername(nameInput.trim());
    }
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      
      <div className={`fixed inset-y-0 right-0 lg:relative w-[85vw] lg:w-80 flex flex-col h-full z-50 shadow-2xl border-l
        ${isDark ? 'glass border-white/5 bg-[#0a0a14]/95' : 'glass-light border-black/5 bg-white/95'}
      `}>
        <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {mode === 'members' && `Members (${members.length})`}
          {mode === 'settings' && 'Settings'}
          {mode === 'dashboard' && 'Dashboard'}
        </h3>
        <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-black/10 text-slate-600'}`}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* MEMBERS MODE */}
        {mode === 'members' && (
          <div className="space-y-2">
            {members.map(m => {
              const isSelf = m.username === username;
              const canManage = (userRole === 'owner' || userRole === 'admin') && !isSelf;
              const isOwner = userRole === 'owner';
              
              return (
                <div key={m.username} className={`p-3 rounded-xl border flex flex-col gap-2 
                  ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                        ${m.online ? 'bg-violet-500/30 text-violet-300' : isDark ? 'bg-white/10 text-slate-500' : 'bg-black/10 text-slate-600'}`}>
                        {m.username[0].toUpperCase()}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2
                        ${isDark ? 'border-[#0f0a1a]' : 'border-white'}
                        ${m.online ? 'bg-green-400' : 'bg-slate-500'}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {m.username} {isSelf && <span className="text-xs text-violet-400">(You)</span>}
                      </p>
                      <p className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {roleIcon(m.role)} <span className="capitalize">{m.role}</span>
                      </p>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex flex-wrap gap-1.5 mt-1 border-t border-white/5 pt-2">
                      {isOwner && m.role !== 'admin' && m.role !== 'owner' && (
                         <button onClick={() => onPromote(m.username)} className="text-[10px] px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30">Promote to Admin</button>
                      )}
                      {(isOwner || (userRole === 'admin' && m.role !== 'admin' && m.role !== 'owner')) && (
                         <button onClick={() => onKick(m.username)} className="text-[10px] px-2 py-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30">Kick User</button>
                      )}
                      {isOwner && m.role === 'admin' && (
                         <button onClick={() => onDemote(m.username)} className="text-[10px] px-2 py-1 rounded-md bg-orange-500/20 text-orange-400 hover:bg-orange-500/30">Demote to Member</button>
                      )}
                      {isOwner && (
                         <button onClick={() => setTransferTarget(m.username)} className="text-[10px] px-2 py-1 rounded-md bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">Transfer Ownership</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* SETTINGS MODE */}
        {mode === 'settings' && (
          <div className="space-y-5">
            {/* Dark Mode */}
            <div className={`p-3 rounded-xl flex items-center justify-between ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <div className="flex flex-col">
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>Theme</span>
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
              </div>
              <button onClick={toggle} className="p-2 rounded-lg gradient-btn text-white">
                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>

            {/* Mute Notifications */}
            <div className={`p-3 rounded-xl flex items-center justify-between ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <div className="flex flex-col">
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>Notifications</span>
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{soundEnabled ? 'Enabled' : 'Muted'}</span>
              </div>
              <button onClick={onToggleSound} className={`p-2 rounded-lg text-white ${soundEnabled ? 'gradient-btn' : 'bg-slate-500'}`}>
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>

            {/* Settings mode toggles */}
            <button 
              onClick={() => onClose() || setTimeout(() => window.dispatchEvent(new CustomEvent('open-dashboard')), 50)}
              className="w-full p-3 rounded-xl flex items-center justify-between text-left transition-colors bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20"
            >
              <div className="flex flex-col">
                <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Dashboard</span>
                <span className={`text-xs ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>View engagement statistics</span>
              </div>
              <BarChart3 className="w-5 h-5" />
            </button>

            {/* Change Username */}
            <div className={`p-3 rounded-xl space-y-2 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>Change Username</span>
              <div className="flex gap-2">
                <input 
                  value={nameInput} 
                  onChange={(e) => setNameInput(e.target.value)}
                  className={`flex-1 px-3 py-1.5 text-sm rounded-lg outline-none ${isDark ? 'bg-black/20 text-white' : 'bg-white/50 text-black'}`}
                  placeholder="New username"
                />
                <button onClick={handleUpdateName} className="p-1.5 rounded-lg gradient-btn text-white"><Save className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Room Background (Admin Only) */}
            {(userRole === 'owner' || userRole === 'admin') && (
              <div className={`p-3 rounded-xl space-y-2 ${isDark ? 'bg-white/5 border border-violet-500/20' : 'bg-violet-50 border border-violet-500/20'}`}>
                <span className={`text-sm font-medium flex items-center gap-1.5 ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                  <ImageIcon className="w-4 h-4" /> Room Background
                </span>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Enter an image URL to set a custom background for all members in this room.</p>
                <div className="flex gap-2">
                  <input 
                    value={bgInput} 
                    onChange={(e) => setBgInput(e.target.value)}
                    placeholder="Direct Image URL (.jpg/.png)"
                    className={`flex-1 min-w-0 px-3 py-2 text-xs rounded-lg outline-none ${isDark ? 'bg-black/20 text-white' : 'bg-white/50 text-black'}`}
                  />
                  <button onClick={handleApplyBg} className="px-4 py-2 shrink-0 rounded-lg gradient-btn text-white text-xs font-semibold">Apply</button>
                </div>
              </div>
            )}

            {/* Burner Mode (Admin Only) */}
            {(userRole === 'owner' || userRole === 'admin') && (
              <div className={`p-3 rounded-xl flex items-center justify-between ${room?.burnerMode ? 'bg-orange-500/10 border border-orange-500/20' : isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <div className="flex flex-col">
                  <span className={`text-sm font-medium flex items-center gap-1.5 ${room?.burnerMode ? 'text-orange-400' : isDark ? 'text-white' : 'text-slate-800'}`}>
                    <Flame className="w-4 h-4" /> Burner Mode
                  </span>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {room?.burnerMode ? 'Messages vanish after 30s' : 'Messages stay visible'}
                  </span>
                </div>
                <button onClick={onToggleBurner}
                  className={`w-10 h-5 rounded-full flex items-center transition-all ${room?.burnerMode ? 'bg-orange-500 justify-end' : isDark ? 'bg-white/10 justify-start' : 'bg-black/10 justify-start'}`}>
                  <div className="w-4 h-4 bg-white rounded-full mx-0.5 shadow" />
                </button>
              </div>
            )}

            {/* Sign Out */}
            <button
              onClick={onSignOut}
              className="w-full p-3 rounded-xl flex items-center justify-center gap-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}

        {/* DASHBOARD MODE */}
        {mode === 'dashboard' && dashboardData && (
           <Dashboard stats={dashboardData} />
        )}

      </div>

      {/* CONFIRMATION MODAL */}
      {transferTarget && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={`p-4 rounded-xl shadow-xl w-full max-w-sm ${isDark ? 'glass bg-black/50' : 'glass-light bg-white/50'}`}>
             <h4 className="font-bold text-red-400 flex items-center gap-2 mb-2">⚠️ Transfer Ownership</h4>
             <p className={`text-sm mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
               You will lose ownership and full control will be given to <b>{transferTarget}</b>. Are you sure?
             </p>
             <div className="flex gap-2">
               <button onClick={() => setTransferTarget(null)} className={`flex-1 py-2 text-sm rounded-lg ${isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-black'}`}>Cancel</button>
               <button onClick={() => { onTransferOwnership(transferTarget); setTransferTarget(null); }} className="flex-1 py-2 text-sm rounded-lg bg-red-500 text-white">Transfer</button>
             </div>
          </div>
        </div>
      )}

      </div>
    </>
  );
}
