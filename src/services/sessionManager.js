const crypto = require('crypto');

class SessionManager {
  constructor() {
    this.sessions = new Map();

    // Configurable limits - can be overridden via environment variables
    this.maxHistoryLength = parseInt(process.env.SESSION_MAX_HISTORY) || 50;
    this.sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MS) || (30 * 60 * 1000);

    // Log configuration
    console.log(`🆔 Session Manager initialized: ${this.maxHistoryLength} messages, ${this.sessionTimeout / 1000 / 60} minutes timeout`);
  }

  /**
   * Get or create a session ID based on request characteristics
   */
  getSessionId(requestBody, userAgent = 'unknown') {
    // Create a unique session ID based on:
    // 1. User agent (VS Code window identifier)
    // 2. Model being used
    // 3. Request characteristics (for better isolation)

    const identifier = `${userAgent}_${requestBody.model || 'default'}_${requestBody.messages?.length || 0}`;
    return crypto.createHash('md5').update(identifier).digest('hex');
  }

  /**
   * Get conversation history for a session
   */
  getSessionHistory(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    // Check if session has expired
    if (Date.now() - session.lastActivity > this.sessionTimeout) {
      this.sessions.delete(sessionId);
      return [];
    }

    return session.messages;
  }

  /**
   * Update session with new messages
   */
  updateSession(sessionId, messages) {
    const session = this.sessions.get(sessionId) || {
      messages: [],
      lastActivity: Date.now(),
      messageCount: 0
    };

    // Update last activity
    session.lastActivity = Date.now();
    session.messageCount += 1;

    // Add new messages, keeping only the last maxHistoryLength
    session.messages = messages.slice(-this.maxHistoryLength);

    // Log session growth for debugging
    if (session.messageCount % 10 === 0) {
      console.log(`🆔 Session ${sessionId.substring(0, 8)}... has ${session.messageCount} messages`);
    }

    this.sessions.set(sessionId, session);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get session statistics
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      totalSessions: this.sessions.size,
      maxHistoryLength: this.maxHistoryLength,
      sessionTimeout: this.sessionTimeout
    };
  }
}

module.exports = { SessionManager };
