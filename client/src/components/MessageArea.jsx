import { useState, useRef, useEffect } from 'react';
import { Send, Smile, ArrowDown, MapPin, Check } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useTheme } from '../context/ThemeContext';

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

// Color map for username colors
const COLOR_MAP = {
  red: 'text-red-400', orange: 'text-orange-400', amber: 'text-amber-400',
  yellow: 'text-yellow-400', lime: 'text-lime-400', green: 'text-green-400',
  emerald: 'text-emerald-400', teal: 'text-teal-400', cyan: 'text-cyan-400',
  sky: 'text-sky-400', blue: 'text-blue-400', indigo: 'text-indigo-400',
  violet: 'text-violet-400', purple: 'text-purple-400', fuchsia: 'text-fuchsia-400',
  pink: 'text-pink-400', rose: 'text-rose-400',
};

// Lightweight markdown + mention + image parser
function renderMessageText(text, isDark, members) {
  const memberNames = (members || []).map(m => m.username);
  const IMAGE_REGEX = /(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp)(?:\?\S*)?)/gi;
  const LINK_REGEX = /(https?:\/\/\S+)/g;

  const processInline = (str) => {
    const tokens = [];
    const inlineRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(_(.+?)_)|(`(.+?)`)|(@(\w+))/g;
    let lastIndex = 0;
    let match;
    while ((match = inlineRegex.exec(str)) !== null) {
      if (match.index > lastIndex) tokens.push(str.slice(lastIndex, match.index));
      if (match[1]) tokens.push(<strong key={`b${match.index}`} className="font-bold">{match[2]}</strong>);
      else if (match[3]) tokens.push(<em key={`i${match.index}`} className="italic">{match[4]}</em>);
      else if (match[5]) tokens.push(<em key={`u${match.index}`} className="italic">{match[6]}</em>);
      else if (match[7]) tokens.push(<code key={`c${match.index}`} className={`px-1.5 py-0.5 rounded text-xs font-mono ${isDark ? 'bg-white/10 text-emerald-400' : 'bg-black/10 text-emerald-600'}`}>{match[8]}</code>);
      else if (match[9]) {
        const mentionName = match[10];
        const isMember = memberNames.some(n => n.toLowerCase() === mentionName.toLowerCase());
        tokens.push(<span key={`m${match.index}`} className={`font-semibold ${isMember ? 'text-cyan-400 bg-cyan-400/10 px-1 rounded' : isDark ? 'text-violet-400' : 'text-violet-600'}`}>@{mentionName}</span>);
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < str.length) tokens.push(str.slice(lastIndex));
    return tokens.length > 0 ? tokens : [str];
  };

  const imageMatch = text.match(IMAGE_REGEX);
  if (imageMatch) {
    const parts = [];
    let remaining = text;
    let lastIdx = 0;
    let key = 0;
    for (const img of imageMatch) {
      const idx = remaining.indexOf(img, lastIdx);
      if (idx > lastIdx) parts.push(<span key={key++}>{processInline(remaining.slice(lastIdx, idx))}</span>);
      parts.push(<img key={key++} src={img} alt="shared" loading="lazy" className="max-w-[250px] max-h-[200px] rounded-lg mt-1 object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(img, '_blank')} onError={(e) => { e.target.style.display = 'none'; }} />);
      lastIdx = idx + img.length;
    }
    if (lastIdx < remaining.length) parts.push(<span key={lastIdx}>{processInline(remaining.slice(lastIdx))}</span>);
    return parts;
  }

  const linkMatch = text.match(LINK_REGEX);
  if (linkMatch) {
    const parts = [];
    let remaining = text;
    let lastIdx = 0;
    let key = 0;
    for (const link of linkMatch) {
      const idx = remaining.indexOf(link, lastIdx);
      if (idx > lastIdx) parts.push(<span key={key++}>{processInline(remaining.slice(lastIdx, idx))}</span>);
      parts.push(<a key={key++} href={link} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300 break-all">{link.length > 50 ? link.slice(0, 47) + '...' : link}</a>);
      lastIdx = idx + link.length;
    }
    if (lastIdx < remaining.length) parts.push(<span key={lastIdx}>{processInline(remaining.slice(lastIdx))}</span>);
    return parts;
  }

  return processInline(text);
}

export default function MessageArea({ messages, username, typingUsers, onSendMessage, onTyping, onStopTyping, userRole, members, onKick, onPromote, onReaction, onSetColor, onPingTest, announcementOnly }) {
  const { isDark } = useTheme();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showActions, setShowActions] = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  const [atBottom, setAtBottom] = useState(true);
  const [deliveredIds, setDeliveredIds] = useState(new Set());
  const [sendingIds, setSendingIds] = useState(new Set());
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const typingTimerRef = useRef(null);

  const isAdmin = userRole === 'owner' || userRole === 'admin';
  const canSend = !announcementOnly || isAdmin;

  useEffect(() => {
    if (atBottom) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers, atBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
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

  const handleSend = async () => {
    if (!text.trim()) return;
    const msgText = text.trim();
    setText('');
    setShowEmoji(false);
    onStopTyping();
    clearTimeout(typingTimerRef.current);

    // Handle slash commands locally
    if (msgText.startsWith('/ping')) {
      if (onPingTest) {
        const latency = await onPingTest();
        const quality = latency < 150 ? '🟢 Good' : latency < 400 ? '🟡 Okay' : '🔴 Poor';
        // Add a local-only system message
        const fakeMsg = {
          id: `ping-${Date.now()}`,
          text: `📶 Signal: ${latency}ms (${quality})`,
          type: 'system',
          timestamp: Date.now(),
          roomCode: '',
          localOnly: true,
        };
        // We can't add to server messages, so we need to handle this differently
        // Let's use a temporary state
        setLocalMessages(prev => [...prev, fakeMsg]);
      }
      return;
    }

    if (msgText.startsWith('/color ')) {
      const color = msgText.split(' ')[1]?.toLowerCase();
      if (onSetColor && color) onSetColor(color);
      return;
    }

    // Track delivery
    const tempId = `sending-${Date.now()}`;
    setSendingIds(prev => new Set([...prev, tempId]));

    const delivered = await onSendMessage(msgText);
    setSendingIds(prev => { const n = new Set(prev); n.delete(tempId); return n; });

    if (delivered) {
      // The latest message from this user will be the delivered one
      // We'll mark it after a brief delay to match it
      setTimeout(() => {
        setDeliveredIds(prev => {
          const n = new Set(prev);
          // Find the latest message from us
          const latest = [...messages].reverse().find(m => m.sender === username && m.type === 'user');
          if (latest) n.add(latest.id);
          return n;
        });
      }, 200);
    }
  };

  // Local-only messages (for /ping results)
  const [localMessages, setLocalMessages] = useState([]);

  // Auto-mark new own messages as delivered when they appear
  useEffect(() => {
    const myMsgs = messages.filter(m => m.sender === username && m.type === 'user');
    if (myMsgs.length > 0) {
      const latest = myMsgs[myMsgs.length - 1];
      setDeliveredIds(prev => new Set([...prev, latest.id]));
    }
  }, [messages, username]);

  const handleEmoji = (emojiData) => setText(prev => prev + emojiData.emoji);

  const handleSOS = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        onSendMessage(`🚨 SOS Location: ${mapsUrl}`);
      },
      () => alert('Location access denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const canManage = userRole === 'owner' || userRole === 'admin';

  // Merge local + server messages
  const allMessages = [...messages, ...localMessages].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Messages */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {allMessages.length === 0 && (
          <div className={`flex items-center justify-center h-full ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            <div className="text-center">
              <p className="text-lg mb-1">✨ No messages yet</p>
              <p className="text-sm">{announcementOnly ? 'Waiting for announcements...' : 'Be the first to say something!'}</p>
            </div>
          </div>
        )}

        {allMessages.map((msg, i) => {
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
          const showAvatar = !isMine && (i === 0 || allMessages[i - 1]?.sender !== msg.sender || allMessages[i - 1]?.type === 'system');
          const reactions = msg.reactions || {};
          const hasReactions = Object.keys(reactions).length > 0;
          const isDelivered = deliveredIds.has(msg.id);
          const senderColor = msg.senderColor ? COLOR_MAP[msg.senderColor] : 'text-violet-400';

          return (
            <div key={msg.id} className={`flex items-end gap-2 animate-fade-in ${isMine ? 'justify-end' : 'justify-start'}`}>
              {!isMine && (
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold
                  ${showAvatar ? 'bg-violet-500/30 text-violet-300' : 'invisible'}`}>
                  {msg.sender[0].toUpperCase()}
                </div>
              )}

              <div className="relative max-w-[75%] lg:max-w-[55%] group">
                <div
                  className={`px-3.5 py-2 ${isMine ? 'message-sent rounded-2xl rounded-br-md text-white' : 'message-received rounded-2xl rounded-bl-md'}`}
                  onDoubleClick={() => onReaction && setShowReactions(showReactions === msg.id ? null : msg.id)}
                  onContextMenu={e => { if (canManage && !isMine) { e.preventDefault(); setShowActions(msg.sender); } }}
                >
                  {!isMine && showAvatar && (
                    <p className={`text-xs font-semibold mb-0.5 ${senderColor}`}>{msg.sender}</p>
                  )}
                  <div className={`text-sm leading-relaxed break-words ${!isMine && isDark ? 'text-slate-200' : !isMine ? 'text-slate-700' : ''}`}>
                    {renderMessageText(msg.text, isDark, members)}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <p className={`text-[10px] leading-none ${isMine ? 'text-white/50' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                    {/* Delivery checkmark */}
                    {isMine && (
                      <Check className={`w-3 h-3 ${isDelivered ? 'text-emerald-400' : 'text-white/30'}`} />
                    )}
                  </div>
                </div>

                {hasReactions && (
                  <div className={`flex flex-wrap gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(reactions).map(([emoji, users]) => (
                      <button key={emoji} onClick={() => onReaction?.(msg.id, emoji)}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all
                          ${users.includes(username) ? 'bg-violet-500/30 border border-violet-500/40' : isDark ? 'bg-white/5 border border-white/5 hover:bg-white/10' : 'bg-black/5 border border-black/5 hover:bg-black/10'}`}>
                        <span>{emoji}</span>
                        <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{users.length}</span>
                      </button>
                    ))}
                  </div>
                )}

                {showReactions === msg.id && (
                  <div className={`absolute ${isMine ? 'right-0' : 'left-0'} bottom-full mb-1 flex gap-1 px-2 py-1.5 rounded-xl shadow-xl z-50 animate-fade-in
                    ${isDark ? 'bg-[#1a1a2e] border border-white/10' : 'bg-white border border-black/10'}`}>
                    {REACTION_EMOJIS.map(emoji => (
                      <button key={emoji} onClick={() => { onReaction?.(msg.id, emoji); setShowReactions(null); }}
                        className="text-lg hover:scale-125 transition-transform p-0.5">{emoji}</button>
                    ))}
                  </div>
                )}

                {showActions === msg.sender && canManage && !isMine && (
                  <div className={`absolute bottom-full mb-1 right-0 rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in ${isDark ? 'glass' : 'glass-light'}`}>
                    <button onClick={() => { onKick(msg.sender); setShowActions(null); }} className={`block w-full px-4 py-2 text-xs text-left text-red-400 ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>Kick {msg.sender}</button>
                    <button onClick={() => { onPromote(msg.sender); setShowActions(null); }} className={`block w-full px-4 py-2 text-xs text-left text-cyan-400 ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>Promote to Admin</button>
                    <button onClick={() => setShowActions(null)} className={`block w-full px-4 py-2 text-xs text-left ${isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-black/5'}`}>Cancel</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

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
                <span className={`text-xs ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{typingUsers.join(', ')}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!atBottom && (
        <button onClick={scrollToBottom} className="absolute bottom-20 right-6 p-2 rounded-full shadow-lg gradient-btn text-white animate-fade-in z-10">
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {showEmoji && (
        <div className="absolute bottom-16 left-0 right-0 sm:right-auto sm:left-4 z-20 animate-fade-in flex justify-center w-full sm:w-auto">
          <EmojiPicker onEmojiClick={handleEmoji} theme={isDark ? 'dark' : 'light'} emojiStyle="native" lazyLoadEmojis={false} height={350} width={320} />
        </div>
      )}

      {/* Input Area */}
      <div className={`px-4 py-3 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        {canSend ? (
          <div className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 transition-all
            ${isDark ? 'bg-white/5 border border-white/5 focus-within:border-violet-500/30' : 'bg-black/5 border border-black/5 focus-within:border-violet-500/30'}`}>
            <button onClick={() => setShowEmoji(!showEmoji)}
              className={`p-1 rounded-lg transition-colors ${showEmoji ? 'text-violet-400' : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
              <Smile className="w-5 h-5" />
            </button>
            <button onClick={handleSOS} title="Send SOS Location"
              className={`p-1 rounded-lg transition-colors ${isDark ? 'text-red-400/60 hover:text-red-400' : 'text-red-500/60 hover:text-red-500'}`}>
              <MapPin className="w-5 h-5" />
            </button>
            <input id="message-input" type="text" value={text} onChange={handleChange}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              onClick={() => { setShowEmoji(false); setShowReactions(null); }}
              placeholder="/ping · /color red · @mention · **bold**"
              className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`} />
            <button id="send-btn" onClick={handleSend} disabled={!text.trim()}
              className={`p-2 rounded-xl transition-all ${text.trim() ? 'gradient-btn text-white shadow-md' : isDark ? 'text-slate-600' : 'text-slate-300'}`}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Announcement mode - read only */
          <div className={`text-center py-3 rounded-2xl ${isDark ? 'bg-white/5 text-slate-500' : 'bg-black/5 text-slate-400'}`}>
            <p className="text-sm font-medium">📢 Announcement Room</p>
            <p className="text-xs">Only admins can send messages</p>
          </div>
        )}
      </div>
    </div>
  );
}
