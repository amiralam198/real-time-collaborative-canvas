const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const RoomManager = require('./rooms');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  // Performance optimizations
  pingTimeout: 60000,
  pingInterval: 25000
});

const roomManager = new RoomManager();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes (for independent client)
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: roomManager.getAllRooms().length,
    uptime: process.uptime()
  });
});

// API endpoint to get room stats
app.get('/api/rooms/:roomId/stats', (req, res) => {
  const stats = roomManager.getRoomStats(req.params.roomId);
  if (stats) {
    res.json(stats);
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

/**
 * WebSocket Connection Handler
 */
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  let currentRoom = 'default';
  let currentUser = null;

  /**
   * Join a drawing room
   */
  socket.on('join-room', (data) => {
    const { roomId = 'default', userName } = data;
    currentRoom = roomId;
    
    // Join the Socket.IO room
    socket.join(roomId);
    
    // Add user to room manager
    currentUser = roomManager.addUser(roomId, socket.id, { name: userName });
    
    const room = roomManager.getRoom(roomId);
    
    // Send the full canvas state to the new user
    socket.emit('init-canvas', {
      user: currentUser,
      state: room.drawingState.getFullState(),
      users: roomManager.getRoomUsers(roomId)
    });
    
    // Notify other users about the new user
    socket.to(roomId).emit('user-joined', {
      user: currentUser,
      users: roomManager.getRoomUsers(roomId)
    });
    
    console.log(`User ${currentUser.name} joined room ${roomId}`);
  });

  /**
   * Handle drawing stroke events
   */
  socket.on('draw-stroke', (data) => {
    const room = roomManager.getRoom(currentRoom);
    const operation = room.drawingState.addOperation({
      type: 'stroke',
      userId: socket.id,
      userName: currentUser?.name,
      ...data
    });
    
    // Broadcast to all users in the room (including the sender) so everyone
    // receives the authoritative operation with its assigned ID
    io.to(currentRoom).emit('draw-stroke', operation);
  });

  /**
   * Handle cursor movement
   */
  socket.on('cursor-move', (cursor) => {
    roomManager.updateUserCursor(currentRoom, socket.id, cursor);
    
    // Broadcast cursor position to other users
    socket.to(currentRoom).emit('cursor-move', {
      userId: socket.id,
      userName: currentUser?.name,
      color: currentUser?.color,
      cursor: cursor
    });
  });

  /**
   * Handle undo operation
   */
  socket.on('undo', () => {
    const room = roomManager.getRoom(currentRoom);
    const undoResult = room.drawingState.undo();
    
    if (undoResult) {
      // Broadcast undo to all users including sender
      io.to(currentRoom).emit('undo', undoResult);
      console.log(`Undo operation in room ${currentRoom}`);
    }
  });

  /**
   * Handle redo operation
   */
  socket.on('redo', () => {
    const room = roomManager.getRoom(currentRoom);
    const redoResult = room.drawingState.redo();
    
    if (redoResult) {
      // Broadcast redo to all users including sender
      io.to(currentRoom).emit('redo', redoResult);
      console.log(`Redo operation in room ${currentRoom}`);
    }
  });

  /**
   * Handle clear canvas
   */
  socket.on('clear-canvas', () => {
    const room = roomManager.getRoom(currentRoom);
    const clearOp = room.drawingState.clear();
    
    // Broadcast clear to all users including sender
    io.to(currentRoom).emit('clear-canvas', clearOp);
    console.log(`Canvas cleared in room ${currentRoom}`);
  });

  /**
   * Handle tool change (for showing other users what tool someone is using)
   */
  socket.on('tool-change', (tool) => {
    socket.to(currentRoom).emit('user-tool-change', {
      userId: socket.id,
      userName: currentUser?.name,
      tool: tool
    });
  });

  /**
   * Request current room stats
   */
  socket.on('get-room-stats', () => {
    const stats = roomManager.getRoomStats(currentRoom);
    socket.emit('room-stats', stats);
  });

  /**
   * Handle disconnection
   */
  socket.on('disconnect', () => {
    if (currentRoom && currentUser) {
      roomManager.removeUser(currentRoom, socket.id);
      
      // Notify other users
      socket.to(currentRoom).emit('user-left', {
        userId: socket.id,
        userName: currentUser.name,
        users: roomManager.getRoomUsers(currentRoom)
      });
      
      console.log(`User ${currentUser.name} left room ${currentRoom}`);
    }
    
    console.log(`User disconnected: ${socket.id}`);
  });

  /**
   * Handle errors
   */
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  🎨 Collaborative Canvas Server Running              ║
║                                                       ║
║  📍 Port: ${PORT}                                     ║
║  🌐 URL: http://localhost:${PORT}                    ║
║  📊 Health: http://localhost:${PORT}/health          ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
