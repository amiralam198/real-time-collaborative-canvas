const DrawingState = require('./drawing-state');

/**
 * RoomManager - Manages multiple drawing rooms
 * Each room has its own canvas state and user list
 */
class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.userColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B739', '#52B788', '#E76F51', '#2A9D8F'
    ];
  }

  /**
   * Get or create a room
   * @param {string} roomId - The room identifier
   * @returns {Object} The room object
   */
  getRoom(roomId = 'default') {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        drawingState: new DrawingState(),
        users: new Map(), // socketId -> user object
        usedColors: new Set(),
        createdAt: Date.now()
      });
    }
    return this.rooms.get(roomId);
  }

  /**
   * Add a user to a room
   * @param {string} roomId - The room identifier
   * @param {string} socketId - The user's socket ID
   * @param {Object} userInfo - User information (name, etc.)
   * @returns {Object} The user object with assigned color
   */
  addUser(roomId, socketId, userInfo) {
    const room = this.getRoom(roomId);
    
    // Assign a unique color to the user
    const availableColors = this.userColors.filter(
      color => !room.usedColors.has(color)
    );
    const color = availableColors.length > 0 
      ? availableColors[0] 
      : this.userColors[room.users.size % this.userColors.length];
    
    room.usedColors.add(color);
    
    const user = {
      id: socketId,
      name: userInfo.name || `User${room.users.size + 1}`,
      color: color,
      cursor: null,
      joinedAt: Date.now()
    };
    
    room.users.set(socketId, user);
    return user;
  }

  /**
   * Remove a user from a room
   * @param {string} roomId - The room identifier
   * @param {string} socketId - The user's socket ID
   */
  removeUser(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const user = room.users.get(socketId);
    if (user) {
      room.usedColors.delete(user.color);
      room.users.delete(socketId);
    }
    
    // Clean up empty rooms after 5 minutes
    if (room.users.size === 0) {
      setTimeout(() => {
        const currentRoom = this.rooms.get(roomId);
        if (currentRoom && currentRoom.users.size === 0) {
          this.rooms.delete(roomId);
        }
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Update user's cursor position
   * @param {string} roomId - The room identifier
   * @param {string} socketId - The user's socket ID
   * @param {Object} cursor - Cursor position {x, y}
   */
  updateUserCursor(roomId, socketId, cursor) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const user = room.users.get(socketId);
    if (user) {
      user.cursor = cursor;
    }
  }

  /**
   * Get all users in a room
   * @param {string} roomId - The room identifier
   * @returns {Array} Array of user objects
   */
  getRoomUsers(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    
    return Array.from(room.users.values());
  }

  /**
   * Get user by socket ID
   * @param {string} roomId - The room identifier
   * @param {string} socketId - The user's socket ID
   * @returns {Object|null} The user object or null
   */
  getUser(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return room.users.get(socketId) || null;
  }

  /**
   * Get room statistics
   * @param {string} roomId - The room identifier
   * @returns {Object} Room statistics
   */
  getRoomStats(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    
    return {
      id: roomId,
      userCount: room.users.size,
      users: this.getRoomUsers(roomId),
      drawingStats: room.drawingState.getStats(),
      createdAt: room.createdAt
    };
  }

  /**
   * Get all active rooms
   * @returns {Array} Array of room IDs
   */
  getAllRooms() {
    return Array.from(this.rooms.keys());
  }
}

module.exports = RoomManager;
