import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MessageArea from './MessageArea';
import RightPanel from './RightPanel';
import { useTheme } from '../context/ThemeContext';

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
    <div className={`flex h-screen ${isDark ? 'bg-app-dark' : 'bg-app-light'}`}>
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
            <div className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 opacity-20" style={{ backgroundImage: `url(${currentRoom.backgroundUrl})` }} />
            <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />
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
          <div className={`flex-1 flex items-center justify-center z-10 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            <div className="text-center">
              <p className="text-5xl mb-4">💬</p>
              <p className="text-lg font-medium">Select a room to start chatting</p>
              <p className="text-sm mt-1">Or create / join a new one from the sidebar</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
