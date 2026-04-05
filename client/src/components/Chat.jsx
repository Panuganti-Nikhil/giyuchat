import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MessageArea from './MessageArea';
import RightPanel from './RightPanel';
import { useTheme } from '../context/ThemeContext';
import { Menu } from 'lucide-react';

export default function Chat({
  username, rooms, activeRoom, messagesByRoom, membersByRoom, typingUsers,
  showDashboard, dashboardData, soundEnabled,
  onSelectRoom, onCreateRoom, onJoinRoom, onLeaveRoom,
  onSendMessage, onTyping, onStopTyping,
  onToggleDashboard, onToggleSound,
  onKick, onPromote, onDemote, onTransferOwnership,
  onChangeUsername, onSignOut, onSetBackground,
  onReaction, onToggleBurner,
  onSetColor, onPingTest, socket,
  onEditMessage, onDeleteMessage, onPinMessage, onHighlightMessage,
  sidebarOpen, onToggleSidebar,
}) {
  const { isDark } = useTheme();
  const [rightPanelMode, setRightPanelMode] = useState(null);

  useEffect(() => { setRightPanelMode(null); }, [activeRoom]);

  useEffect(() => {
     const handleOpenDashboard = () => setRightPanelMode('dashboard');
     window.addEventListener('open-dashboard', handleOpenDashboard);
     return () => window.removeEventListener('open-dashboard', handleOpenDashboard);
  }, []);

  const currentRoom = rooms.find(r => r.code === activeRoom);
  const currentMessages = messagesByRoom[activeRoom] || [];
  const currentMembers = membersByRoom[activeRoom] || [];
  const currentTyping = typingUsers[activeRoom] || [];

  return (
    <div className={`flex h-[100dvh] ${isDark ? 'bg-app-dark' : 'bg-app-light'}`}>
      <Sidebar
        rooms={rooms}
        activeRoom={activeRoom}
        username={username}
        onSelectRoom={onSelectRoom}
        onCreateRoom={onCreateRoom}
        onJoinRoom={onJoinRoom}
        onLeaveRoom={onLeaveRoom}
        isOpen={sidebarOpen}
        onClose={() => onToggleSidebar(false)}
      />

      <main
        className="flex-1 flex flex-col min-w-0 bg-cover bg-center transition-all bg-no-repeat relative"
      >
        {currentRoom?.backgroundUrl && (
          <>
            <div className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 opacity-15" style={{ backgroundImage: `url(${currentRoom.backgroundUrl})` }} />
            <div className="absolute inset-0 bg-[#0B0616]/50 pointer-events-none z-0" />
          </>
        )}

        {currentRoom ? (
           <div className="flex-1 flex z-10 min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <TopBar
                room={currentRoom}
                members={currentMembers}
                onToggleRightPanel={(mode) => setRightPanelMode(prev => prev === mode ? null : mode)}
                showRightPanel={rightPanelMode}
                onToggleSidebar={() => onToggleSidebar(true)}
              />

              <MessageArea
                messages={currentMessages}
                username={username}
                typingUsers={currentTyping}
                onSendMessage={onSendMessage}
                onTyping={onTyping}
                onStopTyping={onStopTyping}
                userRole={currentRoom.role}
                members={currentMembers}
                onKick={onKick}
                onPromote={onPromote}
                onReaction={onReaction}
                onSetColor={onSetColor}
                onPingTest={onPingTest}
                announcementOnly={currentRoom.announcementOnly}
                onEditMessage={onEditMessage}
                onDeleteMessage={onDeleteMessage}
                onPinMessage={onPinMessage}
                onHighlightMessage={onHighlightMessage}
                pinnedMessageId={currentRoom.pinnedMessageId}
              />
            </div>

            <RightPanel
              mode={rightPanelMode}
              onClose={() => setRightPanelMode(null)}
              username={username}
              members={currentMembers}
              userRole={currentRoom.role}
              room={currentRoom}
              onKick={onKick}
              onPromote={onPromote}
              onDemote={onDemote}
              onTransferOwnership={onTransferOwnership}
              soundEnabled={soundEnabled}
              onToggleSound={onToggleSound}
              dashboardData={dashboardData}
              onChangeUsername={onChangeUsername}
              onSignOut={onSignOut}
              onSetBackground={onSetBackground}
              onToggleBurner={onToggleBurner}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col z-10 min-h-0">
            <div className="lg:hidden p-3 flex flex-shrink-0 items-center border-b bg-[#0B0616]/80 backdrop-blur-xl border-[#A100FF]/10">
              <button
                onClick={() => onToggleSidebar(true)}
                className="p-2 rounded-xl hover:bg-[#A100FF]/10 text-[#F5E9FF] transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="ml-2 font-semibold premium-text">Giyu Chat</span>
            </div>
            <div className="flex-1 flex items-center justify-center text-[#7B5EA0]">
              <div className="text-center p-4">
                <p className="text-5xl mb-4">💬</p>
                <p className="text-lg font-medium text-[#BFA6D9]">Select a room to start chatting</p>
                <p className="text-sm mt-1 text-[#7B5EA0]">Or create / join a new one from the sidebar</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
