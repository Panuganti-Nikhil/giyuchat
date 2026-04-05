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
    if (role === 'admin') return <Shield className="w-3.5 h-3.5 text-[#FF00C8]" />;
    return <UserIcon className="w-3.5 h-3.5 text-[#7B5EA0]" />;
  };

  const handleApplyBg = () => {
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />

      <div className={`fixed inset-y-0 right-0 lg:relative w-[85vw] lg:w-80 flex flex-col h-full z-50 border-l
        bg-[#0B0616]/95 backdrop-blur-2xl border-[#A100FF]/10
      `}>
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between shrink-0 border-[#A100FF]/10">
          <h3 className="font-semibold text-sm text-[#F5E9FF]">
            {mode === 'members' && `Members (${members.length})`}
            {mode === 'settings' && 'Settings'}
            {mode === 'dashboard' && 'Dashboard'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-[#A100FF]/10 text-[#BFA6D9] transition-colors">
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
                  <div key={m.username} className="p-3 rounded-2xl border flex flex-col gap-2
                    bg-[#A100FF]/5 border-[#A100FF]/10 neon-card-hover"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                          ${m.online ? 'bg-[#A100FF]/25 text-[#A100FF]' : 'bg-[#A100FF]/8 text-[#7B5EA0]'}`}>
                          {m.username[0].toUpperCase()}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0B0616]
                          ${m.online ? 'neon-online-dot' : 'bg-[#7B5EA0]/50'}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-1.5 text-[#F5E9FF]">
                          {m.username} {isSelf && <span className="text-xs text-[#A100FF]">(You)</span>}
                        </p>
                        <p className="text-xs flex items-center gap-1 text-[#BFA6D9]">
                          {roleIcon(m.role)} <span className="capitalize">{m.role}</span>
                        </p>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex flex-wrap gap-1.5 mt-1 border-t border-[#A100FF]/10 pt-2">
                        {isOwner && m.role !== 'admin' && m.role !== 'owner' && (
                           <button onClick={() => onPromote(m.username)} className="text-[10px] px-2 py-1 rounded-lg bg-[#FF00C8]/15 text-[#FF00C8] hover:bg-[#FF00C8]/25 transition-colors">Promote to Admin</button>
                        )}
                        {(isOwner || (userRole === 'admin' && m.role !== 'admin' && m.role !== 'owner')) && (
                           <button onClick={() => onKick(m.username)} className="text-[10px] px-2 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors">Kick User</button>
                        )}
                        {isOwner && m.role === 'admin' && (
                           <button onClick={() => onDemote(m.username)} className="text-[10px] px-2 py-1 rounded-lg bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-colors">Demote to Member</button>
                        )}
                        {isOwner && (
                           <button onClick={() => setTransferTarget(m.username)} className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors">Transfer Ownership</button>
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
              <div className="p-3 rounded-2xl flex items-center justify-between bg-[#A100FF]/5 border border-[#A100FF]/10">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#F5E9FF]">Theme</span>
                  <span className="text-xs text-[#BFA6D9]">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
                <button onClick={toggle} className="p-2 rounded-xl premium-btn text-white">
                  {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
              </div>

              {/* Mute Notifications */}
              <div className="p-3 rounded-2xl flex items-center justify-between bg-[#A100FF]/5 border border-[#A100FF]/10">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#F5E9FF]">Notifications</span>
                  <span className="text-xs text-[#BFA6D9]">{soundEnabled ? 'Enabled' : 'Muted'}</span>
                </div>
                <button onClick={onToggleSound} className={`p-2 rounded-xl text-white ${soundEnabled ? 'premium-btn' : 'bg-[#7B5EA0]/30'}`}>
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              {/* Dashboard link */}
              <button
                onClick={() => onClose() || setTimeout(() => window.dispatchEvent(new CustomEvent('open-dashboard')), 50)}
                className="w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all
                  bg-[#FF00C8]/8 hover:bg-[#FF00C8]/15 text-[#FF00C8] border border-[#FF00C8]/15 neon-card-hover"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#FF00C8]">Dashboard</span>
                  <span className="text-xs text-[#FF00C8]/60">View engagement statistics</span>
                </div>
                <BarChart3 className="w-5 h-5" />
              </button>

              {/* Change Username */}
              <div className="p-3 rounded-2xl space-y-2 bg-[#A100FF]/5 border border-[#A100FF]/10">
                <span className="text-sm font-medium text-[#F5E9FF]">Change Username</span>
                <div className="flex gap-2">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm rounded-xl outline-none bg-[#A100FF]/8 text-[#F5E9FF] border border-[#A100FF]/10 focus:border-[#A100FF]/30"
                    placeholder="New username"
                  />
                  <button onClick={handleUpdateName} className="p-1.5 rounded-xl premium-btn text-white"><Save className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Room Background (Admin Only) */}
              {(userRole === 'owner' || userRole === 'admin') && (
                <div className="p-3 rounded-2xl space-y-2 bg-[#A100FF]/8 border border-[#A100FF]/15">
                  <span className="text-sm font-medium flex items-center gap-1.5 text-[#A100FF]">
                    <ImageIcon className="w-4 h-4" /> Room Background
                  </span>
                  <p className="text-[10px] text-[#7B5EA0]">Enter an image URL to set a custom background for all members in this room.</p>
                  <div className="flex gap-2">
                    <input
                      value={bgInput}
                      onChange={(e) => setBgInput(e.target.value)}
                      placeholder="Direct Image URL (.jpg/.png)"
                      className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl outline-none bg-[#A100FF]/5 text-[#F5E9FF] border border-[#A100FF]/10 focus:border-[#A100FF]/30"
                    />
                    <button onClick={handleApplyBg} className="px-4 py-2 shrink-0 rounded-xl premium-btn text-white text-xs font-semibold">Apply</button>
                  </div>
                </div>
              )}

              {/* Burner Mode (Admin Only) */}
              {(userRole === 'owner' || userRole === 'admin') && (
                <div className={`p-3 rounded-2xl flex items-center justify-between ${room?.burnerMode ? 'bg-orange-500/8 border border-orange-500/15' : 'bg-[#A100FF]/5 border border-[#A100FF]/10'}`}>
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium flex items-center gap-1.5 ${room?.burnerMode ? 'text-orange-400' : 'text-[#F5E9FF]'}`}>
                      <Flame className="w-4 h-4" /> Burner Mode
                    </span>
                    <span className="text-xs text-[#BFA6D9]">
                      {room?.burnerMode ? 'Messages vanish after 30s' : 'Messages stay visible'}
                    </span>
                  </div>
                  <button onClick={onToggleBurner}
                    className={`w-10 h-5 rounded-full flex items-center transition-all ${room?.burnerMode ? 'bg-orange-500 justify-end shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-[#A100FF]/15 justify-start'}`}>
                    <div className="w-4 h-4 bg-white rounded-full mx-0.5" />
                  </button>
                </div>
              )}

              {/* Sign Out */}
              <button
                onClick={onSignOut}
                className="w-full p-3 rounded-2xl flex items-center justify-center gap-2 text-red-400 bg-red-500/8 hover:bg-red-500/15 transition-colors text-sm font-medium border border-red-500/15"
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="p-4 rounded-2xl w-full max-w-sm bg-[#150D28]/95 backdrop-blur-xl border border-[#A100FF]/15 shadow-[0_0_30px_rgba(161,0,255,0.15)]">
               <h4 className="font-bold text-red-400 flex items-center gap-2 mb-2">⚠️ Transfer Ownership</h4>
               <p className="text-sm mb-4 text-[#BFA6D9]">
                 You will lose ownership and full control will be given to <b className="text-[#F5E9FF]">{transferTarget}</b>. Are you sure?
               </p>
               <div className="flex gap-2">
                 <button onClick={() => setTransferTarget(null)} className="flex-1 py-2 text-sm rounded-xl bg-[#A100FF]/10 text-[#F5E9FF] hover:bg-[#A100FF]/20 transition-colors">Cancel</button>
                 <button onClick={() => { onTransferOwnership(transferTarget); setTransferTarget(null); }} className="flex-1 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors">Transfer</button>
               </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
