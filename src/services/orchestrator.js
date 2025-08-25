const { ModelSelector } = require('./modelSelector');
const { SmartContextManager } = require('./smartContextManager');
// ToolManager removed - this is now a planning-only orchestrator
const { OllamaClient } = require('./ollamaClient');
const { Logger } = require('../utils/logger');

class OllamaOrchestrator {
  constructor() {
    this.modelSelector = new ModelSelector();
    this.contextManager = new SmartContextManager();
    // this.toolManager = new ToolManager(); // Removed - planning-only
    this.ollamaClient = new OllamaClient();
    this.logger = new Logger();

    this.conversationSessions = new Map();
    this.requestQueue = [];
    this.isProcessing = false;
  }

  /**
   * Handle generate requests with intelligent orchestration
   */
  async handleGenerate(requestBody) {
    const sessionId = this._getSessionId(requestBody);
    const enhancedRequest = await this._enhanceRequest(requestBody, 'generate');

    try {
      // Select optimal model
      const selectedModel = await this.modelSelector.selectModel(enhancedRequest);

      // Manage context
      const managedContext = await this.contextManager.manageContext(
        sessionId,
        enhancedRequest,
        selectedModel
      );

      // Tool execution removed - this is now a planning-only orchestrator

      // Forward to Ollama with enhanced context
      const ollamaResponse = await this.ollamaClient.generate({
        ...enhancedRequest,
        model: selectedModel,
        context: managedContext
      });

      // For now, return Ollama response directly to maintain compatibility
      // TODO: Re-enable response processing once streaming is properly handled
      const processedResponse = ollamaResponse;

      // Update conversation session
      this._updateSession(sessionId, enhancedRequest, processedResponse);

      this.logger.info('Generate request processed', {
        sessionId,
        model: selectedModel,
        contextLength: managedContext?.length || 0
      });

      return processedResponse;

    } catch (error) {
      this.logger.error('Error in generate request', { sessionId, error: error.message });
      throw error;
    }
  }

  /**
   * Handle chat requests with intelligent orchestration
   */
  async handleChat(requestBody) {
    const sessionId = this._getSessionId(requestBody);
    const enhancedRequest = await this._enhanceRequest(requestBody, 'chat');

    try {
      // Select optimal model
      const selectedModel = await this.modelSelector.selectModel(enhancedRequest);

      // Manage context and conversation history
      const managedContext = await this.contextManager.manageChatContext(
        sessionId,
        enhancedRequest,
        selectedModel
      );

      // Analyze for multi-step planning
      const planningResult = await this._analyzeForPlanning(enhancedRequest);

      // Multi-step planning removed - this is now a planning-only orchestrator

      // Forward to Ollama
      const ollamaResponse = await this.ollamaClient.chat({
        ...enhancedRequest,
        model: selectedModel,
        context: managedContext
      });

      // For now, return Ollama response directly to maintain compatibility
      // TODO: Re-enable response processing once streaming is properly handled
      const processedResponse = ollamaResponse;

      // Update conversation session
      this._updateSession(sessionId, enhancedRequest, processedResponse);

      this.logger.info('Chat request processed', {
        sessionId,
        model: selectedModel,
        messagesCount: enhancedRequest.messages?.length || 0
      });

      return processedResponse;

    } catch (error) {
      this.logger.error('Error in chat request', { sessionId, error: error.message });
      throw error;
    }
  }

  /**
   * Handle embeddings requests
   */
  async handleEmbeddings(requestBody) {
    try {
      const selectedModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text:latest';

      const response = await this.ollamaClient.embeddings({
        ...requestBody,
        model: selectedModel
      });

      return response;
    } catch (error) {
      this.logger.error('Error in embeddings request', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle model listing
   */
  async handleTags() {
    try {
      return await this.ollamaClient.tags();
    } catch (error) {
      this.logger.error('Error in tags request', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle model pulling
   */
  async handlePull(requestBody) {
    try {
      return await this.ollamaClient.pull(requestBody);
    } catch (error) {
      this.logger.error('Error in pull request', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle model pushing
   */
  async handlePush(requestBody) {
    try {
      return await this.ollamaClient.push(requestBody);
    } catch (error) {
      this.logger.error('Error in push request', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle orchestration-specific requests
   */
  async handleOrchestration(requestBody) {
    try {
      const { action, data } = requestBody;

      switch (action) {
        case 'analyze_request':
          return await this._analyzeRequest(data);
        case 'get_session_info':
          return await this._getSessionInfo(data.sessionId);
        case 'clear_session':
          return await this._clearSession(data.sessionId);
        case 'get_model_stats':
          return await this._getModelStats();
        default:
          throw new Error(`Unknown orchestration action: ${action}`);
      }
    } catch (error) {
      this.logger.error('Error in orchestration request', { error: error.message });
      throw error;
    }
  }

  /**
   * Enhance request with additional context and metadata
   */
  async _enhanceRequest(requestBody, requestType) {
    const enhanced = { ...requestBody };

    // Add request metadata
    enhanced._metadata = {
      requestType,
      timestamp: new Date().toISOString(),
      wrapperVersion: '1.0.0'
    };

    // Analyze content for optimization hints
    enhanced._contentAnalysis = await this._analyzeContent(requestBody);

    return enhanced;
  }

  /**
   * Analyze content to determine optimal processing strategy
   */
  async _analyzeContent(requestBody) {
    const analysis = {
      isCode: false,
      isTechnical: false,
      complexity: 'low',
      language: null,
      estimatedTokens: 0
    };

    const content = this._extractContent(requestBody);

    if (content) {
      // Detect code content
      analysis.isCode = this._detectCodeContent(content);

      // Detect technical content
      analysis.isTechnical = this._detectTechnicalContent(content);

      // Estimate complexity
      analysis.complexity = this._estimateComplexity(content);

      // Detect programming language
      analysis.language = this._detectLanguage(content);

      // Estimate token count
      analysis.estimatedTokens = this._estimateTokenCount(content);

      // Debug logging
      console.log('🔍 Content Analysis:', {
        content: content.substring(0, 100) + '...',
        isCode: analysis.isCode,
        isTechnical: analysis.isTechnical,
        complexity: analysis.complexity,
        language: analysis.language,
        estimatedTokens: analysis.estimatedTokens
      });
    }

    return analysis;
  }

  /**
   * Extract content from request body
   */
  _extractContent(requestBody) {
    if (requestBody.prompt) return requestBody.prompt;
    if (requestBody.messages) {
      return requestBody.messages
        .map(msg => msg.content)
        .join('\n');
    }
    return null;
  }

  /**
   * Detect if content contains code
   */
  _detectCodeContent(content) {
    const codePatterns = [
      /```[\s\S]*```/,
      /function\s+\w+\s*\(/,
      /class\s+\w+/,
      /import\s+.*from/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /if\s*\(/,
      /for\s*\(/,
      /while\s*\(/
    ];

    const codeKeywords = [
      /write\s+a\s+\w+\s+function/i,
      /create\s+a\s+\w+\s+function/i,
      /implement\s+a\s+\w+\s+function/i,
      /design\s+a\s+\w+\s+system/i,
      /build\s+a\s+\w+\s+application/i,
      /develop\s+a\s+\w+\s+program/i,
      /code\s+a\s+\w+\s+function/i,
      /program\s+a\s+\w+\s+function/i,
      /python/i,
      /javascript/i,
      /java/i,
      /cpp/i,
      /rust/i,
      /go/i,
      /typescript/i
    ];

    return codePatterns.some(pattern => pattern.test(content)) ||
           codeKeywords.some(keyword => keyword.test(content));
  }

  /**
   * Detect if content is technical
   */
  _detectTechnicalContent(content) {
    const technicalPatterns = [
      /algorithm/i,
      /architecture/i,
      /database/i,
      /API/i,
      /endpoint/i,
      /deployment/i,
      /infrastructure/i,
      /optimization/i,
      /performance/i,
      /scalability/i
    ];

    return technicalPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Estimate content complexity
   */
  _estimateComplexity(content) {
    const lines = content.split('\n').length;
    const words = content.split(/\s+/).length;

    if (lines > 100 || words > 500) return 'high';
    if (lines > 50 || words > 200) return 'medium';
    return 'low';
  }

  /**
   * Detect programming language
   */
  _detectLanguage(content) {
    const languagePatterns = {
      javascript: /function|const|let|var|=>|import|export/,
      python: /def\s+\w+|import\s+\w+|from\s+\w+|class\s+\w+/,
      java: /public\s+class|public\s+static|import\s+java/,
      cpp: /#include|std::|namespace|class\s+\w+/,
      go: /func\s+\w+|package\s+\w+|import\s*\(/,
      rust: /fn\s+\w+|use\s+\w+|struct\s+\w+/
    };

    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(content)) return lang;
    }

    return null;
  }

  /**
   * Estimate token count
   */
  _estimateTokenCount(content) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(content.length / 4);
  }

  /**
   * Analyze request for planning needs
   */
  async _analyzeForPlanning(requestBody) {
    const content = this._extractContent(requestBody);

    const planningIndicators = [
      'step by step',
      'step-by-step',
      'step 1',
      'first',
      'then',
      'finally',
      'plan',
      'strategy',
      'approach',
      'break down',
      'decompose'
    ];

    const needsPlanning = planningIndicators.some(indicator =>
      content.toLowerCase().includes(indicator)
    );

    return {
      needsPlanning,
      indicators: planningIndicators.filter(indicator =>
        content.toLowerCase().includes(indicator)
      )
    };
  }

  // Execution methods removed - this is now a planning-only orchestrator

  /**
   * Get or create session ID
   */
  _getSessionId(requestBody) {
    if (requestBody.sessionId) return requestBody.sessionId;

    // Generate session ID based on request content
    const content = this._extractContent(requestBody);
    const hash = this._simpleHash(content);
    return `session_${hash}_${Date.now()}`;
  }

  /**
   * Simple hash function
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Update conversation session
   */
  _updateSession(sessionId, request, response) {
    if (!this.conversationSessions.has(sessionId)) {
      this.conversationSessions.set(sessionId, {
        createdAt: new Date(),
        requests: [],
        responses: [],
        model: response.model,
        totalTokens: 0
      });
    }

    const session = this.conversationSessions.get(sessionId);
    session.requests.push({
      timestamp: new Date(),
      content: this._extractContent(request),
      type: request._metadata?.requestType
    });

    session.responses.push({
      timestamp: new Date(),
      content: response.response || response.message?.content,
      model: response.model,
      tokens: response.eval_count || 0
    });

    session.totalTokens += response.eval_count || 0;
    session.lastActivity = new Date();
  }

  /**
   * Get session information
   */
  _getSessionInfo(sessionId) {
    const session = this.conversationSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      sessionId,
      ...session,
      requestCount: session.requests.length,
      responseCount: session.responses.length
    };
  }

  /**
   * Clear session
   */
  _clearSession(sessionId) {
    const deleted = this.conversationSessions.delete(sessionId);
    return { success: deleted, sessionId };
  }

  /**
   * Get model statistics
   */
  async _getModelStats() {
    try {
      const tags = await this.ollamaClient.tags();
      return {
        totalModels: tags.models?.length || 0,
        models: tags.models?.map(model => ({
          name: model.name,
          size: model.size,
          modified: model.modified_at
        })) || [],
        activeSessions: this.conversationSessions.size,
        totalTokens: Array.from(this.conversationSessions.values())
          .reduce((sum, session) => sum + session.totalTokens, 0)
      };
    } catch (error) {
      this.logger.error('Error getting model stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze request for optimization
   */
  async _analyzeRequest(data) {
    const analysis = {
      contentAnalysis: await this._analyzeContent(data),
      recommendedModel: await this.modelSelector.recommendModel(data),
      contextOptimization: await this.contextManager.getOptimizationSuggestions(data),
              toolRecommendations: [] // Tool recommendations removed - planning-only
    };

    return analysis;
  }
}

module.exports = { OllamaOrchestrator };
