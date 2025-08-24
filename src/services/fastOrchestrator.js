const axios = require('axios');
const { Logger } = require('../utils/logger');

class FastOrchestrator {
  constructor() {
    this.logger = new Logger();
    this.fastModel = process.env.FAST_ORCHESTRATION_MODEL || 'qwen2.5:1.5b-instruct-q4_K_M';
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  /**
   * Analyze a request using the fast model and return orchestration decisions
   */
  async analyzeRequest(requestBody, requestType = 'chat') {
    try {
      const content = this._extractContent(requestBody);
      if (!content) {
        return this._getDefaultAnalysis(requestBody, requestType);
      }

      // Create a structured prompt for the fast model
      const analysisPrompt = this._createAnalysisPrompt(content, requestType);

      // Get analysis from fast model
      const analysis = await this._getFastModelAnalysis(analysisPrompt);

      // Parse and validate the analysis
      const validatedAnalysis = this._validateAnalysis(analysis, requestBody);

      this.logger.info('Fast orchestration analysis completed', {
        requestType,
        contentLength: content.length,
        analysis: validatedAnalysis
      });

      return validatedAnalysis;

    } catch (error) {
      this.logger.error('Fast orchestration analysis failed', { error: error.message });
      return this._getDefaultAnalysis(requestBody, requestType);
    }
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
   * Create a structured prompt for the fast model
   */
  _createAnalysisPrompt(content, requestType) {
    return `You are an AI task analyzer. Analyze this ${requestType} request and respond ONLY with valid JSON in English.

IMPORTANT: Respond in English only. Do not use any other language.

Task Classification Rules:
- "coding": Any request involving programming, code generation, debugging, software development, algorithms, data structures, or technical implementation
- "technical_analysis": Complex technical discussions, system design, architecture, performance analysis, or advanced technical concepts
- "general": Simple conversations, greetings, explanations, or non-technical content
- "embeddings": Text embedding or similarity analysis requests

Complexity Levels:
- "low": Simple tasks, basic questions, straightforward requests
- "medium": Moderate complexity, some technical depth, multi-step tasks
- "high": Complex technical tasks, advanced concepts, detailed analysis
- "very_high": System architecture, complex algorithms, multi-component design

Available Models (use exact names):
- Coding: codellama:13b-instruct-q4_K_M, deepseek-coder:6.7b-instruct-q6_K, qwen2.5-coder:7b-instruct-q6_K
- General: qwen2.5:7b-instruct-q6_K, llama3.1:8b-instruct-q4_K_M
- Technical: codellama:13b-instruct-q4_K_M, qwen2.5:7b-instruct-q6_K
- Embeddings: nomic-embed-text:latest

Return this exact JSON structure:
{
  "taskType": "coding|general|technical_analysis|embeddings",
  "complexity": "low|medium|high|very_high",
  "language": "python|javascript|java|cpp|rust|go|typescript|general",
  "context": "brief description in English",
  "estimatedTokens": number,
  "recommendedModel": "exact_model_name_from_list_above",
  "reasoning": "brief explanation in English",
  "needsPlanning": boolean,
  "planningSteps": ["step1", "step2"] if needsPlanning is true
}

Request content: "${content.substring(0, 500)}"

JSON response:`;
  }

  /**
   * Get analysis from the fast model
   */
  async _getFastModelAnalysis(prompt) {
    try {
      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: this.fastModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent analysis
          num_predict: 200,  // Limit response length
          top_k: 10,         // Limit vocabulary diversity
          top_p: 0.9         // Focus on most likely tokens
        }
      });

      return response.data.response;
    } catch (error) {
      throw new Error(`Fast model analysis failed: ${error.message}`);
    }
  }

  /**
   * Parse and validate the fast model's analysis
   */
  _validateAnalysis(rawAnalysis, requestBody) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = rawAnalysis.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validate required fields
      const requiredFields = ['taskType', 'complexity', 'language', 'context', 'estimatedTokens', 'recommendedModel'];
      for (const field of requiredFields) {
        if (!analysis[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Ensure taskType is valid
      const validTaskTypes = ['coding', 'general', 'technical_analysis', 'embeddings'];
      if (!validTaskTypes.includes(analysis.taskType)) {
        analysis.taskType = 'general';
      }

      // Ensure complexity is valid
      const validComplexities = ['low', 'medium', 'high', 'very_high'];
      if (!validComplexities.includes(analysis.complexity)) {
        analysis.complexity = 'medium';
      }

      // Validate and correct the recommended model to ensure it exists
      analysis.recommendedModel = this._validateModelName(analysis.recommendedModel, analysis.taskType);
      
      // Force correct task type based on content analysis
      analysis.taskType = this._forceCorrectTaskType(analysis.taskType, content);

      // Add metadata
      analysis._source = 'fast_model_analysis';
      analysis._timestamp = new Date().toISOString();
      analysis._originalRequest = {
        model: requestBody.model,
        messageCount: requestBody.messages?.length || 0
      };

      return analysis;

    } catch (error) {
      this.logger.warn('Failed to parse fast model analysis, using fallback', { error: error.message });
      return this._getDefaultAnalysis(requestBody, 'chat');
    }
  }

  /**
   * Force correct task type based on content analysis
   */
  _forceCorrectTaskType(detectedTaskType, content) {
    const lowerContent = content.toLowerCase();
    
    // Strong coding indicators
    const codingKeywords = [
      'write', 'create', 'implement', 'code', 'program', 'function', 'class',
      'algorithm', 'data structure', 'debug', 'optimize', 'refactor', 'test',
      'api', 'endpoint', 'database', 'schema', 'deployment', 'infrastructure'
    ];
    
    // Programming language indicators
    const languageKeywords = [
      'python', 'javascript', 'java', 'cpp', 'rust', 'go', 'typescript',
      'html', 'css', 'sql', 'bash', 'shell', 'docker', 'kubernetes'
    ];
    
    // Check for coding patterns
    const hasCodingKeywords = codingKeywords.some(keyword => lowerContent.includes(keyword));
    const hasLanguageKeywords = languageKeywords.some(keyword => lowerContent.includes(keyword));
    
    // Force coding task type if strong indicators are present
    if (hasCodingKeywords || hasLanguageKeywords) {
      console.log(`🔧 Forcing task type from "${detectedTaskType}" to "coding" due to coding indicators`);
      return 'coding';
    }
    
    // Check for technical analysis patterns
    const technicalKeywords = [
      'architecture', 'design pattern', 'system design', 'performance',
      'scalability', 'security', 'monitoring', 'logging', 'metrics'
    ];
    
    const hasTechnicalKeywords = technicalKeywords.some(keyword => lowerContent.includes(keyword));
    
    if (hasTechnicalKeywords && detectedTaskType === 'general') {
      console.log(`🔧 Forcing task type from "${detectedTaskType}" to "technical_analysis" due to technical indicators`);
      return 'technical_analysis';
    }
    
    return detectedTaskType;
  }

  /**
   * Validate and correct model names to ensure they exist
   */
  _validateModelName(recommendedModel, taskType) {
    // Define available models by task type
    const availableModels = {
      coding: [
        'codellama:13b-instruct-q4_K_M',
        'deepseek-coder:6.7b-instruct-q6_K',
        'qwen2.5-coder:7b-instruct-q6_K',
        'sovit123/starcoder2-3b-instruct:latest',
        'codestral:22b-v0.1-q4_K_M'
      ],
      general: [
        'qwen2.5:7b-instruct-q6_K',
        'llama3.1:8b-instruct-q4_K_M',
        'qwen2.5:1.5b-instruct-q4_K_M'
      ],
      technical_analysis: [
        'qwen2.5:7b-instruct-q6_K',
        'codellama:13b-instruct-q4_K_M',
        'deepseek-coder:6.7b-instruct-q6_K'
      ],
      embeddings: [
        'nomic-embed-text:latest'
      ]
    };

    const modelsForTask = availableModels[taskType] || availableModels.general;

    // Check if the recommended model exists in our available models
    if (modelsForTask.includes(recommendedModel)) {
      return recommendedModel;
    }

    // If not, find the best alternative based on task type
    if (taskType === 'coding') {
      return 'codellama:13b-instruct-q4_K_M'; // Best coding model
    } else if (taskType === 'embeddings') {
      return 'nomic-embed-text:latest';
    } else {
      return 'qwen2.5:7b-instruct-q6_K'; // Good general model
    }
  }

  /**
   * Get default analysis when fast model fails
   */
  _getDefaultAnalysis(requestBody, requestType) {
    const content = this._extractContent(requestBody);

    return {
      taskType: 'general',
      complexity: 'medium',
      language: 'general',
      context: 'general conversation',
      estimatedTokens: content ? Math.ceil(content.length / 4) : 100,
      recommendedModel: process.env.DEFAULT_MODEL || 'codellama:13b-instruct-q4_K_M',
      reasoning: 'Fallback analysis due to fast model failure',
      needsPlanning: false,
      planningSteps: [],
      _source: 'fallback_analysis',
      _timestamp: new Date().toISOString(),
      _originalRequest: {
        model: requestBody.model,
        messageCount: requestBody.messages?.length || 0
      }
    };
  }

  /**
   * Get the recommended model name
   */
  getRecommendedModel(analysis) {
    return analysis.recommendedModel;
  }

  /**
   * Check if the request needs multi-step planning
   */
  needsPlanning(analysis) {
    return analysis.needsPlanning === true;
  }

  /**
   * Get planning steps if available
   */
  getPlanningSteps(analysis) {
    return analysis.planningSteps || [];
  }

  /**
   * Get enhanced context for the main model
   */
  getEnhancedContext(analysis, originalRequest) {
    const context = {
      taskType: analysis.taskType,
      complexity: analysis.complexity,
      language: analysis.language,
      context: analysis.context,
      estimatedTokens: analysis.estimatedTokens,
      reasoning: analysis.reasoning
    };

    if (analysis.needsPlanning) {
      context.planningSteps = analysis.planningSteps;
      context.planningPrompt = this._createPlanningPrompt(analysis);
    }

    return context;
  }

  /**
   * Create a planning prompt for complex requests
   */
  _createPlanningPrompt(analysis) {
    return `This request requires multi-step planning. Please follow these steps:

${analysis.planningSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Context: ${analysis.context}
Task Type: ${analysis.taskType}
Complexity: ${analysis.complexity}

Please provide a structured response following these steps.`;
  }
}

module.exports = { FastOrchestrator };
