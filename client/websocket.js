/**
 * WebSocketManager - Handles all WebSocket communications
 * Manages connection state, event emission, and reconnection logic
 */
class WebSocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomId = 'default';
    this.currentUser = null;
    this.currentUserId = null;
    this.users = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    // Latency tracking
    this.latency = 0;
    this.lastPingTime = 0;
    
    // Event handlers
    this.eventHandlers = {
      onConnect: null,
      onDisconnect: null,
      onInitCanvas: null,
      onDrawStroke: null,
      onUndo: null,
      onRedo: null,
      onClearCanvas: null,
      onUserJoined: null,
      onUserLeft: null,
      onCursorMove: null,
      onUserToolChange: null,
      onRoomStats: null
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(serverUrl = SERVER_URL || '') {
    return new Promise((resolve, reject) => {
      try {
        // Initialize Socket.IO connection
        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: this.reconnectDelay,
          reconnectionAttempts: this.maxReconnectAttempts
        });

        // Connection successful
        this.socket.on('connect', () => {
          console.log('✓ Connected to server');
          this.connected = true;
          this.currentUserId = this.socket.id;
          this.reconnectAttempts = 0;
          
          if (this.eventHandlers.onConnect) {
            this.eventHandlers.onConnect();
          }
          
          // Start latency monitoring
          this.startLatencyMonitoring();
          
          resolve();
        });

        // Connection error
        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.connected = false;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Failed to connect after multiple attempts'));
          }
        });

        // Disconnection
        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected:', reason);
          this.connected = false;
          
          if (this.eventHandlers.onDisconnect) {
            this.eventHandlers.onDisconnect(reason);
          }
        });

        // Reconnection attempt
        this.socket.on('reconnect_attempt', (attemptNumber) => {
          console.log(`Reconnection attempt ${attemptNumber}...`);
          this.reconnectAttempts = attemptNumber;
        });

        // Successful reconnection
        this.socket.on('reconnect', (attemptNumber) => {
          console.log('✓ Reconnected successfully');
          this.reconnectAttempts = 0;
          
          // Rejoin the room after reconnection
          if (this.roomId && this.currentUser) {
            this.joinRoom(this.roomId, this.currentUser.name);
          }
        });

        // Setup event listeners
        this.setupEventListeners();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Setup all WebSocket event listeners
   */
  setupEventListeners() {
    // Canvas initialization
    this.socket.on('init-canvas', (data) => {
      console.log('Canvas initialized:', data);
      this.currentUser = data.user;
      this.users = data.users;
      
      if (this.eventHandlers.onInitCanvas) {
        this.eventHandlers.onInitCanvas(data);
      }
    });

    // Drawing stroke from another user
    this.socket.on('draw-stroke', (operation) => {
      if (this.eventHandlers.onDrawStroke) {
        this.eventHandlers.onDrawStroke(operation);
      }
    });

    // Cursor movement from another user
    this.socket.on('cursor-move', (data) => {
      if (this.eventHandlers.onCursorMove) {
        this.eventHandlers.onCursorMove(data);
      }
    });

    // Undo operation
    this.socket.on('undo', (undoData) => {
      if (this.eventHandlers.onUndo) {
        this.eventHandlers.onUndo(undoData);
      }
    });

    // Redo operation
    this.socket.on('redo', (redoData) => {
      if (this.eventHandlers.onRedo) {
        this.eventHandlers.onRedo(redoData);
      }
    });

    // Clear canvas
    this.socket.on('clear-canvas', (clearData) => {
      if (this.eventHandlers.onClearCanvas) {
        this.eventHandlers.onClearCanvas(clearData);
      }
    });

    // User joined
    this.socket.on('user-joined', (data) => {
      console.log('User joined:', data.user.name);
      this.users = data.users;
      
      if (this.eventHandlers.onUserJoined) {
        this.eventHandlers.onUserJoined(data);
      }
    });

    // User left
    this.socket.on('user-left', (data) => {
      console.log('User left:', data.userName);
      this.users = data.users;
      
      if (this.eventHandlers.onUserLeft) {
        this.eventHandlers.onUserLeft(data);
      }
    });

    // Tool change from another user
    this.socket.on('user-tool-change', (data) => {
      if (this.eventHandlers.onUserToolChange) {
        this.eventHandlers.onUserToolChange(data);
      }
    });

    // Room statistics
    this.socket.on('room-stats', (stats) => {
      if (this.eventHandlers.onRoomStats) {
        this.eventHandlers.onRoomStats(stats);
      }
    });

    // Pong response for latency measurement
    this.socket.on('pong', () => {
      this.latency = Date.now() - this.lastPingTime;
    });
  }

  /**
   * Join a drawing room
   */
  joinRoom(roomId, userName) {
    this.roomId = roomId;
    
    this.socket.emit('join-room', {
      roomId: roomId,
      userName: userName
    });
  }

  /**
   * Send drawing stroke to server
   */
  sendStroke(strokeData) {
    if (!this.connected) {
      console.warn('Not connected to server');
      return;
    }
    
    this.socket.emit('draw-stroke', strokeData);
  }

  /**
   * Send cursor position to server
   */
  sendCursorMove(cursor) {
    if (!this.connected) return;
    
    // Throttle cursor updates to reduce bandwidth
    this.socket.emit('cursor-move', cursor);
  }

  /**
   * Request undo operation
   */
  requestUndo() {
    if (!this.connected) return;
    this.socket.emit('undo');
  }

  /**
   * Request redo operation
   */
  requestRedo() {
    if (!this.connected) return;
    this.socket.emit('redo');
  }

  /**
   * Request clear canvas
   */
  requestClear() {
    if (!this.connected) return;
    this.socket.emit('clear-canvas');
  }

  /**
   * Notify tool change
   */
  notifyToolChange(tool) {
    if (!this.connected) return;
    this.socket.emit('tool-change', tool);
  }

  /**
   * Request room statistics
   */
  requestRoomStats() {
    if (!this.connected) return;
    this.socket.emit('get-room-stats');
  }

  /**
   * Start latency monitoring
   */
  startLatencyMonitoring() {
    setInterval(() => {
      if (this.connected) {
        this.lastPingTime = Date.now();
        this.socket.emit('ping');
      }
    }, 3000);
  }

  /**
   * Get current latency
   */
  getLatency() {
    return this.latency;
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (this.eventHandlers.hasOwnProperty('on' + event.charAt(0).toUpperCase() + event.slice(1))) {
      this.eventHandlers['on' + event.charAt(0).toUpperCase() + event.slice(1)] = handler;
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get all users
   */
  getUsers() {
    return this.users;
  }

  /**
   * Get connection status details
   */
  getStatus() {
    return {
      connected: this.connected,
      latency: this.latency,
      roomId: this.roomId,
      userId: this.currentUser?.id,
      userName: this.currentUser?.name,
      userCount: this.users.length
    };
  }
}
