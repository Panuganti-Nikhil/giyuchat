import { useState, useRef, useEffect } from 'react';
import { Send, Smile, ArrowDown } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useTheme } from '../context/ThemeContext';

export default function MessageArea({ messages, username, typingUsers, onSendMessage, onTyping, onStopTyping, userRole, members, onKick, onPromote }) {
  const { isDark } = useTheme();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showActions, setShowActions] = useState(null);
  const [atBottom, setAtBottom] = useState(true);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    if (atBottom) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers, atBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(isBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAtBottom(true);
  };

  const handleChange = (e) => {
    setText(e.target.value);
    onTyping();
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(onStopTyping, 2000);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
    setShowEmoji(false);
    onStopTyping();
    clearTimeout(typingTimerRef.current);
  };

  const handleEmoji = (emojiData) => {
    setText(prev => prev + emojiData.emoji);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canManage = userRole === 'owner' || userRole === 'admin';

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Messages */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {messages.length === 0 && (
          <div className={`flex items-center justify-center h-full ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            <div className="text-center">
              <p className="text-lg mb-1">✨ No messages yet</p>
              <p className="text-sm">Be the first to say something!</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="flex justify-center py-1 animate-fade-in">
                <span className={`text-xs px-3 py-1 rounded-full ${isDark ? 'bg-white/5 text-slate-500' : 'bg-black/5 text-slate-400'}`}>
                  {msg.text}
                </span>
              </div>
            );
          }

          const isMine = msg.sender === username;
          const showAvatar = !isMine && (i === 0 || messages[i - 1]?.sender !== msg.sender || messages[i - 1]?.type === 'system');

          return (
            <div key={msg.id} className={`flex items-end gap-2 animate-fade-in ${isMine ? 'justify-end' : 'justify-start'}`}>
              {/* Avatar */}
              {!isMine && (
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold
                  ${showAvatar ? 'bg-violet-500/30 text-violet-300' : 'invisible'}`}>
                  {msg.sender[0].toUpperCase()}
                </div>
              )}

              {/* Bubble */}
              <div
                className={`relative max-w-[75%] lg:max-w-[55%] px-3.5 py-2 group
                  ${isMine
                    ? 'message-sent rounded-2xl rounded-br-md text-white'
                    : 'message-received rounded-2xl rounded-bl-md'
                  }`}
                onContextMenu={e => {
                  if (canManage && !isMine) { e.preventDefault(); setShowActions(msg.sender); }
                }}
              >
                {/* Sender name */}
                {!isMine && showAvatar && (
                  <p className="text-xs font-semibold text-violet-400 mb-0.5">{msg.sender}</p>
                )}

                <p className={`text-sm leading-relaxed break-words ${!isMine && isDark ? 'text-slate-200' : !isMine ? 'text-slate-700' : ''}`}>
                  {msg.text}
                </p>

                <p className={`text-[10px] text-right mt-0.5 leading-none
                  ${isMine ? 'text-white/50' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {formatTime(msg.timestamp)}
                </p>

                {/* Admin actions menu */}
                {showActions === msg.sender && canManage && !isMine && (
                  <div className={`absolute bottom-full mb-1 right-0 rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in
                    ${isDark ? 'glass' : 'glass-light'}`}>
                    <button
                      onClick={() => { onKick(msg.sender); setShowActions(null); }}
                      className={`block w-full px-4 py-2 text-xs text-left text-red-400 ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                    >
                      Kick {msg.sender}
                    </button>
                    <button
                      onClick={() => { onPromote(msg.sender); setShowActions(null); }}
                      className={`block w-full px-4 py-2 text-xs text-left text-cyan-400 ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                    >
                      Promote to Admin
                    </button>
                    <button
                      onClick={() => setShowActions(null)}
                      className={`block w-full px-4 py-2 text-xs text-left ${isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-black/5'}`}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-end gap-2 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-300">
              {typingUsers[0][0].toUpperCase()}
            </div>
            <div className={`px-4 py-3 rounded-2xl rounded-bl-md ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full typing-dot ${isDark ? 'bg-slate-400' : 'bg-slate-500'}`} />
                  <span className={`w-1.5 h-1.5 rounded-full typing-dot ${isDark ? 'bg-slate-400' : 'bg-slate-500'}`} />
                  <span className={`w-1.5 h-1.5 rounded-full typing-dot ${isDark ? 'bg-slate-400' : 'bg-slate-500'}`} />
                </div>
                <span className={`text-xs ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {typingUsers.join(', ')}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!atBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 p-2 rounded-full shadow-lg gradient-btn text-white animate-fade-in z-10"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-16 left-0 right-0 sm:right-auto sm:left-4 z-20 animate-fade-in flex justify-center w-full sm:w-auto">
          <EmojiPicker onEmojiClick={handleEmoji} theme={isDark ? 'dark' : 'light'} lazyLoadEmojis height={350} width={320} />
        </div>
      )}

      {/* Input */}
      <div className={`px-4 py-3 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <div className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 transition-all
          ${isDark
            ? 'bg-white/5 border border-white/5 focus-within:border-violet-500/30'
            : 'bg-black/5 border border-black/5 focus-within:border-violet-500/30'
          }`}
        >
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className={`p-1 rounded-lg transition-colors ${showEmoji ? 'text-violet-400' : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Smile className="w-5 h-5" />
          </button>
          <input
            id="message-input"
            type="text"
            value={text}
            onChange={handleChange}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            onClick={() => setShowEmoji(false)}
            placeholder="Type a message..."
            className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
          />
          <button
            id="send-btn"
            onClick={handleSend}
            disabled={!text.trim()}
            className={`p-2 rounded-xl transition-all ${text.trim()
              ? 'gradient-btn text-white shadow-md'
              : isDark ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
