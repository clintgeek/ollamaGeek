const axios = require('axios');
const { Logger } = require('../utils/logger');

class EmbeddingClassifier {
  constructor() {
    this.logger = new Logger();
    this.embeddingModel = 'nomic-embed-text:latest';
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    // Predefined task categories with example prompts
    this.taskCategories = {
      coding: {
        examples: [
          'write a function to',
          'create a class for',
          'implement an algorithm',
          'debug this code',
          'optimize this function',
          'refactor this method',
          'write a test for',
          'create an API endpoint',
          'design a database schema',
          'build a web application',
          'implement a data structure',
          'create a docker container',
          'write a shell script',
          'create a configuration file'
        ],
        keywords: ['function', 'class', 'algorithm', 'debug', 'optimize', 'refactor', 'test', 'api', 'database', 'web', 'docker', 'script', 'config'],
        models: ['codellama:13b-instruct-q4_K_M', 'deepseek-coder:6.7b-instruct-q6_K', 'qwen2.5-coder:7b-instruct-q6_K']
      },
      technical_analysis: {
        examples: [
          'analyze the performance of',
          'design the architecture for',
          'explain how this system works',
          'compare different approaches',
          'evaluate the security of',
          'assess the scalability of',
          'review the design patterns',
          'analyze the trade-offs',
          'explain the algorithm complexity',
          'design a distributed system'
        ],
        keywords: ['analyze', 'design', 'architecture', 'performance', 'security', 'scalability', 'patterns', 'trade-offs', 'complexity', 'distributed'],
        models: ['codellama:13b-instruct-q4_K_M', 'qwen2.5:7b-instruct-q6_K', 'deepseek-coder:6.7b-instruct-q6_K']
      },
      general: {
        examples: [
          'tell me a joke',
          'explain this concept',
          'what is the meaning of',
          'how do I learn about',
          'give me advice on',
          'summarize this text',
          'translate this to',
          'write a story about',
          'explain the difference between',
          'what are the benefits of'
        ],
        keywords: ['explain', 'meaning', 'learn', 'advice', 'summarize', 'translate', 'story', 'difference', 'benefits'],
        models: ['qwen2.5:7b-instruct-q6_K', 'llama3.1:8b-instruct-q4_K_M', 'granite3.3:8b']
      },
      embeddings: {
        examples: [
          'create embeddings for',
          'find similar texts',
          'calculate semantic similarity',
          'cluster these documents',
          'search for similar content'
        ],
        keywords: ['embedding', 'similar', 'semantic', 'cluster', 'search'],
        models: ['nomic-embed-text:latest']
      }
    };

    // Complexity detection patterns
    this.complexityPatterns = {
      low: {
        keywords: ['simple', 'basic', 'easy', 'straightforward', 'quick', 'help'],
        maxTokens: 1000
      },
      medium: {
        keywords: ['explain', 'analyze', 'compare', 'design', 'implement', 'create'],
        maxTokens: 3000
      },
      high: {
        keywords: ['complex', 'advanced', 'sophisticated', 'optimize', 'refactor', 'debug'],
        maxTokens: 6000
      },
      very_high: {
        keywords: ['architecture', 'system design', 'distributed', 'microservices', 'scalable', 'enterprise'],
        maxTokens: 12000
      }
    };
  }

  /**
   * Classify a request using embedding similarity
   */
  async classifyRequest(requestBody) {
    try {
      const content = this._extractContent(requestBody);
      if (!content) {
        return this._getDefaultClassification(requestBody);
      }

      // Get embedding for the request content
      const requestEmbedding = await this._getEmbedding(content);

      // Classify the task type
      const taskType = await this._classifyTaskType(content, requestEmbedding);

      // Determine complexity
      const complexity = this._determineComplexity(content);

      // Detect programming language
      const language = this._detectLanguage(content);

      // Select optimal model
      const recommendedModel = this._selectOptimalModel(taskType, complexity, language);

      // Check if planning is needed
      const needsPlanning = this._needsPlanning(taskType, complexity, content);
      const planningSteps = needsPlanning ? this._generatePlanningSteps(taskType, content) : [];

      const classification = {
        taskType,
        complexity,
        language,
        context: this._generateContext(taskType, content),
        estimatedTokens: this._estimateTokens(content, complexity),
        recommendedModel,
        reasoning: this._generateReasoning(taskType, complexity, language, recommendedModel),
        needsPlanning,
        planningSteps,
        _source: 'embedding_classification',
        _timestamp: new Date().toISOString(),
        _originalRequest: {
          model: requestBody.model,
          messageCount: requestBody.messages?.length || 0
        }
      };

      this.logger.info('Embedding classification completed', {
        taskType,
        complexity,
        language,
        recommendedModel,
        needsPlanning
      });

      return classification;

    } catch (error) {
      this.logger.error('Embedding classification failed', { error: error.message });
      return this._getDefaultClassification(requestBody);
    }
  }

  /**
   * Extract content from request body
   */
  _extractContent(requestBody) {
    if (requestBody.prompt) return requestBody.prompt;
    if (requestBody.messages) {
      // Only analyze the last user message for classification
      // This prevents the system from being influenced by conversation history
      const userMessages = requestBody.messages.filter(msg => msg.role === 'user');
      if (userMessages.length > 0) {
        return userMessages[userMessages.length - 1].content;
      }
      return null;
    }
    return null;
  }

  /**
   * Get embedding for text using nomic-embed-text
   */
  async _getEmbedding(text) {
    try {
      const response = await axios.post(`${this.ollamaBaseUrl}/api/embeddings`, {
        model: this.embeddingModel,
        prompt: text
      });

      return response.data.embedding;
    } catch (error) {
      throw new Error(`Failed to get embedding: ${error.message}`);
    }
  }

  /**
   * Classify task type using keyword matching and semantic similarity
   */
  async _classifyTaskType(content, requestEmbedding) {
    const lowerContent = content.toLowerCase();

    // First, try keyword-based classification (fast and reliable)
    for (const [taskType, category] of Object.entries(this.taskCategories)) {
      const hasKeywords = category.keywords.some(keyword =>
        lowerContent.includes(keyword.toLowerCase())
      );

      if (hasKeywords) {
        // Additional validation for coding tasks
        if (taskType === 'coding') {
          const codingIndicators = [
            'write', 'create', 'implement', 'code', 'program', 'function', 'class',
            'algorithm', 'debug', 'optimize', 'refactor', 'test', 'api', 'database'
          ];
          if (codingIndicators.some(indicator => lowerContent.includes(indicator))) {
            return taskType;
          }
        } else {
          return taskType;
        }
      }
    }

    // Fallback to general for ambiguous cases
    return 'general';
  }

  /**
   * Determine complexity based on content analysis
   */
  _determineComplexity(content) {
    const lowerContent = content.toLowerCase();

    // Check for very_high complexity indicators
    if (this.complexityPatterns.very_high.keywords.some(keyword => lowerContent.includes(keyword))) {
      return 'very_high';
    }

    // Check for high complexity indicators
    if (this.complexityPatterns.high.keywords.some(keyword => lowerContent.includes(keyword))) {
      return 'high';
    }

    // Check for medium complexity indicators
    if (this.complexityPatterns.medium.keywords.some(keyword => lowerContent.includes(keyword))) {
      return 'medium';
    }

    // Default to low complexity
    return 'low';
  }

  /**
   * Detect programming language from content
   */
  _detectLanguage(content) {
    const lowerContent = content.toLowerCase();

    const languagePatterns = {
      python: ['python', 'py', 'pip', 'django', 'flask', 'numpy', 'pandas'],
      javascript: ['javascript', 'js', 'node', 'react', 'vue', 'angular', 'npm'],
      java: ['java', 'spring', 'maven', 'gradle', 'jvm'],
      cpp: ['cpp', 'c++', 'stl', 'boost', 'cmake'],
      rust: ['rust', 'cargo', 'crate'],
      go: ['go', 'golang', 'goroutine'],
      typescript: ['typescript', 'ts', 'tsx'],
      sql: ['sql', 'database', 'table', 'query'],
      bash: ['bash', 'shell', 'script', 'terminal'],
      docker: ['docker', 'container', 'image', 'dockerfile']
    };

    for (const [language, patterns] of Object.entries(languagePatterns)) {
      if (patterns.some(pattern => lowerContent.includes(pattern))) {
        return language;
      }
    }

    return 'general';
  }

  /**
   * Select optimal model based on task type, complexity, and language
   */
  _selectOptimalModel(taskType, complexity, language) {
    const category = this.taskCategories[taskType];
    if (!category) return process.env.DEFAULT_MODEL || 'codellama:13b-instruct-q4_K_M';

    const availableModels = category.models;

    // For coding tasks, prefer models that support the specific language
    if (taskType === 'coding' && language !== 'general') {
      const languageSpecificModels = {
        python: ['deepseek-coder:6.7b-instruct-q6_K', 'codellama:13b-instruct-q4_K_M'],
        javascript: ['codellama:13b-instruct-q4_K_M', 'qwen2.5-coder:7b-instruct-q6_K'],
        java: ['codellama:13b-instruct-q4_K_M', 'deepseek-coder:6.7b-instruct-q6_K'],
        cpp: ['codellama:13b-instruct-q4_K_M', 'codestral:22b-v0.1-q4_K_M'],
        rust: ['codellama:13b-instruct-q4_K_M', 'codestral:22b-v0.1-q4_K_M']
      };

      const languageModels = languageSpecificModels[language];
      if (languageModels) {
        // Find the first available model from the language-specific list
        for (const model of languageModels) {
          if (availableModels.includes(model)) {
            return model;
          }
        }
      }
    }

    // For very high complexity, prefer larger models
    if (complexity === 'very_high' && availableModels.includes('codestral:22b-v0.1-q4_K_M')) {
      return 'codestral:22b-v0.1-q4_K_M';
    }

    // Return the first available model (usually the best one for the task)
    return availableModels[0];
  }

  /**
   * Check if planning is needed
   */
  _needsPlanning(taskType, complexity, content) {
    if (complexity === 'very_high') return true;
    if (complexity === 'high' && taskType === 'coding') return true;

    const planningKeywords = ['design', 'architecture', 'plan', 'strategy', 'approach', 'methodology'];
    return planningKeywords.some(keyword => content.toLowerCase().includes(keyword));
  }

  /**
   * Generate planning steps for complex tasks
   */
  _generatePlanningSteps(taskType, content) {
    if (taskType === 'coding') {
      return [
        'Analyze requirements and constraints',
        'Design the solution architecture',
        'Implement core functionality',
        'Add error handling and validation',
        'Test and optimize the solution'
      ];
    } else if (taskType === 'technical_analysis') {
      return [
        'Gather relevant information',
        'Analyze current state',
        'Identify key factors and constraints',
        'Evaluate different approaches',
        'Provide recommendations with reasoning'
      ];
    }

    return [];
  }

  /**
   * Generate context description
   */
  _generateContext(taskType, content) {
    if (taskType === 'coding') {
      return 'Programming task requiring code generation and implementation';
    } else if (taskType === 'technical_analysis') {
      return 'Technical analysis requiring deep understanding and evaluation';
    } else if (taskType === 'embeddings') {
      return 'Text processing task for semantic analysis';
    } else {
      return 'General conversation or information request';
    }
  }

  /**
   * Estimate token count
   */
  _estimateTokens(content, complexity) {
    const baseTokens = Math.ceil(content.length / 4);
    const complexityMultiplier = { low: 1, medium: 1.5, high: 2, very_high: 3 };
    return Math.ceil(baseTokens * complexityMultiplier[complexity]);
  }

  /**
   * Generate reasoning for model selection
   */
  _generateReasoning(taskType, complexity, language, model) {
    if (taskType === 'coding') {
      return `Selected ${model} for coding task. ${language !== 'general' ? `Specialized for ${language} development.` : ''} Handles ${complexity} complexity well.`;
    } else if (taskType === 'technical_analysis') {
      return `Selected ${model} for technical analysis. Good balance of reasoning capability and performance for ${complexity} complexity tasks.`;
    } else {
      return `Selected ${model} for general task. Appropriate for ${complexity} complexity and general conversation.`;
    }
  }

  /**
   * Get default classification when embedding fails
   */
  _getDefaultClassification(requestBody) {
    return {
      taskType: 'general',
      complexity: 'medium',
      language: 'general',
      context: 'General conversation',
      estimatedTokens: 100,
      recommendedModel: process.env.DEFAULT_MODEL || 'codellama:13b-instruct-q4_K_M',
      reasoning: 'Fallback classification due to embedding failure',
      needsPlanning: false,
      planningSteps: [],
      _source: 'fallback_classification',
      _timestamp: new Date().toISOString(),
      _originalRequest: {
        model: requestBody.model,
        messageCount: requestBody.messages?.length || 0
      }
    };
  }
}

module.exports = { EmbeddingClassifier };
