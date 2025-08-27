const axios = require('axios');
const { Logger } = require('../utils/logger');

class IntentRecognizer {
  constructor() {
    this.logger = new Logger();
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    // Semantic intent categories with example embeddings
    this.intentCategories = {
      direct_actions: {
        description: 'Simple tasks that can be executed immediately',
        examples: [
          'what is 2 + 2',
          'hello there',
          'how tall are you',
          'calculate 15 * 3'
        ]
      },
      file_operations: {
        description: 'File and directory management tasks',
        examples: [
          'create a file called test.txt',
          'make a new directory',
          'delete the old config file'
        ]
      },
      app_development: {
        description: 'Application and project creation tasks',
        examples: [
          'create a node app',
          'build a react project',
          'set up a python flask application',
          'make me a web service'
        ]
      },
      code_analysis: {
        description: 'Code review, debugging, and analysis',
        examples: [
          'analyze this function',
          'explain how this code works',
          'find the bug in this code',
          'optimize this algorithm'
        ]
      },
      system_operations: {
        description: 'Environment setup and system configuration',
        examples: [
          'install dependencies',
          'set up the development environment',
          'configure the database',
          'deploy to production'
        ]
      },
      multi_step_workflows: {
        description: 'Complex tasks requiring multiple steps',
        examples: [
          'create a file, calculate something, and write the result',
          'build an app, test it, and deploy it',
          'analyze code, fix bugs, and create tests'
        ]
      }
    };
  }

  /**
   * AI-native intent recognition - AI-first, AI-only
   */
  async recognizeIntent(prompt, context = {}) {
    try {
      this.logger.info('🧠 Starting comprehensive AI-native intent recognition');

      // 1. Fast semantic embedding for intent category (50-100ms)
      const promptEmbedding = await this.generateEmbedding(prompt);
      const intentCategory = await this.findIntentCategory(promptEmbedding);

      // 2. Single comprehensive AI analysis (500ms-2s)
      const comprehensiveAnalysis = await this.analyzeComprehensively(prompt, intentCategory, context);

      this.logger.info('✅ Intent recognition completed successfully');
      return comprehensiveAnalysis;

    } catch (error) {
      this.logger.error('Intent recognition failed:', error);

      // Retry once with simplified prompt before giving up
      try {
        this.logger.info('🔄 Retrying with simplified prompt...');
        const retryAnalysis = await this.analyzeComprehensively(prompt, 'general_assistance', context);
        this.logger.info('✅ Retry successful');
        return retryAnalysis;
      } catch (retryError) {
        this.logger.error('Retry also failed:', retryError);
        throw new Error(`Intent recognition failed after retry: ${retryError.message}`);
      }
    }
  }

  /**
   * Generate semantic embedding using nomic-embed-text
   */
  async generateEmbedding(text) {
    try {
      const response = await axios.post(`${this.ollamaBaseUrl}/api/embeddings`, {
        model: 'nomic-embed-text',
        prompt: text
      }, { timeout: 15000 });

      return response.data.embedding;
    } catch (error) {
      this.logger.error('Embedding generation failed:', error);
      throw new Error('Failed to generate semantic embedding');
    }
  }

  /**
   * Find intent category using semantic similarity (fast, cached approach)
   */
  async findIntentCategory(promptEmbedding) {
    try {
      // Use pre-computed category embeddings for speed
      const categoryEmbeddings = await this.getCategoryEmbeddings();

      // Calculate cosine similarity with each category
      let bestMatch = { category: null, similarity: -1 };

      for (const [category, embedding] of Object.entries(categoryEmbeddings)) {
        const similarity = this.cosineSimilarity(promptEmbedding, embedding);
        if (similarity > bestMatch.similarity) {
          bestMatch = { category, similarity };
        }
      }

      this.logger.info(`🎯 Intent category detected: ${bestMatch.category} (similarity: ${bestMatch.similarity.toFixed(3)})`);
      return bestMatch.category || 'general_assistance';

    } catch (error) {
      this.logger.error('Intent category detection failed:', error);
      return 'general_assistance';
    }
  }

  /**
   * Get or generate category embeddings (cached for performance)
   */
  async getCategoryEmbeddings() {
    // Cache embeddings to avoid regenerating them every time
    if (!this._categoryEmbeddings) {
      this.logger.info('🔄 Generating category embeddings (first time)...');
      this._categoryEmbeddings = {};

      for (const [category, config] of Object.entries(this.intentCategories)) {
        const categoryText = `${config.description}. Examples: ${config.examples.join(', ')}`;
        this._categoryEmbeddings[category] = await this.generateEmbedding(categoryText);
      }
      this.logger.info('✅ Category embeddings cached');
    }

    return this._categoryEmbeddings;
  }

  /**
   * Comprehensive AI analysis - single call for intent, complexity, and approach
   */
  async analyzeComprehensively(prompt, intentCategory, context) {
    try {
      const analysisPrompt = `Analyze this user request comprehensively:

Request: "${prompt}"
Intent Category: ${intentCategory}
Context: ${JSON.stringify(context)}

Provide a complete analysis including:

1. Specific Intent: Use ONLY these intent names: app_creation, file_ops, code_analysis, system_ops, complex_multi_step, general_assistance
2. Complexity Level: How complex is this task?
3. Approach: What's the best way to handle this?
4. Reasoning: Why did you choose this approach?
5. Risk Assessment: What are the potential risks?
6. Estimated Steps: How many steps will this take?

IMPORTANT: The "intent" field must be one of these exact values:
- app_creation: User wants to build/create an application
- file_ops: User wants to create/modify files or directories
- code_analysis: User wants code review, debugging, or analysis
- system_ops: User wants system-level operations
- complex_multi_step: User wants a complex multi-step workflow
- general_assistance: General help or questions

Respond with JSON:
{
  "intent": "app_creation",
  "confidence": 0.85,
  "complexity": "low|medium|high|very_high",
  "approach": "direct_response|simple_execution|planning_with_execution|complex_planning",
  "requiresApproval": true|false,
  "actionType": "simple_chat|execution_simple|execution_medium|execution_complex",
  "reasoning": "Detailed explanation of your analysis",
  "riskAssessment": "low|medium|high",
  "estimatedSteps": 3,
  "timeEstimate": "5 minutes|30 minutes|2 hours|1 day"
}`;

      this.logger.info(`🧠 Running comprehensive AI analysis with ${intentCategory} category`);

      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: 'granite3.3:8b',
        prompt: analysisPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      }, { timeout: 30000 });

      const content = response.data.response;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        this.logger.info(`✅ Comprehensive analysis completed: ${analysis.intent} (${analysis.complexity})`);
        return analysis;
      }

      throw new Error('Failed to parse AI-generated analysis');

    } catch (error) {
      this.logger.error('Comprehensive analysis failed:', error);
      throw error;
    }
  }

  /**
   * AI-powered approach determination
   */
  async determineApproach(prompt, intentResult, complexityAnalysis, context) {
    try {
      const approachPrompt = `Determine the best approach for this task:

Task: "${prompt}"
Intent: ${intentResult.intent}
Complexity: ${complexityAnalysis.complexity}
Factors: ${complexityAnalysis.factors.join(', ')}
Step Count: ${complexityAnalysis.stepCount}
Risk Level: ${complexityAnalysis.riskLevel}

Available approaches:
1. direct_response - Immediate answer, no tools needed
2. simple_execution - Single tool execution, no approval needed
3. planning_with_execution - Needs planning, can auto-execute
4. complex_planning - Complex task requiring approval

Consider:
- Task complexity and risk
- Number of steps involved
- Whether user approval is needed
- Best execution strategy

IMPORTANT: Choose ONLY ONE approach and actionType from the options above.

Respond with JSON:
{
  "approach": "simple_execution",
  "requiresApproval": false,
  "actionType": "execution_simple",
  "reasoning": "Detailed explanation of why this approach was chosen"
}`;

      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: 'qwen2.5:1.5b-instruct-q4_K_M',
        prompt: approachPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      }, { timeout: 30000 });

      const content = response.data.response;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback approach
      return {
        approach: 'complex_planning',
        requiresApproval: true,
        actionType: 'execution_complex',
        reasoning: 'AI analysis failed, defaulting to safe complex planning approach'
      };

    } catch (error) {
      this.logger.error('Approach determination failed:', error);
      return {
        approach: 'complex_planning',
        requiresApproval: true,
        actionType: 'execution_complex',
        reasoning: 'Analysis failed, using safe fallback approach'
      };
    }
  }

  /**
   * AI fallback analysis when main recognition fails
   */
  async aiFallbackAnalysis(prompt, context) {
    try {
      const fallbackPrompt = `Analyze this user request and provide intent classification:

Request: "${prompt}"
Context: ${JSON.stringify(context)}

Provide JSON response:
{
  "intent": "specific_intent",
  "confidence": 0.7,
  "complexity": "medium",
  "approach": "complex_planning",
  "reasoning": "Fallback analysis due to system error"
}`;

      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: 'granite3.3:8b',
        prompt: fallbackPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      }, { timeout: 30000 });

      const content = response.data.response;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          intent: result.intent,
          confidence: Math.min(Math.max(result.confidence || 0.7, 0), 1),
          complexity: result.complexity || 'medium',
          approach: result.approach || 'complex_planning',
          reasoning: result.reasoning || 'Fallback AI analysis',
          source: 'ai_fallback'
        };
      }

      // Ultimate fallback
      return {
        intent: 'general_assistance',
        confidence: 0.5,
        complexity: 'medium',
        approach: 'complex_planning',
        reasoning: 'Complete fallback - unable to analyze intent',
        source: 'fallback'
      };

    } catch (error) {
      this.logger.error('AI fallback analysis failed:', error);
      return {
        intent: 'general_assistance',
        confidence: 0.3,
        complexity: 'medium',
        approach: 'complex_planning',
        reasoning: 'System error - using basic fallback',
        source: 'error_fallback'
      };
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Legacy methods for backward compatibility
  async quickPatternMatch(prompt) {
    // Delegate to AI-native recognition
    return this.recognizeIntent(prompt);
  }

  async aiIntentAnalysis(prompt, context) {
    // Delegate to AI-native recognition
    return this.recognizeIntent(prompt, context);
  }

  heuristicFallback(prompt, context) {
    // Delegate to AI fallback
    return this.aiFallbackAnalysis(prompt, context);
  }
}

module.exports = IntentRecognizer;
