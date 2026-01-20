/**
 * DrawingState - Manages the global drawing state and operation history
 * Handles undo/redo operations across all users with conflict resolution
 */
class DrawingState {
  constructor() {
    // Operation history - stores all drawing operations in order
    this.operations = [];
    // Operation counter for unique IDs and ordering
    this.operationCounter = 0;
    // Undo stack - stores operation IDs that have been undone
    this.undoneOperations = new Set();
  }

  /**
   * Add a new drawing operation to the history
   * @param {Object} operation - The drawing operation (stroke, clear, etc.)
   * @returns {Object} The operation with added metadata
   */
  addOperation(operation) {
    const op = {
      ...operation,
      id: this.operationCounter++,
      timestamp: Date.now()
    };
    
    this.operations.push(op);
    
    // Clear redo stack when new operation is added
    this.undoneOperations.clear();
    
    return op;
  }

  /**
   * Undo the last operation that hasn't been undone
   * @returns {Object|null} The operation that was undone, or null
   */
  undo() {
    // Find the last operation that hasn't been undone
    for (let i = this.operations.length - 1; i >= 0; i--) {
      const op = this.operations[i];
      if (!this.undoneOperations.has(op.id)) {
        this.undoneOperations.add(op.id);
        return { type: 'undo', operationId: op.id };
      }
    }
    return null;
  }

  /**
   * Redo the last undone operation
   * @returns {Object|null} The operation that was redone, or null
   */
  redo() {
    // Find the most recently undone operation
    let lastUndoneId = -1;
    for (const op of this.operations) {
      if (this.undoneOperations.has(op.id) && op.id > lastUndoneId) {
        lastUndoneId = op.id;
      }
    }
    
    if (lastUndoneId !== -1) {
      this.undoneOperations.delete(lastUndoneId);
      return { type: 'redo', operationId: lastUndoneId };
    }
    return null;
  }

  /**
   * Get all active operations (not undone)
   * @returns {Array} Array of active operations
   */
  getActiveOperations() {
    return this.operations.filter(op => !this.undoneOperations.has(op.id));
  }

  /**
   * Get the full state for a new user joining
   * @returns {Object} Complete state including operations and metadata
   */
  getFullState() {
    return {
      operations: this.operations,
      undoneOperations: Array.from(this.undoneOperations),
      operationCounter: this.operationCounter
    };
  }

  /**
   * Clear all drawing state
   */
  clear() {
    const clearOp = {
      type: 'clear',
      id: this.operationCounter++,
      timestamp: Date.now()
    };
    
    this.operations.push(clearOp);
    this.undoneOperations.clear();
    
    return clearOp;
  }

  /**
   * Get statistics about the current state
   */
  getStats() {
    return {
      totalOperations: this.operations.length,
      activeOperations: this.getActiveOperations().length,
      undoneOperations: this.undoneOperations.size
    };
  }
}

module.exports = DrawingState;
