/**
 * Main Application - Integrates all components
 * Handles UI interactions and coordinates between Canvas and WebSocket
 */

// Initialize managers
let canvasManager;
let wsManager;
let cursorsLayer;
let userCursors = new Map();

// Throttle function for performance
function throttle(func, delay) {
  let timeoutId;
  let lastExecTime = 0;
  
  return function(...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime < delay) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastExecTime = currentTime;
        func.apply(this, args);
      }, delay);
    } else {
      lastExecTime = currentTime;
      func.apply(this, args);
    }
  };
}

/**
 * Initialize the application
 */
async function init() {
  // Show welcome modal
  showWelcomeModal();
}

/**
 * Show welcome modal
 */
function showWelcomeModal() {
  const modal = document.getElementById('welcome-modal');
  const joinBtn = document.getElementById('join-btn');
  const nameInput = document.getElementById('user-name-input');
  const roomInput = document.getElementById('room-id-input');
  
  // Handle Enter key
  nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinBtn.click();
  });
  
  roomInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinBtn.click();
  });
  
  joinBtn.addEventListener('click', async () => {
    const userName = nameInput.value.trim() || 'Anonymous';
    const roomId = roomInput.value.trim() || 'default';
    
    modal.classList.add('hidden');
    await startApplication(userName, roomId);
  });
}

/**
 * Start the main application
 */
async function startApplication(userName, roomId) {
  updateStatus('Connecting...', 'connecting');
  
  try {
    // Initialize canvas manager
    const canvas = document.getElementById('canvas');
    canvasManager = new CanvasManager(canvas);
    cursorsLayer = document.getElementById('cursors-layer');
    
    // Initialize WebSocket manager
    wsManager = new WebSocketManager();
    await wsManager.connect();
    
    // Setup event handlers
    setupCanvasHandlers();
    setupWebSocketHandlers();
    setupUIHandlers();
    setupKeyboardShortcuts();
    
    // Join room
    wsManager.joinRoom(roomId, userName);
    document.getElementById('room-id').textContent = roomId;
    
    updateStatus('Connected', 'connected');
    
  } catch (error) {
    console.error('Failed to start application:', error);
    updateStatus('Connection Failed', 'disconnected');
    alert('Failed to connect to server. Please refresh and try again.');
  }
}

/**
 * Setup canvas event handlers
 */
function setupCanvasHandlers() {
  // Stroke complete - send to server
  canvasManager.onStrokeComplete = (strokeData) => {
    wsManager.sendStroke(strokeData);
  };
  
  // Cursor move - send to server (throttled)
  const throttledCursorMove = throttle((cursor) => {
    wsManager.sendCursorMove(cursor);
  }, 50);
  
  canvasManager.onCursorMove = throttledCursorMove;
  
  // Performance updates
  canvasManager.onPerformanceUpdate = (stats) => {
    document.getElementById('fps-counter').textContent = stats.fps;
    document.getElementById('ops-counter').textContent = stats.operations;
  };
}

/**
 * Setup WebSocket event handlers
 */
function setupWebSocketHandlers() {
  // Canvas initialization
  wsManager.on('initCanvas', (data) => {
    canvasManager.initializeState(data.state);
    updateUsersList(data.users);
    updateStatus(`Connected as ${data.user.name}`, 'connected');
  });
  
  // Draw stroke from server (including own strokes with server-assigned IDs)
  wsManager.on('drawStroke', (operation) => {
    // Always add operations from server as they have authoritative IDs
    // This ensures undo/redo works correctly for all users
    canvasManager.addOperation(operation);
  });
  
  // Undo operation
  wsManager.on('undo', (undoData) => {
    canvasManager.handleUndo(undoData);
  });
  
  // Redo operation
  wsManager.on('redo', (redoData) => {
    canvasManager.handleRedo(redoData);
  });
  
  // Clear canvas
  wsManager.on('clearCanvas', (clearData) => {
    canvasManager.handleClear();
  });
  
  // User joined
  wsManager.on('userJoined', (data) => {
    updateUsersList(data.users);
    showNotification(`${data.user.name} joined`, 'success');
  });
  
  // User left
  wsManager.on('userLeft', (data) => {
    updateUsersList(data.users);
    removeUserCursor(data.userId);
    showNotification(`${data.userName} left`, 'info');
  });
  
  // Cursor move from another user
  wsManager.on('cursorMove', (data) => {
    updateUserCursor(data);
  });
  
  // Connection events
  wsManager.on('connect', () => {
    updateStatus('Connected', 'connected');
  });
  
  wsManager.on('disconnect', () => {
    updateStatus('Disconnected', 'disconnected');
  });
}

/**
 * Setup UI event handlers
 */
function setupUIHandlers() {
  // Tool buttons
  document.getElementById('tool-brush').addEventListener('click', () => {
    setTool('brush');
  });
  
  document.getElementById('tool-eraser').addEventListener('click', () => {
    setTool('eraser');
  });
  
  // Color picker
  const colorPicker = document.getElementById('color-picker');
  colorPicker.addEventListener('input', (e) => {
    setColor(e.target.value);
  });
  
  // Preset colors
  document.querySelectorAll('.color-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      setColor(color);
      colorPicker.value = color;
    });
  });
  
  // Brush size
  const brushSize = document.getElementById('brush-size');
  const brushSizeValue = document.getElementById('brush-size-value');
  
  brushSize.addEventListener('input', (e) => {
    const size = parseInt(e.target.value);
    setBrushSize(size);
    brushSizeValue.textContent = size + 'px';
    updateBrushPreview(size, canvasManager.color);
  });
  
  // Initialize brush preview
  updateBrushPreview(parseInt(brushSize.value), canvasManager.color);
  
  // Action buttons
  document.getElementById('undo-btn').addEventListener('click', () => {
    wsManager.requestUndo();
  });
  
  document.getElementById('redo-btn').addEventListener('click', () => {
    wsManager.requestRedo();
  });
  
  document.getElementById('clear-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the canvas for everyone?')) {
      wsManager.requestClear();
    }
  });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      wsManager.requestUndo();
    }
    
    // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      wsManager.requestRedo();
    }
    
    // B for brush
    if (e.key === 'b' || e.key === 'B') {
      setTool('brush');
    }
    
    // E for eraser
    if (e.key === 'e' || e.key === 'E') {
      setTool('eraser');
    }
  });
}

/**
 * Set drawing tool
 */
function setTool(tool) {
  canvasManager.setTool(tool);
  wsManager.notifyToolChange(tool);
  
  // Update UI
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (tool === 'brush') {
    document.getElementById('tool-brush').classList.add('active');
  } else if (tool === 'eraser') {
    document.getElementById('tool-eraser').classList.add('active');
  }
}

/**
 * Set drawing color
 */
function setColor(color) {
  canvasManager.setColor(color);
  updateBrushPreview(canvasManager.brushSize, color);
}

/**
 * Set brush size
 */
function setBrushSize(size) {
  canvasManager.setBrushSize(size);
}

/**
 * Update brush preview
 */
function updateBrushPreview(size, color) {
  const preview = document.getElementById('brush-preview-dot');
  preview.style.width = size + 'px';
  preview.style.height = size + 'px';
  preview.style.background = color;
}

/**
 * Update users list
 */
function updateUsersList(users) {
  const usersList = document.getElementById('users-list');
  const userCount = document.getElementById('user-count');
  
  userCount.textContent = users.length;
  
  usersList.innerHTML = users.map(user => `
    <div class="user-item">
      <div class="user-color" style="background: ${user.color}"></div>
      <span class="user-name">${user.name}</span>
      <div class="user-status"></div>
    </div>
  `).join('');
}

/**
 * Update user cursor position
 */
function updateUserCursor(data) {
  const { userId, userName, color, cursor } = data;
  
  let cursorElement = userCursors.get(userId);
  
  if (!cursorElement) {
    cursorElement = document.createElement('div');
    cursorElement.className = 'user-cursor';
    cursorElement.innerHTML = `
      <div class="cursor-dot" style="background: ${color}"></div>
      <div class="cursor-label">${userName}</div>
    `;
    cursorsLayer.appendChild(cursorElement);
    userCursors.set(userId, cursorElement);
  }
  
  // Update position
  if (cursor) {
    const rect = canvasManager.canvas.getBoundingClientRect();
    cursorElement.style.left = (rect.left + cursor.x) + 'px';
    cursorElement.style.top = (rect.top + cursor.y) + 'px';
    cursorElement.style.display = 'block';
  } else {
    cursorElement.style.display = 'none';
  }
}

/**
 * Remove user cursor
 */
function removeUserCursor(userId) {
  const cursorElement = userCursors.get(userId);
  if (cursorElement) {
    cursorElement.remove();
    userCursors.delete(userId);
  }
}

/**
 * Update connection status
 */
function updateStatus(text, status) {
  const statusText = document.getElementById('status-text');
  const statusIndicator = document.getElementById('status-indicator');
  const latencyElement = document.getElementById('latency');
  
  statusText.textContent = text;
  statusIndicator.className = 'status-indicator ' + status;
  
  // Update latency
  if (wsManager && wsManager.isConnected()) {
    const latency = wsManager.getLatency();
    latencyElement.textContent = latency > 0 ? `${latency}ms` : '';
  }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  // Simple console notification for now
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Update latency periodically
setInterval(() => {
  if (wsManager && wsManager.isConnected()) {
    const latency = wsManager.getLatency();
    const latencyElement = document.getElementById('latency');
    if (latency > 0) {
      latencyElement.textContent = `${latency}ms`;
      
      // Color code based on latency
      if (latency < 50) {
        latencyElement.style.color = '#2ECC71';
      } else if (latency < 100) {
        latencyElement.style.color = '#F39C12';
      } else {
        latencyElement.style.color = '#E74C3C';
      }
    }
  }
}, 1000);

// Start application when page loads
window.addEventListener('DOMContentLoaded', init);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (wsManager) {
    wsManager.disconnect();
  }
});
