# 💬 ChatSphere — Real-time Private Chat

A modern, fast, lightweight real-time chat application with glassmorphism UI.

## ✨ Features

- **Real-time messaging** via Socket.io WebSockets
- **Private rooms** with unique codes (create & join)
- **In-memory storage** — blazing fast, no database
- **Roles system** — Owner, Admin, Member
- **Admin tools** — Kick users, promote to admin
- **Dashboard** — Stats, leaderboard, engagement metrics
- **Emoji picker** built-in
- **Typing indicators** — see who's typing
- **Online/offline status** for all members
- **Sound notifications** with toggle
- **Dark/Light mode** toggle
- **Glassmorphism UI** with smooth animations
- **Fully responsive** — works on mobile & desktop
- **Rate limiting** — anti-spam protection
- **XSS protection** — all inputs sanitized

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install server deps
cd server
npm install

# Install client deps
cd ../client
npm install
```

### 2. Start the Server

```bash
cd server
npm run dev
```

Server runs on `http://localhost:3001`

### 3. Start the Client

```bash
cd client
npm run dev
```

Client runs on `http://localhost:5173`

### 4. Open & Chat!

1. Open `http://localhost:5173` in your browser
2. Enter a username
3. Create a room or join with a code
4. Share the room code with friends
5. Start chatting! 🎉

## 📁 Project Structure

```
├── server/
│   ├── package.json
│   └── index.js          # Express + Socket.io server
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── index.css        # Global styles + glassmorphism
│       ├── App.jsx          # Main app + socket logic
│       ├── context/
│       │   └── ThemeContext.jsx
│       ├── pages/
│       │   └── Home.jsx     # Login + room creation
│       ├── components/
│       │   ├── Chat.jsx     # Chat layout
│       │   ├── Sidebar.jsx  # Room list
│       │   ├── TopBar.jsx   # Room header
│       │   ├── MessageArea.jsx  # Messages + input
│       │   └── Dashboard.jsx    # Stats panel
│       └── utils/
│           └── sounds.js    # Notification sounds
└── README.md
```

## ⚙️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS 3 |
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Storage | In-memory (JS objects) |
| Icons | Lucide React |
| Emojis | emoji-picker-react |

## 💡 How It Works

- **No database** — messages stored in server RAM
- **100 message limit** per room (oldest auto-deleted)
- **Messages are temporary** — lost on server restart
- **Rooms persist** until server restarts or all members leave
- **Rate limiting** — max 5 messages per 3 seconds per user

## 🔐 Security

- XSS prevention via input sanitization
- Rate limiting to prevent spam
- Room access only via valid codes
- No sensitive data exposure
- Helmet.js security headers
