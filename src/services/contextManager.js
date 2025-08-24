const { Logger } = require('../utils/logger');

class ContextManager {
  constructor() {
    this.logger = new Logger();
    this.maxContextLength = parseInt(process.env.MAX_CONTEXT_LENGTH) || 8192;
    this.sessions = new Map();
    this.contextCache = new Map();

    // Context optimization strategies
    this.optimizationStrategies = {
      'truncate': this._truncateContext,
      'summarize': this._summarizeContext,
      'priority': this._priorityBasedContext,
      'sliding': this._slidingWindowContext,
      'hierarchical': this._hierarchicalContext
    };
  }

  /**
   * Manage context for generate requests
   */
  async manageContext(sessionId, requestBody, selectedModel) {
    try {
      const session = this._getOrCreateSession(sessionId);
      const currentContext = this._extractCurrentContext(requestBody);

      // Analyze context length
      const contextLength = this._estimateContextLength(currentContext);

      if (contextLength <= this.maxContextLength) {
        // Context fits, no optimization needed
        this._updateSessionContext(session, currentContext);
        return currentContext;
      }

      // Context is too long, need optimization
      const optimizedContext = await this._optimizeContext(
        session,
        currentContext,
        selectedModel
      );

      this._updateSessionContext(session, optimizedContext);
      return optimizedContext;

    } catch (error) {
      this.logger.error('Error managing context', { sessionId, error: error.message });
      // Return original context if optimization fails
      return this._extractCurrentContext(requestBody);
    }
  }

  /**
   * Manage context for chat requests
   */
  async manageChatContext(sessionId, requestBody, selectedModel) {
    try {
      const session = this._getOrCreateSession(sessionId);
      const messages = requestBody.messages || [];

      // Build conversation context
      let conversationContext = this._buildConversationContext(session, messages);

      // Check if context needs optimization
      const contextLength = this._estimateContextLength(conversationContext);

      if (contextLength <= this.maxContextLength) {
        // Context fits, update session
        this._updateSessionContext(session, conversationContext);
        return conversationContext;
      }

      // Optimize conversation context
      const optimizedContext = await this._optimizeConversationContext(
        session,
        conversationContext,
        selectedModel
      );

      this._updateSessionContext(session, optimizedContext);
      return optimizedContext;

    } catch (error) {
      this.logger.error('Error managing chat context', { sessionId, error: error.message });
      // Return messages as-is if optimization fails
      return requestBody.messages || [];
    }
  }

  /**
   * Get optimization suggestions for a request
   */
  async getOptimizationSuggestions(requestBody) {
    try {
      const currentContext = this._extractCurrentContext(requestBody);
      const contextLength = this._estimateContextLength(currentContext);

      if (contextLength <= this.maxContextLength) {
        return {
          needsOptimization: false,
          currentLength: contextLength,
          maxLength: this.maxContextLength,
          suggestions: ['Context length is within limits']
        };
      }

      const suggestions = [];

      if (contextLength > this.maxContextLength * 2) {
        suggestions.push('Consider using hierarchical context management');
        suggestions.push('Implement context summarization for long conversations');
      } else if (contextLength > this.maxContextLength * 1.5) {
        suggestions.push('Use priority-based context selection');
        suggestions.push('Consider sliding window approach');
      } else {
        suggestions.push('Use truncation strategy for minor overflows');
      }

      return {
        needsOptimization: true,
        currentLength: contextLength,
        maxLength: this.maxContextLength,
        overflow: contextLength - this.maxContextLength,
        suggestions
      };

    } catch (error) {
      this.logger.error('Error getting optimization suggestions', { error: error.message });
      return { error: 'Unable to analyze context optimization needs' };
    }
  }

  /**
   * Get or create a session
   */
  _getOrCreateSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        createdAt: new Date(),
        lastActivity: new Date(),
        contextHistory: [],
        summaries: [],
        metadata: {}
      });
    }

    const session = this.sessions.get(sessionId);
    session.lastActivity = new Date();
    return session;
  }

  /**
   * Extract current context from request
   */
  _extractCurrentContext(requestBody) {
    if (requestBody.prompt) {
      return requestBody.prompt;
    }

    if (requestBody.messages) {
      return requestBody.messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
    }

    if (requestBody.context) {
      return requestBody.context;
    }

    return '';
  }

  /**
   * Build conversation context from session history and new messages
   */
  _buildConversationContext(session, newMessages) {
    const contextParts = [];

    // Add recent context history
    if (session.contextHistory.length > 0) {
      const recentHistory = session.contextHistory
        .slice(-5) // Last 5 context entries
        .map(entry => entry.content)
        .join('\n');
      contextParts.push(recentHistory);
    }

    // Add new messages
    if (newMessages.length > 0) {
      const messageContext = newMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      contextParts.push(messageContext);
    }

    return contextParts.join('\n\n');
  }

  /**
   * Estimate context length (rough token estimation)
   */
  _estimateContextLength(context) {
    if (!context) return 0;

    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is a simplified approach - in production you might use a proper tokenizer
    return Math.ceil(context.length / 4);
  }

  /**
   * Update session context
   */
  _updateSessionContext(session, context) {
    session.contextHistory.push({
      timestamp: new Date(),
      content: context,
      length: this._estimateContextLength(context)
    });

    // Keep only recent context history (last 20 entries)
    if (session.contextHistory.length > 20) {
      session.contextHistory = session.contextHistory.slice(-20);
    }
  }

  /**
   * Optimize context to fit within limits
   */
  async _optimizeContext(session, context, selectedModel) {
    try {
      // Choose optimization strategy based on context characteristics
      const strategy = this._selectOptimizationStrategy(context, session);

      // Apply optimization
      const optimizedContext = await this.optimizationStrategies[strategy](
        context,
        session,
        selectedModel
      );

      this.logger.info('Context optimized', {
        sessionId: session.id,
        strategy,
        originalLength: this._estimateContextLength(context),
        optimizedLength: this._estimateContextLength(optimizedContext),
        model: selectedModel
      });

      return optimizedContext;

    } catch (error) {
      this.logger.error('Context optimization failed', {
        sessionId: session.id,
        error: error.message
      });

      // Fallback to truncation
      return this._truncateContext(context, session, selectedModel);
    }
  }

  /**
   * Optimize conversation context
   */
  async _optimizeConversationContext(session, context, selectedModel) {
    try {
      // For conversations, prefer priority-based optimization
      const optimizedContext = await this._priorityBasedContext(
        context,
        session,
        selectedModel
      );

      return optimizedContext;

    } catch (error) {
      this.logger.error('Conversation context optimization failed', {
        sessionId: session.id,
        error: error.message
      });

      // Fallback to sliding window
      return this._slidingWindowContext(context, session, selectedModel);
    }
  }

  /**
   * Select optimization strategy
   */
  _selectOptimizationStrategy(context, session) {
    const contextLength = this._estimateContextLength(context);
    const overflowRatio = contextLength / this.maxContextLength;

    if (overflowRatio > 2) {
      return 'hierarchical'; // Major overflow
    } else if (overflowRatio > 1.5) {
      return 'priority'; // Moderate overflow
    } else if (overflowRatio > 1.2) {
      return 'sliding'; // Minor overflow
    } else {
      return 'truncate'; // Minimal overflow
    }
  }

  /**
   * Truncate context strategy
   */
  _truncateContext(context, session, selectedModel) {
    // Simple truncation - keep the end (most recent content)
    const maxChars = this.maxContextLength * 4; // Convert tokens to characters

    if (context.length <= maxChars) {
      return context;
    }

    // Keep the end of the context
    const truncated = context.slice(-maxChars);

    // Try to find a good break point
    const firstNewline = truncated.indexOf('\n');
    if (firstNewline > 0 && firstNewline < maxChars * 0.1) {
      // If we're cutting off very little, include the full line
      return truncated;
    } else if (firstNewline > 0) {
      // Start from the first complete line
      return truncated.slice(firstNewline + 1);
    }

    return truncated;
  }

  /**
   * Priority-based context strategy
   */
  async _priorityBasedContext(context, session, selectedModel) {
    // Split context into sections and prioritize
    const sections = this._splitContextIntoSections(context);
    const prioritizedSections = this._prioritizeSections(sections, session);

    // Build optimized context from top priority sections
    let optimizedContext = '';
    let currentLength = 0;

    for (const section of prioritizedSections) {
      const sectionLength = this._estimateContextLength(section.content);

      if (currentLength + sectionLength <= this.maxContextLength) {
        optimizedContext += (optimizedContext ? '\n\n' : '') + section.content;
        currentLength += sectionLength;
      } else {
        break;
      }
    }

    return optimizedContext || this._truncateContext(context, session, selectedModel);
  }

  /**
   * Sliding window context strategy
   */
  _slidingWindowContext(context, session, selectedModel) {
    // Use a sliding window approach for conversation context
    const lines = context.split('\n');
    const maxLines = Math.floor(this.maxContextLength / 2); // Conservative estimate

    if (lines.length <= maxLines) {
      return context;
    }

    // Keep the most recent lines
    const recentLines = lines.slice(-maxLines);

    // Add a summary of what was removed
    const removedCount = lines.length - maxLines;
    const summary = `[Previous ${removedCount} lines of context omitted for brevity]`;

    return summary + '\n' + recentLines.join('\n');
  }

  /**
   * Hierarchical context strategy
   */
  async _hierarchicalContext(context, session, selectedModel) {
    // Create a hierarchical summary of the context
    const sections = this._splitContextIntoSections(context);

    // Generate summaries for each section
    const summaries = [];
    for (const section of sections) {
      const summary = await this._generateSectionSummary(section, selectedModel);
      summaries.push(summary);
    }

    // Combine summaries
    const hierarchicalContext = summaries.join('\n\n');

    // If still too long, truncate
    if (this._estimateContextLength(hierarchicalContext) > this.maxContextLength) {
      return this._truncateContext(hierarchicalContext, session, selectedModel);
    }

    return hierarchicalContext;
  }

  /**
   * Split context into logical sections
   */
  _splitContextIntoSections(context) {
    const sections = [];
    const lines = context.split('\n');
    let currentSection = { content: '', type: 'text' };

    for (const line of lines) {
      // Detect section boundaries
      if (this._isSectionBoundary(line)) {
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }
        currentSection = { content: line, type: this._detectSectionType(line) };
      } else {
        currentSection.content += (currentSection.content ? '\n' : '') + line;
      }
    }

    // Add the last section
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Detect section boundaries
   */
  _isSectionBoundary(line) {
    // Look for patterns that indicate section breaks
    const boundaryPatterns = [
      /^#+\s/, // Markdown headers
      /^```/, // Code blocks
      /^---/, // Separators
      /^===/, // Separators
      /^\[.*\]/, // Bracketed sections
      /^[A-Z][A-Z\s]+:$/ // ALL CAPS headers
    ];

    return boundaryPatterns.some(pattern => pattern.test(line.trim()));
  }

  /**
   * Detect section type
   */
  _detectSectionType(line) {
    if (line.includes('```')) return 'code';
    if (line.match(/^#+\s/)) return 'header';
    if (line.match(/^[A-Z][A-Z\s]+:$/)) return 'section_header';
    return 'text';
  }

  /**
   * Prioritize sections based on relevance
   */
  _prioritizeSections(sections, session) {
    return sections.map(section => ({
      ...section,
      priority: this._calculateSectionPriority(section, session)
    })).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate section priority
   */
  _calculateSectionPriority(section, session) {
    let priority = 0;

    // Code sections get high priority
    if (section.type === 'code') {
      priority += 50;
    }

    // Headers get medium priority
    if (section.type === 'header') {
      priority += 30;
    }

    // Recent content gets higher priority
    if (session.contextHistory.length > 0) {
      const lastContext = session.contextHistory[session.contextHistory.length - 1];
      if (lastContext.content.includes(section.content)) {
        priority += 20;
      }
    }

    // Longer sections get slightly higher priority (more information)
    if (section.content.length > 100) {
      priority += 10;
    }

    return priority;
  }

  /**
   * Generate section summary (placeholder for AI-powered summarization)
   */
  async _generateSectionSummary(section, selectedModel) {
    // This would ideally use the AI model to generate summaries
    // For now, use a simple heuristic approach

    if (section.type === 'code') {
      // For code, keep the structure but truncate if too long
      const lines = section.content.split('\n');
      if (lines.length > 20) {
        return `[Code block - ${lines.length} lines]\n${lines.slice(0, 10).join('\n')}\n...\n${lines.slice(-5).join('\n')}`;
      }
      return section.content;
    }

    if (section.type === 'header') {
      return section.content;
    }

    // For text, create a summary
    const words = section.content.split(/\s+/);
    if (words.length > 50) {
      return `[${words.slice(0, 25).join(' ')}... (${words.length} words total)]`;
    }

    return section.content;
  }

  /**
   * Get session information
   */
  getSessionInfo(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      id: session.id,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      contextHistoryLength: session.contextHistory.length,
      summariesLength: session.summaries.length,
      currentContextLength: session.contextHistory.length > 0
        ? session.contextHistory[session.contextHistory.length - 1].length
        : 0
    };
  }

  /**
   * Clear session context
   */
  clearSession(sessionId) {
    const deleted = this.sessions.delete(sessionId);
    return { success: deleted, sessionId };
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    const activeSessions = [];
    const now = new Date();
    const maxIdleTime = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.sessions.entries()) {
      const idleTime = now - session.lastActivity;
      if (idleTime < maxIdleTime) {
        activeSessions.push({
          id: sessionId,
          lastActivity: session.lastActivity,
          contextHistoryLength: session.contextHistory.length
        });
      }
    }

    return activeSessions;
  }

  /**
   * Clean up old sessions
   */
  cleanupOldSessions() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.createdAt;
      if (age > maxAge) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.info('Cleaned up old sessions', { cleanedCount });
    }

    return cleanedCount;
  }
}

module.exports = { ContextManager };
