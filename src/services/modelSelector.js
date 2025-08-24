const { Logger } = require('../utils/logger');

class ModelSelector {
  constructor() {
    this.logger = new Logger();

    // Model registry with capabilities and performance characteristics
    this.modelRegistry = {
      'codellama:13b-instruct-q4_K_M': {
        type: 'coding',
        size: '13b',
        quantization: 'q4_K_M',
        capabilities: ['code_generation', 'code_completion', 'code_review', 'debugging'],
        languages: ['javascript', 'python', 'java', 'cpp', 'go', 'rust', 'typescript'],
        contextWindow: 8192,
        performance: 'high',
        specializations: ['software_development', 'algorithm_optimization']
      },
      'deepseek-coder:6.7b-instruct-q6_K': {
        type: 'coding',
        size: '6.7b',
        quantization: 'q6_K',
        capabilities: ['code_generation', 'code_completion', 'code_review'],
        languages: ['python', 'javascript', 'java', 'cpp'],
        contextWindow: 8192,
        performance: 'medium',
        specializations: ['python_development', 'web_development']
      },
      'qwen2.5:7b-instruct-q6_K': {
        type: 'general',
        size: '7b',
        quantization: 'q6_K',
        capabilities: ['text_generation', 'conversation', 'analysis', 'planning'],
        languages: ['english', 'multilingual'],
        contextWindow: 8192,
        performance: 'medium',
        specializations: ['general_conversation', 'content_creation']
      },
      'llama3.1:8b-instruct-q4_K_M': {
        type: 'general',
        size: '8b',
        quantization: 'q4_K_M',
        capabilities: ['text_generation', 'conversation', 'analysis'],
        languages: ['english'],
        contextWindow: 8192,
        performance: 'medium',
        specializations: ['general_conversation', 'writing']
      },
      'sovit123/starcoder2-3b-instruct:latest': {
        type: 'coding',
        size: '3b',
        quantization: 'latest',
        capabilities: ['code_generation', 'code_completion'],
        languages: ['python', 'javascript', 'java'],
        contextWindow: 8192,
        performance: 'fast',
        specializations: ['quick_coding', 'prototyping']
      },
      'qwen2.5-coder:7b-instruct-q6_K': {
        type: 'coding',
        size: '7b',
        quantization: 'q6_K',
        capabilities: ['code_generation', 'code_completion', 'code_review'],
        languages: ['python', 'javascript', 'java', 'cpp', 'go'],
        contextWindow: 8192,
        performance: 'medium',
        specializations: ['coding', 'software_development']
      },
      'codestral:22b-v0.1-q4_K_M': {
        type: 'coding',
        size: '22b',
        quantization: 'q4_K_M',
        capabilities: ['code_generation', 'code_completion', 'code_review', 'debugging', 'optimization'],
        languages: ['python', 'javascript', 'java', 'cpp', 'go', 'rust', 'typescript'],
        contextWindow: 8192,
        performance: 'very_high',
        specializations: ['complex_coding', 'system_design', 'architecture']
      },
      'nomic-embed-text:latest': {
        type: 'embedding',
        size: 'latest',
        quantization: 'latest',
        capabilities: ['text_embedding', 'semantic_search', 'similarity'],
        languages: ['multilingual'],
        contextWindow: 8192,
        performance: 'fast',
        specializations: ['embeddings', 'search', 'clustering']
      }
    };

    // Task type mappings
    this.taskTypeMappings = {
      'code_generation': ['coding'],
      'code_completion': ['coding'],
      'code_review': ['coding'],
      'debugging': ['coding'],
      'system_design': ['coding'],
      'text_generation': ['general'],
      'conversation': ['general'],
      'analysis': ['general', 'coding'],
      'planning': ['general'],
      'writing': ['general'],
      'embeddings': ['embedding']
    };

    // Performance thresholds
    this.performanceThresholds = {
      low: { maxTokens: 1000, maxComplexity: 'low' },
      medium: { maxTokens: 4000, maxComplexity: 'medium' },
      high: { maxTokens: 8000, maxComplexity: 'high' },
      very_high: { maxTokens: 16000, maxComplexity: 'very_high' }
    };
  }

  /**
   * Select the optimal model for a given request
   */
  async selectModel(requestBody) {
    try {
      const contentAnalysis = requestBody._contentAnalysis || {};
      const requestType = requestBody._metadata?.requestType || 'generate';

      // Determine task type
      const taskType = this._determineTaskType(contentAnalysis, requestBody);

      // Get candidate models
      const candidateModels = this._getCandidateModels(taskType, contentAnalysis);

      // Score and rank models
      const rankedModels = await this._rankModels(candidateModels, requestBody, contentAnalysis);

      // Select best model
      const selectedModel = this._selectBestModel(rankedModels, requestBody);

      this.logger.info('Model selected', {
        taskType,
        selectedModel: selectedModel.name,
        score: selectedModel.score,
        reason: selectedModel.reason
      });

      return selectedModel.name;

    } catch (error) {
      this.logger.error('Error in model selection', { error: error.message });
      // Fallback to default model
      return process.env.DEFAULT_MODEL || 'codellama:13b-instruct-q4_K_M';
    }
  }

  /**
   * Recommend a model for a given request (for analysis purposes)
   */
  async recommendModel(requestBody) {
    try {
      const contentAnalysis = requestBody._contentAnalysis || {};
      const taskType = this._determineTaskType(contentAnalysis, requestBody);
      const candidateModels = this._getCandidateModels(taskType, contentAnalysis);
      const rankedModels = await this._rankModels(candidateModels, requestBody, contentAnalysis);

      return {
        recommended: rankedModels[0],
        alternatives: rankedModels.slice(1, 3),
        reasoning: this._generateReasoning(rankedModels[0], contentAnalysis, taskType)
      };
    } catch (error) {
      this.logger.error('Error in model recommendation', { error: error.message });
      return { error: 'Unable to recommend model' };
    }
  }

  /**
   * Determine the task type based on content analysis
   */
  _determineTaskType(contentAnalysis, requestBody) {
    // Check for specific task indicators
    if (contentAnalysis.isCode) {
      if (this._isComplexCodeTask(contentAnalysis)) {
        return 'complex_coding';
      }
      return 'coding';
    }

    if (contentAnalysis.isTechnical) {
      return 'technical_analysis';
    }

    // Check request type
    if (requestBody._metadata?.requestType === 'embeddings') {
      return 'embeddings';
    }

    // Default to general
    return 'general';
  }

  /**
   * Check if this is a complex coding task
   */
  _isComplexCodeTask(contentAnalysis) {
    return contentAnalysis.complexity === 'high' ||
           contentAnalysis.estimatedTokens > 2000 ||
           contentAnalysis.language === 'rust' || // Rust is typically more complex
           contentAnalysis.language === 'cpp';
  }

  /**
   * Get candidate models for a task type
   */
  _getCandidateModels(taskType, contentAnalysis) {
    const candidates = [];

    for (const [modelName, modelInfo] of Object.entries(this.modelRegistry)) {
      // Check if model supports the task type
      if (this._modelSupportsTask(modelInfo, taskType)) {
        // Check if model can handle the complexity
        if (this._modelCanHandleComplexity(modelInfo, contentAnalysis)) {
          candidates.push({
            name: modelName,
            ...modelInfo
          });
        }
      }
    }

    return candidates;
  }

  /**
   * Check if model supports the task type
   */
  _modelSupportsTask(modelInfo, taskType) {
    // Map task types to model capabilities
    const capabilityMap = {
      'coding': ['code_generation', 'code_completion', 'code_review'],
      'complex_coding': ['code_generation', 'code_completion', 'code_review', 'debugging', 'optimization'],
      'technical_analysis': ['analysis', 'text_generation'],
      'general': ['text_generation', 'conversation', 'analysis'],
      'embeddings': ['text_embedding']
    };

    const requiredCapabilities = capabilityMap[taskType] || [];
    return requiredCapabilities.some(cap => modelInfo.capabilities.includes(cap));
  }

  /**
   * Check if model can handle the complexity
   */
  _modelCanHandleComplexity(modelInfo, contentAnalysis) {
    const threshold = this.performanceThresholds[modelInfo.performance];

    if (!threshold) return true;

    // Check token count
    if (contentAnalysis.estimatedTokens > threshold.maxTokens) {
      return false;
    }

    // Check complexity level
    const complexityLevels = { low: 1, medium: 2, high: 3, very_high: 4 };
    const modelLevel = complexityLevels[modelInfo.performance] || 1;
    const contentLevel = complexityLevels[contentAnalysis.complexity] || 1;

    return modelLevel >= contentLevel;
  }

  /**
   * Rank models based on multiple factors
   */
  async _rankModels(candidateModels, requestBody, contentAnalysis) {
    const rankedModels = [];

    for (const model of candidateModels) {
      const score = await this._calculateModelScore(model, requestBody, contentAnalysis);
      rankedModels.push({
        ...model,
        score,
        reason: this._generateSelectionReason(model, score, contentAnalysis)
      });
    }

    // Sort by score (descending)
    return rankedModels.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate a score for a model based on multiple factors
   */
  async _calculateModelScore(model, requestBody, contentAnalysis) {
    let score = 0;

    // Base score from performance level
    const performanceScores = { fast: 70, medium: 80, high: 90, very_high: 100 };
    score += performanceScores[model.performance] || 70;

    // Language compatibility bonus
    if (contentAnalysis.language && model.languages.includes(contentAnalysis.language)) {
      score += 20;
    }

    // Size optimization (smaller models for simple tasks)
    if (contentAnalysis.complexity === 'low' && model.size.includes('3b')) {
      score += 15; // Prefer smaller models for simple tasks
    } else if (contentAnalysis.complexity === 'high' && model.size.includes('22b')) {
      score += 15; // Prefer larger models for complex tasks
    }

    // Specialization bonus
    if (this._hasRelevantSpecialization(model, contentAnalysis)) {
      score += 25;
    }

    // Context window optimization
    if (contentAnalysis.estimatedTokens > 4000 && model.contextWindow >= 8192) {
      score += 10;
    }

    // Recent usage bonus (models that are already loaded get a small bonus)
    score += await this._getModelLoadBonus(model.name);

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Check if model has relevant specialization
   */
  _hasRelevantSpecialization(model, contentAnalysis) {
    if (contentAnalysis.isCode && model.specializations.includes('software_development')) {
      return true;
    }

    if (contentAnalysis.complexity === 'high' && model.specializations.includes('complex_coding')) {
      return true;
    }

    if (contentAnalysis.isTechnical && model.specializations.includes('technical_analysis')) {
      return true;
    }

    return false;
  }

  /**
   * Get bonus for already loaded models
   */
  async _getModelLoadBonus(modelName) {
    // This would check if the model is already loaded in Ollama
    // For now, return 0 (could be enhanced with actual Ollama status checking)
    return 0;
  }

  /**
   * Generate selection reason
   */
  _generateSelectionReason(model, score, contentAnalysis) {
    const reasons = [];

    if (score >= 90) {
      reasons.push('Excellent match for task requirements');
    } else if (score >= 80) {
      reasons.push('Good match for task requirements');
    } else {
      reasons.push('Adequate match for task requirements');
    }

    if (model.specializations.length > 0) {
      reasons.push(`Specialized in: ${model.specializations.join(', ')}`);
    }

    if (contentAnalysis.language && model.languages.includes(contentAnalysis.language)) {
      reasons.push(`Native support for ${contentAnalysis.language}`);
    }

    return reasons.join('. ');
  }

  /**
   * Generate detailed reasoning for recommendations
   */
  _generateReasoning(model, contentAnalysis, taskType) {
    const reasoning = {
      primaryFactors: [],
      secondaryFactors: [],
      tradeoffs: []
    };

    // Primary factors
    if (model.type === taskType) {
      reasoning.primaryFactors.push('Task type alignment');
    }

    if (contentAnalysis.language && model.languages.includes(contentAnalysis.language)) {
      reasoning.primaryFactors.push('Language support');
    }

    // Secondary factors
    if (model.performance === 'high' || model.performance === 'very_high') {
      reasoning.secondaryFactors.push('High performance capability');
    }

    if (model.contextWindow >= 8192) {
      reasoning.secondaryFactors.push('Large context window');
    }

    // Tradeoffs
    if (model.size.includes('22b') || model.size.includes('13b')) {
      reasoning.tradeoffs.push('Larger model size for better quality');
    }

    if (model.quantization.includes('q4')) {
      reasoning.tradeoffs.push('Lower precision for faster inference');
    }

    return reasoning;
  }

  /**
   * Select the best model from ranked candidates
   */
  _selectBestModel(rankedModels, requestBody) {
    if (rankedModels.length === 0) {
      throw new Error('No suitable models found for the request');
    }

    // If there's a clear winner (score difference > 10), use it
    if (rankedModels.length > 1 &&
        rankedModels[0].score - rankedModels[1].score > 10) {
      return rankedModels[0];
    }

    // Otherwise, prefer smaller models for simple tasks to save resources
    const topModels = rankedModels.slice(0, 3);
    const simpleTask = requestBody._contentAnalysis?.complexity === 'low';

    if (simpleTask) {
      // Prefer smaller models for simple tasks
      const smallerModel = topModels.find(m => m.size.includes('3b') || m.size.includes('6.7b'));
      if (smallerModel) return smallerModel;
    }

    // Default to highest scored model
    return rankedModels[0];
  }

  /**
   * Get model information
   */
  getModelInfo(modelName) {
    return this.modelRegistry[modelName] || null;
  }

  /**
   * List all available models with capabilities
   */
  listModels() {
    return Object.entries(this.modelRegistry).map(([name, info]) => ({
      name,
      type: info.type,
      size: info.size,
      capabilities: info.capabilities,
      specializations: info.specializations,
      performance: info.performance
    }));
  }

  /**
   * Update model registry (for dynamic model discovery)
   */
  updateModelRegistry(newModels) {
    this.modelRegistry = { ...this.modelRegistry, ...newModels };
  }
}

module.exports = { ModelSelector };
