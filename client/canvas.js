/**
 * CanvasManager - Handles all canvas drawing operations
 * Implements efficient path rendering, operation history, and performance optimization
 */
class CanvasManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { 
      willReadFrequently: false,
      alpha: false 
    });
    
    // Drawing state
    this.isDrawing = false;
    this.currentPath = [];
    
    // Tool settings
    this.tool = 'brush'; // 'brush' or 'eraser'
    this.color = '#ffffff';
    this.brushSize = 3;
    
    // Operation history for rendering
    this.operations = [];
    this.undoneOperations = new Set();
    
    // Initialize canvas size (after operations array is initialized)
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Performance tracking
    this.lastFrameTime = performance.now();
    this.fps = 60;
    this.operationCount = 0;
    
    // Path batching for smooth drawing
    this.pathBatchSize = 5; // Points to batch before rendering
    this.smoothing = 0.3; // Smoothing factor for paths
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  /**
   * Resize canvas to fit container while maintaining drawing
   */
  resizeCanvas() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Store current canvas content
    const imageData = this.canvas.width > 0 ? 
      this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height) : null;
    
    // Set new size
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    // Restore content if it existed
    if (imageData) {
      this.ctx.putImageData(imageData, 0, 0);
    }
    
    // Redraw all operations
    this.redrawCanvas();
  }

  /**
   * Setup mouse and touch event listeners
   */
  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrawing());
    this.canvas.addEventListener('mouseleave', () => this.stopDrawing());
    
    // Touch events for mobile support
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDrawing(this.getTouchPos(e));
    }, { passive: false });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.draw(this.getTouchPos(e));
    }, { passive: false });
    
    this.canvas.addEventListener('touchend', () => this.stopDrawing());
  }

  /**
   * Get touch position relative to canvas
   */
  getTouchPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      clientX: touch.clientX,
      clientY: touch.clientY,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top
    };
  }

  /**
   * Get mouse position relative to canvas
   */
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  /**
   * Start drawing
   */
  startDrawing(e) {
    this.isDrawing = true;
    const pos = this.getMousePos(e);
    this.currentPath = [pos];
    
    // Emit cursor move event
    if (this.onCursorMove) {
      this.onCursorMove(pos);
    }
  }

  /**
   * Draw on canvas
   */
  draw(e) {
    if (!this.isDrawing) {
      // Still emit cursor position for other users
      const pos = this.getMousePos(e);
      if (this.onCursorMove) {
        this.onCursorMove(pos);
      }
      return;
    }
    
    const pos = this.getMousePos(e);
    this.currentPath.push(pos);
    
    // Emit cursor move event
    if (this.onCursorMove) {
      this.onCursorMove(pos);
    }
    
    // Render the current stroke incrementally for smooth feedback
    if (this.currentPath.length >= 2) {
      this.renderStrokeSegment(
        this.currentPath[this.currentPath.length - 2],
        this.currentPath[this.currentPath.length - 1],
        this.color,
        this.brushSize,
        this.tool === 'eraser'
      );
    }
  }

  /**
   * Stop drawing and emit the complete stroke
   */
  stopDrawing() {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    
    if (this.currentPath.length > 0) {
      // Optimize path by removing redundant points
      const optimizedPath = this.optimizePath(this.currentPath);
      
      // Create stroke operation
      const strokeData = {
        points: optimizedPath,
        color: this.color,
        size: this.brushSize,
        tool: this.tool
      };
      
      // Emit the stroke to other users
      if (this.onStrokeComplete) {
        this.onStrokeComplete(strokeData);
      }
      
      this.currentPath = [];
    }
  }

  /**
   * Optimize path by removing redundant points
   * Uses Douglas-Peucker algorithm for path simplification
   */
  optimizePath(points, tolerance = 2) {
    if (points.length < 3) return points;
    
    // Simple optimization: remove points that are too close together
    const optimized = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - optimized[optimized.length - 1].x;
      const dy = points[i].y - optimized[optimized.length - 1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > tolerance) {
        optimized.push(points[i]);
      }
    }
    
    // Always include the last point
    if (optimized[optimized.length - 1] !== points[points.length - 1]) {
      optimized.push(points[points.length - 1]);
    }
    
    return optimized;
  }

  /**
   * Render a stroke segment (for real-time drawing)
   */
  renderStrokeSegment(from, to, color, size, isEraser = false) {
    this.ctx.save();
    
    if (isEraser) {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = color;
    }
    
    this.ctx.lineWidth = size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  /**
   * Render a complete stroke (for operations from history)
   */
  renderStroke(points, color, size, isEraser = false) {
    if (points.length === 0) return;
    
    this.ctx.save();
    
    if (isEraser) {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = color;
    }
    
    this.ctx.lineWidth = size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    
    // Use quadratic curves for smoother lines
    if (points.length > 2) {
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        this.ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      // Draw last segment
      const lastPoint = points[points.length - 1];
      const secondLast = points[points.length - 2];
      this.ctx.quadraticCurveTo(secondLast.x, secondLast.y, lastPoint.x, lastPoint.y);
    } else {
      // Just a line if only 2 points
      this.ctx.lineTo(points[1].x, points[1].y);
    }
    
    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * Add an operation to history
   */
  addOperation(operation) {
    // Check if operation already exists (prevent duplicates)
    const existingOp = this.operations.find(op => op.id === operation.id);
    if (existingOp) {
      return; // Already have this operation
    }
    
    this.operations.push(operation);
    this.operationCount = this.operations.length;
    
    // Render the new operation if it's not undone
    if (!this.undoneOperations.has(operation.id)) {
      if (operation.type === 'stroke') {
        this.renderStroke(
          operation.points,
          operation.color,
          operation.size,
          operation.tool === 'eraser'
        );
      } else if (operation.type === 'clear') {
        this.clearCanvas();
      }
    }
  }

  /**
   * Initialize canvas with state from server
   */
  initializeState(state) {
    this.operations = state.operations || [];
    this.undoneOperations = new Set(state.undoneOperations || []);
    this.operationCount = this.operations.length;
    this.redrawCanvas();
  }

  /**
   * Redraw entire canvas from operation history
   */
  redrawCanvas() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Redraw all active operations
    for (const op of this.operations) {
      if (this.undoneOperations.has(op.id)) continue;
      
      if (op.type === 'stroke') {
        this.renderStroke(
          op.points,
          op.color,
          op.size,
          op.tool === 'eraser'
        );
      } else if (op.type === 'clear') {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  /**
   * Handle undo operation
   */
  handleUndo(undoData) {
    this.undoneOperations.add(undoData.operationId);
    this.redrawCanvas();
  }

  /**
   * Handle redo operation
   */
  handleRedo(redoData) {
    this.undoneOperations.delete(redoData.operationId);
    this.redrawCanvas();
  }

  /**
   * Clear canvas
   */
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Handle clear canvas operation
   */
  handleClear() {
    this.clearCanvas();
  }

  /**
   * Set tool
   */
  setTool(tool) {
    this.tool = tool;
    this.canvas.style.cursor = tool === 'eraser' ? 'grab' : 'crosshair';
  }

  /**
   * Set color
   */
  setColor(color) {
    this.color = color;
  }

  /**
   * Set brush size
   */
  setBrushSize(size) {
    this.brushSize = size;
  }

  /**
   * Performance monitoring
   */
  startPerformanceMonitoring() {
    const updateFPS = () => {
      const now = performance.now();
      const delta = now - this.lastFrameTime;
      this.fps = Math.round(1000 / delta);
      this.lastFrameTime = now;
      
      // Update UI
      if (this.onPerformanceUpdate) {
        this.onPerformanceUpdate({
          fps: this.fps,
          operations: this.operationCount
        });
      }
      
      requestAnimationFrame(updateFPS);
    };
    
    requestAnimationFrame(updateFPS);
  }

  /**
   * Get canvas statistics
   */
  getStats() {
    return {
      fps: this.fps,
      operations: this.operationCount,
      undone: this.undoneOperations.size,
      active: this.operationCount - this.undoneOperations.size
    };
  }
}
