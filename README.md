# Real-Time Collaborative Drawing Canvas

A multi-user drawing application where multiple people can draw simultaneously on the same canvas with real-time synchronization using WebSockets.

![Collaborative Canvas](https://img.shields.io/badge/status-ready-brightgreen) ![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

> **✨ New:** Client and server can now run independently! See [Quick Reference](#-quick-start) or [Independent Setup Guide](INDEPENDENT_SETUP.md) for details.

## ✨ Features

### Core Functionality
- **Real-time Synchronization** - See other users' drawings as they draw, not after they finish
- **Drawing Tools** - Brush and eraser with customizable colors and stroke widths
- **User Indicators** - Live cursor positions showing where other users are drawing
- **Global Undo/Redo** - Works across all users with proper conflict resolution
- **User Management** - Visual display of online users with color-coded identification
- **Room System** - Support for multiple isolated canvas rooms

### Technical Highlights
- **Raw Canvas API** - No drawing libraries, all canvas operations implemented from scratch
- **Optimized Performance** - Path optimization, efficient redrawing, 60 FPS rendering
- **WebSocket Architecture** - Socket.io for reliable real-time communication
- **Mobile Support** - Touch events for drawing on mobile devices
- **Auto-reconnection** - Automatic reconnection with state recovery
- **Latency Monitoring** - Real-time display of connection latency

## 🌐 Live Demo

**Deploy URL**: Will be added after deployment

> **Note**: WebSocket apps require server deployment (Heroku, Railway, DigitalOcean). Vercel/Netlify support static sites only.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 14.0.0
- npm or yarn
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone or download the repository**
```bash
cd collaborative-canvas
```

2. **Install dependencies**
```bash
npm install
```

### Option 1: Run Everything Together (Recommended for Quick Testing)

**Start server (serves both backend and frontend)**
```bash
npm start
```

Then open your browser to `http://localhost:3000`

### Option 2: Run Client and Server Independently (Better for Development)

**Terminal 1 - Start the server:**
```bash
npm run server
```

**Terminal 2 - Start the client:**
```bash
npm run client
```

Then open your browser to:
- **Client:** `http://localhost:8080` (frontend)
- **Server API:** `http://localhost:3000` (backend/WebSocket)

### Option 3: Run Both Concurrently (One Command)

```bash
npm run dev
```

This will start both server (port 3000) and client (port 8080) in parallel.

---

## 🎮 Available Scripts

- `npm start` - Start server only (also serves static files)
- `npm run server` - Start server only
- `npm run server:dev` - Start server with auto-reload (nodemon)
- `npm run client` - Start client only (port 8080)
- `npm run dev` - Run both server and client concurrently
- `npm run both` - Run both server and client concurrently (alternative)

The server will start on port 3000 by default. You'll see:
```
╔═══════════════════════════════════════════════════════╗
║  🎨 Collaborative Canvas Server Running              ║
║                                                       ║
║  📍 Port: 3000                                        ║
║  🌐 URL: http://localhost:3000                       ║
║  📊 Health: http://localhost:3000/health             ║
╚═══════════════════════════════════════════════════════╝
```

## 🧪 Testing with Multiple Users

### Local Testing
1. Open `http://localhost:3000` in multiple browser windows/tabs
2. Enter different usernames in each window
3. Use the same room ID to collaborate on the same canvas
4. Draw in one window and watch it appear in real-time in others

### Network Testing
1. Start the server on your machine
2. Find your local IP address (e.g., `192.168.1.100`)
3. Share `http://YOUR_IP:3000` with other users on the same network
4. Users can join from different devices

### Different Rooms
- Users can create isolated drawing sessions by entering different room IDs
- Share the room ID with collaborators to work on the same canvas

## 🎮 Usage

### Controls

**Drawing Tools**
- **Brush** - Click the brush icon or press `B`
- **Eraser** - Click the eraser icon or press `E`

**Keyboard Shortcuts**
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` - Redo
- `B` - Switch to brush
- `E` - Switch to eraser

**Drawing**
- Click and drag on canvas to draw
- Adjust brush size with the slider (1-50px)
- Choose colors from the color picker or preset colors
- Clear canvas with the Clear button (affects all users)

**Interface Elements**
- **Connection Status** - Top bar shows connection state and latency
- **Online Users** - Right panel displays all connected users with their colors
- **Performance Stats** - FPS counter and operation count
- **Room Info** - Current room ID displayed in the right panel

## 📁 Project Structure

```
collaborative-canvas/
├── client/                  # Frontend files
│   ├── index.html          # Main HTML structure
│   ├── style.css           # UI styling
│   ├── canvas.js           # Canvas drawing logic
│   ├── websocket.js        # WebSocket client
│   └── main.js             # Application initialization
├── server/                  # Backend files
│   ├── server.js           # Express + Socket.io server
│   ├── rooms.js            # Room management
│   └── drawing-state.js    # Canvas state management
├── package.json            # Dependencies
├── README.md               # This file
└── ARCHITECTURE.md         # Technical documentation
```

## 🔧 Configuration

### Server Configuration

Edit `server/server.js` to modify:
- CORS settings
- WebSocket ping/pong intervals
- Connection timeout settings
- Port (default: 3000)

### Client Configuration

Edit `client/config.js` to set the server URL:

```javascript
// For local development (independent client)
const SERVER_URL = 'http://localhost:3000';

// For production
const SERVER_URL = 'https://your-app.herokuapp.com';

// For local network testing
const SERVER_URL = 'http://192.168.1.100:3000';
```

### Environment Variables
You can customize the server by setting environment variables:

```bash
PORT=3000  # Server port (default: 3000)
```

## 🐛 Known Limitations

1. **Canvas Persistence** - Canvas state is stored in memory only. When the server restarts, all drawings are lost. Consider adding database persistence for production use.

2. **Scalability** - Current implementation uses in-memory state management. For large-scale deployments (1000+ concurrent users), consider:
   - Redis for shared state
   - Horizontal scaling with Socket.io adapter
   - Database persistence

3. **Large Operations** - Very large drawings with thousands of operations may experience performance degradation. Consider implementing operation compression or periodic canvas snapshots.

4. **Browser Compatibility** - Tested on modern browsers. May have issues with older browsers that don't fully support Canvas API or WebSockets.

5. **Mobile Experience** - While touch drawing is supported, the UI is optimized for desktop. Mobile UX could be improved.

## 🏗️ Architecture

For detailed technical architecture, data flow diagrams, and implementation decisions, see [ARCHITECTURE.md](ARCHITECTURE.md).

Key architectural decisions:
- **Operation-based CRDT** - Global undo/redo using operation history
- **Event streaming** - Real-time stroke data transmission during drawing
- **Path optimization** - Douglas-Peucker-style algorithm for reducing point count
- **Client-side prediction** - Immediate local feedback with server reconciliation

## 🎯 Performance

- **60 FPS** rendering on modern hardware
- **<50ms latency** on local networks
- **Optimized path rendering** with quadratic curves for smoothness
- **Throttled cursor updates** (20 updates/second) to reduce bandwidth
- **Efficient canvas operations** using destination-out for eraser

## 🚢 Deployment

### Heroku
```bash
# Install Heroku CLI and login
heroku create your-app-name
git push heroku main
heroku open
```

### Vercel/Netlify
For static hosting with serverless functions, you'll need to adapt the server to serverless architecture.

### Docker
```dockerfile
FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 API Endpoints

### REST API
- `GET /health` - Server health check
- `GET /api/rooms/:roomId/stats` - Get room statistics

### WebSocket Events

**Client → Server**
- `join-room` - Join a drawing room
- `draw-stroke` - Send drawing stroke
- `cursor-move` - Update cursor position
- `undo` - Request undo operation
- `redo` - Request redo operation
- `clear-canvas` - Request canvas clear
- `tool-change` - Notify tool change

**Server → Client**
- `init-canvas` - Initialize canvas state
- `draw-stroke` - Broadcast drawing stroke
- `cursor-move` - Broadcast cursor position
- `undo` - Broadcast undo operation
- `redo` - Broadcast redo operation
- `clear-canvas` - Broadcast canvas clear
- `user-joined` - User joined notification
- `user-left` - User left notification

## ⚠️ Known Limitations

- **Browser Compatibility**: Tested on Chrome, Firefox, Safari. IE not supported
- **Mobile Experience**: Touch drawing works but UI is optimized for desktop
- **No Persistence**: Canvas state is lost when all users disconnect
- **No Authentication**: Users identified by name only, no user accounts
- **Memory Usage**: Large operation history may impact performance over long sessions
- **Network Dependency**: Requires stable internet connection for real-time sync
- **Room Cleanup**: Inactive rooms remain in memory until server restart

## ⏱️ Development Time

Total time spent: **~6-8 hours**
- Architecture & Planning: 1 hour
- Backend Implementation: 2 hours
- Frontend Canvas & UI: 2.5 hours
- WebSocket Integration: 1 hour
- Testing & Debugging: 1 hour
- Documentation: 0.5 hour

## 🤝 Contributing

This is a technical assignment project. For production use, consider:
- Adding user authentication
- Implementing canvas persistence (database)
- Adding more drawing tools (shapes, text, images)
- Implementing canvas export (PNG, SVG)
- Adding version history and playback
- Improving mobile UI/UX

## 📝 License

MIT License - feel free to use this project for learning or as a starting point for your own collaborative canvas application.

## 🙏 Acknowledgments

Built using:
- [Socket.io](https://socket.io/) - Real-time WebSocket communication
- [Express.js](https://expressjs.com/) - Web server framework
- Native HTML5 Canvas API - All drawing operations

---

**Made with ❤️ for collaborative creativity**

For questions or issues, please create an issue in the repository.
