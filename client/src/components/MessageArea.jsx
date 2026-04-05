import { useState, useRef, useEffect } from 'react';
import { Send, Smile, ArrowDown, MapPin, Check, Pencil, Trash2, Pin, PinOff, Zap, ZapOff, X } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useTheme } from '../context/ThemeContext';

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

const COLOR_MAP = {
  red: 'text-red-400', orange: 'text-orange-400', amber: 'text-amber-400',
  yellow: 'text-yellow-400', lime: 'text-lime-400', green: 'text-green-400',
  emerald: 'text-emerald-400', teal: 'text-teal-400', cyan: 'text-cyan-400',
  sky: 'text-sky-400', blue: 'text-blue-400', indigo: 'text-indigo-400',
  violet: 'text-violet-400', purple: 'text-purple-400', fuchsia: 'text-fuchsia-400',
  pink: 'text-pink-400', rose: 'text-rose-400',
};

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
      else if (match[7]) tokens.push(<code key={`c${match.index}`} className="px-1.5 py-0.5 rounded-md text-xs font-mono bg-[#A100FF]/15 text-[#FF4DFF]">{match[8]}</code>);
      else if (match[9]) {
        const mentionName = match[10];
        const isMember = memberNames.some(n => n.toLowerCase() === mentionName.toLowerCase());
        tokens.push(<span key={`m${match.index}`} className={`font-semibold ${isMember ? 'text-[#FF00C8] bg-[#FF00C8]/10 px-1 rounded-md' : 'text-[#A100FF]'}`}>@{mentionName}</span>);
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
      parts.push(<img key={key++} src={img} alt="shared" loading="lazy" className="max-w-[250px] max-h-[200px] rounded-xl mt-1 object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(img, '_blank')} onError={(e) => { e.target.style.display = 'none'; }} />);
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
      parts.push(<a key={key++} href={link} target="_blank" rel="noopener noreferrer" className="text-[#FF4DFF] underline hover:text-[#FF00C8] break-all transition-colors">{link.length > 50 ? link.slice(0, 47) + '...' : link}</a>);
      lastIdx = idx + link.length;
    }
    if (lastIdx < remaining.length) parts.push(<span key={lastIdx}>{processInline(remaining.slice(lastIdx))}</span>);
    return parts;
  }

  return processInline(text);
}

export default function MessageArea({
  messages, username, typingUsers, onSendMessage, onTyping, onStopTyping, userRole, members,
  onKick, onPromote, onReaction, onSetColor, onPingTest, announcementOnly,
  onEditMessage, onDeleteMessage, onPinMessage, onHighlightMessage, pinnedMessageId
}) {
  const { isDark } = useTheme();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showActions, setShowActions] = useState(null);
  const [contextMessageId, setContextMessageId] = useState(null);
  const [editMessageId, setEditMessageId] = useState(null);
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

    if (editMessageId) {
      if (onEditMessage) onEditMessage(editMessageId, msgText);
      setEditMessageId(null);
      return;
    }

    if (msgText.startsWith('/ping')) {
      if (onPingTest) {
        const latency = await onPingTest();
        const quality = latency < 150 ? '🟢 Good' : latency < 400 ? '🟡 Okay' : '🔴 Poor';
        const fakeMsg = {
          id: `ping-${Date.now()}`,
          text: `📶 Signal: ${latency}ms (${quality})`,
          type: 'system',
          timestamp: Date.now(),
          roomCode: '',
          localOnly: true,
        };
        setLocalMessages(prev => [...prev, fakeMsg]);
      }
      return;
    }

    if (msgText.startsWith('/color ')) {
      const color = msgText.split(' ')[1]?.toLowerCase();
      if (onSetColor && color) onSetColor(color);
      return;
    }

    const tempId = `sending-${Date.now()}`;
    setSendingIds(prev => new Set([...prev, tempId]));

    const delivered = await onSendMessage(msgText);
    setSendingIds(prev => { const n = new Set(prev); n.delete(tempId); return n; });

    if (delivered) {
      setTimeout(() => {
        setDeliveredIds(prev => {
          const n = new Set(prev);
          const latest = [...messages].reverse().find(m => m.sender === username && m.type === 'user');
          if (latest) n.add(latest.id);
          return n;
        });
      }, 200);
    }
  };

  const handleCancelEdit = () => {
    setEditMessageId(null);
    setText('');
  };

  const [localMessages, setLocalMessages] = useState([]);

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
  const allMessages = [...messages, ...localMessages].sort((a, b) => a.timestamp - b.timestamp);

  const pinnedMessage = messages.find(m => m.id === pinnedMessageId);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div className="px-4 py-2 border-b flex items-center justify-between gap-3 z-10
          bg-[#A100FF]/8 border-[#A100FF]/15">
          <div className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer"
               onClick={() => {
                 const el = document.getElementById(`msg-${pinnedMessage.id}`);
                 if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
               }}>
            <Pin className="w-3.5 h-3.5 flex-shrink-0 text-[#A100FF]" />
            <div className="truncate text-sm flex-1">
              <span className="font-semibold mr-1 text-[#A100FF]">{pinnedMessage.sender}:</span>
              <span className="text-[#BFA6D9]">{pinnedMessage.text}</span>
            </div>
          </div>
          {canManage && (
            <button onClick={() => onPinMessage?.(pinnedMessage.id)} className="p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-[#A100FF]/10 transition-all">
              <X className="w-4 h-4 text-[#BFA6D9]" />
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5" onClick={() => setContextMessageId(null)}>
        {allMessages.length === 0 && (
          <div className="flex items-center justify-center h-full text-[#7B5EA0]">
            <div className="text-center">
              <p className="text-lg mb-1">✨ No messages yet</p>
              <p className="text-sm">{announcementOnly ? 'Waiting for announcements...' : 'Be the first to say something!'}</p>
            </div>
          </div>
        )}

        {allMessages.map((msg, i) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} id={`msg-${msg.id}`} className="flex justify-center py-1 animate-fade-in">
                <span className="text-xs px-3 py-1 rounded-full bg-[#A100FF]/8 text-[#7B5EA0] border border-[#A100FF]/10">
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
          const senderColor = msg.senderColor ? COLOR_MAP[msg.senderColor] : 'text-[#A100FF]';

          return (
            <div key={msg.id} id={`msg-${msg.id}`} className={`flex items-end gap-2 animate-fade-in ${isMine ? 'justify-end' : 'justify-start'}`}>
              {!isMine && (
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold
                  ${showAvatar ? 'bg-[#A100FF]/25 text-[#A100FF]' : 'invisible'}`}>
                  {msg.sender[0].toUpperCase()}
                </div>
              )}

              <div className="relative max-w-[75%] lg:max-w-[55%] group">
                <div
                  className={`px-3.5 py-2 transition-all cursor-pointer ${
                    msg.isHighlighted
                      ? 'bg-[#FF00C8]/15 border-l-4 border-[#FF00C8] rounded-r-2xl text-[#F5E9FF]'
                      : isMine ? 'message-sent' : 'message-received'
                  }`}
                  onDoubleClick={(e) => { e.stopPropagation(); setContextMessageId(contextMessageId === msg.id ? null : msg.id); }}
                  onContextMenu={e => { if (canManage && !isMine) { e.preventDefault(); setShowActions(msg.sender); } }}
                >
                  {!isMine && showAvatar && !msg.isHighlighted && (
                    <p className={`text-xs font-semibold mb-0.5 ${senderColor}`}>{msg.sender}</p>
                  )}
                  {msg.isHighlighted && !isMine && (
                     <p className="text-xs font-bold mb-0.5 text-[#FF00C8] flex items-center gap-1">
                       <Zap className="w-3 h-3" /> {msg.sender}
                     </p>
                  )}

                  <div className={`text-sm leading-relaxed break-words ${!isMine && !msg.isHighlighted ? 'text-[#F5E9FF]/90' : ''}`}>
                    {renderMessageText(msg.text, isDark, members)}
                  </div>

                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {msg.isEdited && (
                      <p className={`text-[10px] leading-none ${isMine && !msg.isHighlighted ? 'text-white/60' : 'text-[#7B5EA0]'}`}>(edited)</p>
                    )}
                    <p className={`text-[10px] leading-none ${isMine && !msg.isHighlighted ? 'text-white/40' : 'text-[#7B5EA0]'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                    {isMine && (
                      <Check className={`w-3 h-3 ${isDelivered ? 'text-emerald-400' : 'text-white/25'}`} />
                    )}
                  </div>
                </div>

                {hasReactions && (
                  <div className={`flex flex-wrap gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(reactions).map(([emoji, users]) => (
                      <button key={emoji} onClick={() => onReaction?.(msg.id, emoji)}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all
                          ${users.includes(username)
                            ? 'bg-[#A100FF]/25 border border-[#A100FF]/40 shadow-[0_0_6px_rgba(161,0,255,0.2)]'
                            : 'bg-[#A100FF]/5 border border-[#A100FF]/10 hover:bg-[#A100FF]/15'}`}>
                        <span>{emoji}</span>
                        <span className="text-[10px] text-[#BFA6D9]">{users.length}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Context Menu Popup */}
                {contextMessageId === msg.id && (
                  <div className={`absolute ${isMine ? 'right-0' : 'left-0'} bottom-full mb-1 min-w-[200px] flex flex-col z-50 animate-fade-in overflow-hidden
                    bg-[#150D28]/95 backdrop-blur-xl border border-[#A100FF]/15 rounded-2xl shadow-[0_0_25px_rgba(161,0,255,0.15)]`}>

                    {/* Reactions Bar */}
                    <div className="flex gap-1 justify-between px-3 py-2 border-b border-[#A100FF]/10">
                      {REACTION_EMOJIS.map(emoji => (
                        <button key={emoji} onClick={() => { onReaction?.(msg.id, emoji); setContextMessageId(null); }}
                          className="text-lg hover:scale-125 transition-transform">{emoji}</button>
                      ))}
                    </div>

                    {/* Actions List */}
                    <div className="py-1">
                      {isMine && (
                        <>
                          <button onClick={() => { setEditMessageId(msg.id); setText(msg.text); setContextMessageId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#A100FF]/10 text-[#BFA6D9] transition-colors">
                            <Pencil className="w-4 h-4" /> Edit Message
                          </button>
                          <button onClick={() => { onDeleteMessage?.(msg.id); setContextMessageId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-4 h-4" /> Unsend Message
                          </button>
                        </>
                      )}

                      {canManage && (
                        <>
                          <button onClick={() => { onPinMessage?.(msg.id); setContextMessageId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors">
                            {pinnedMessageId === msg.id ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                            {pinnedMessageId === msg.id ? 'Unpin Message' : 'Pin to Top'}
                          </button>
                          <button onClick={() => { onHighlightMessage?.(msg.id); setContextMessageId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#FF00C8] hover:bg-[#FF00C8]/10 transition-colors">
                            {msg.isHighlighted ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                            {msg.isHighlighted ? 'Unhighlight' : 'Highlight Message'}
                          </button>
                        </>
                      )}

                      {!isMine && !canManage && (
                         <div className="px-3 py-2 text-xs text-center text-[#7B5EA0]">
                           Double tap for emojis
                         </div>
                      )}
                    </div>
                  </div>
                )}

                {showActions === msg.sender && canManage && !isMine && (
                  <div className="absolute bottom-full mb-1 right-0 z-50 overflow-hidden animate-fade-in
                    bg-[#150D28]/95 backdrop-blur-xl border border-[#A100FF]/15 rounded-2xl shadow-[0_0_20px_rgba(161,0,255,0.12)]">
                    <button onClick={() => { onKick(msg.sender); setShowActions(null); }} className="block w-full px-4 py-2 text-xs text-left text-red-400 hover:bg-red-500/10 transition-colors">Kick {msg.sender}</button>
                    <button onClick={() => { onPromote(msg.sender); setShowActions(null); }} className="block w-full px-4 py-2 text-xs text-left text-[#FF00C8] hover:bg-[#FF00C8]/10 transition-colors">Promote to Admin</button>
                    <button onClick={() => setShowActions(null)} className="block w-full px-4 py-2 text-xs text-left text-[#BFA6D9] hover:bg-[#A100FF]/10 transition-colors">Cancel</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {typingUsers.length > 0 && (
          <div className="flex items-end gap-2 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-[#A100FF]/25 flex items-center justify-center text-xs font-bold text-[#A100FF]">
              {typingUsers[0][0].toUpperCase()}
            </div>
            <div className="px-4 py-3 rounded-2xl bg-[#A100FF]/5 border border-[#A100FF]/10">
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full typing-dot" />
                  <span className="w-2 h-2 rounded-full typing-dot" />
                  <span className="w-2 h-2 rounded-full typing-dot" />
                </div>
                <span className="text-xs ml-1 text-[#7B5EA0]">{typingUsers.join(', ')}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!atBottom && (
        <button onClick={scrollToBottom} className="absolute bottom-20 right-6 p-2 rounded-xl premium-btn text-white animate-fade-in z-10 glow-pulse">
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {showEmoji && (
        <div className="absolute bottom-16 left-0 right-0 sm:right-auto sm:left-4 z-20 animate-fade-in flex justify-center w-full sm:w-auto">
          <EmojiPicker onEmojiClick={handleEmoji} theme="dark" emojiStyle="native" lazyLoadEmojis={false} height={350} width={320} />
        </div>
      )}

      {/* Input Area */}
      {editMessageId && (
        <div className="px-4 py-2 text-xs flex items-center justify-between -mb-1
          bg-[#A100FF]/8 text-[#BFA6D9] border-t border-[#A100FF]/10">
          <div className="flex items-center gap-2">
            <Pencil className="w-3.5 h-3.5 text-[#A100FF]" />
            <span>Editing message...</span>
          </div>
          <button onClick={handleCancelEdit} className="font-semibold hover:text-[#FF00C8] transition-colors">Cancel</button>
        </div>
      )}
      <div className={`px-4 py-3 border-t border-[#A100FF]/10 ${editMessageId ? 'bg-[#0B0616]/50' : ''}`}>
        {canSend ? (
          <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 transition-all
            bg-[#A100FF]/5 border border-[#A100FF]/10 focus-within:border-[#A100FF]/30 focus-within:shadow-[0_0_15px_rgba(161,0,255,0.1)]">
            {!editMessageId && (
              <>
                <button onClick={() => setShowEmoji(!showEmoji)}
                  className={`p-1 rounded-lg transition-colors ${showEmoji ? 'text-[#A100FF]' : 'text-[#7B5EA0] hover:text-[#BFA6D9]'}`}>
                  <Smile className="w-5 h-5" />
                </button>
                <button onClick={handleSOS} title="Send SOS Location"
                  className="p-1 rounded-lg transition-colors text-red-400/60 hover:text-red-400">
                  <MapPin className="w-5 h-5" />
                </button>
              </>
            )}
            <input id="message-input" type="text" value={text} onChange={handleChange}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              onClick={() => { setShowEmoji(false); setContextMessageId(null); }}
              placeholder={editMessageId ? "Edit your message..." : "/ping · /color red · @mention · **bold**"}
              className="flex-1 bg-transparent outline-none text-sm text-[#F5E9FF] placeholder-[#7B5EA0]"
              autoFocus={!!editMessageId} />
            <button id="send-btn" onClick={handleSend} disabled={!text.trim()}
              className={`p-2 rounded-xl transition-all ${text.trim() ? 'premium-btn text-white glow-pulse' : 'text-[#7B5EA0]'}`}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-center py-3 rounded-2xl bg-[#A100FF]/5 border border-[#A100FF]/10 text-[#7B5EA0]">
            <p className="text-sm font-medium">📢 Announcement Room</p>
            <p className="text-xs">Only admins can send messages</p>
          </div>
        )}
      </div>
    </div>
  );
}
