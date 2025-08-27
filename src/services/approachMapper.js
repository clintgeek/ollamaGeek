const { Logger } = require('../utils/logger');
const axios = require('axios'); // Added axios for AI interaction

class ApproachMapper {
  constructor() {
    this.logger = new Logger();
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  /**
   * AI-powered approach mapping using semantic understanding
   */
  async mapIntentToApproach(intentResult, context = {}) {
    try {
      this.logger.info('🧠 Using AI-powered approach mapping');

      // Use AI to determine the best approach based on intent, complexity, and context
      const aiApproach = await this.aiApproachAnalysis(intentResult, context);

      // Validate and enhance the AI approach
      const validatedApproach = this.validateAndEnhanceApproach(aiApproach, intentResult, context);

      return validatedApproach;

    } catch (error) {
      this.logger.error('AI approach mapping failed:', error);
      return this.fallbackApproachMapping(intentResult, context);
    }
  }

  /**
   * AI-powered approach analysis
   */
  async aiApproachAnalysis(intentResult, context) {
    try {
      const analysisPrompt = `Analyze this task and determine the optimal execution approach:

Task Intent: ${intentResult.intent}
Confidence: ${intentResult.confidence}
Complexity: ${intentResult.complexity}
Context: ${JSON.stringify(context)}
Metadata: ${JSON.stringify(intentResult.metadata || {})}

Available Approaches:
1. direct_response - Immediate answer, no tools needed (for questions, explanations)
2. simple_execution - Single tool execution, no approval needed (for file_ops, simple tasks)
3. planning_with_execution - Needs planning, can auto-execute (for app_creation, multi-step)
4. complex_planning - Complex task requiring approval (for system changes, high-risk)

CRITICAL RULES:
- file_ops intent → ALWAYS use simple_execution → actionType: "execution_simple"
- app_creation intent → ALWAYS use planning_with_execution → actionType: "execution_simple"
- code_analysis intent → Usually direct_response → actionType: "simple_chat"
- system_ops intent → Usually complex_planning → actionType: "execution_complex"

Consider:
- Task complexity and risk level
- Number of steps involved
- Whether user approval is needed
- User's experience level and preferences
- Workspace context and existing projects
- Security and safety implications

IMPORTANT: Choose ONLY ONE approach and actionType from the options above.

Respond with JSON:
{
  "approach": "simple_execution",
  "requiresApproval": false,
  "actionType": "execution_simple",
  "reasoning": "Detailed explanation of why this approach was chosen",
  "riskAssessment": "low",
  "estimatedSteps": 3,
  "userExperience": "beginner",
  "safetyConsiderations": ["Ensure the app is secure"]
}`;

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
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Failed to parse AI approach analysis');

    } catch (error) {
      this.logger.error('AI approach analysis failed:', error);
      throw error;
    }
  }

  /**
   * Validate and enhance AI approach with safety checks
   */
  validateAndEnhanceApproach(aiApproach, intentResult, context) {
    const enhanced = { ...aiApproach };

    // Safety overrides for high-risk operations
    if (this.isHighRiskOperation(intentResult, context)) {
      enhanced.requiresApproval = true;
      enhanced.actionType = 'execution_complex';
      enhanced.reasoning += ' (Safety override: High-risk operation requires approval)';
    }

    // Context-aware adjustments
    if (context.workspace?.hasUncommittedChanges) {
      enhanced.reasoning += ' (Workspace has uncommitted changes - extra caution advised)';
    }

    // Complexity validation
    if (intentResult.complexity === 'very_high' && !enhanced.requiresApproval) {
      enhanced.requiresApproval = true;
      enhanced.reasoning += ' (Complexity override: Very high complexity requires approval)';
    }

    // User experience adjustments
    if (enhanced.userExperience === 'beginner' && enhanced.actionType === 'execution_complex') {
      enhanced.reasoning += ' (User experience: Beginner user - providing extra guidance)';
    }

    return enhanced;
  }

  /**
   * Check if operation is high-risk
   */
  isHighRiskOperation(intentResult, context) {
    const highRiskPatterns = [
      /delete|remove|drop/i,
      /system|environment|config/i,
      /production|deploy|release/i,
      /database|db/i,
      /root|admin|sudo/i
    ];

    const prompt = context.prompt || '';
    const hasHighRiskWords = highRiskPatterns.some(pattern => pattern.test(prompt));

    return hasHighRiskWords || intentResult.complexity === 'very_high';
  }

  /**
   * Fallback approach mapping when AI fails
   */
  fallbackApproachMapping(intentResult, context) {
    this.logger.warn('Using fallback approach mapping');

    // Basic safety-based fallback
    const intent = intentResult.intent;
    const complexity = intentResult.complexity;

    // High complexity always requires approval
    if (complexity === 'very_high' || complexity === 'high') {
      return {
        approach: 'complex_planning',
        requiresApproval: true,
        actionType: 'execution_complex',
        reasoning: 'Fallback: High complexity requires approval for safety',
        riskAssessment: 'high',
        estimatedSteps: 5,
        userExperience: 'intermediate',
        safetyConsiderations: ['Complexity requires careful review']
      };
    }

    // File operations based on complexity
    if (intent.includes('file') || intent.includes('app') || intent.includes('project')) {
      if (complexity === 'medium') {
        return {
          approach: 'planning_with_execution',
          requiresApproval: false,
          actionType: 'execution_medium',
          reasoning: 'Fallback: Medium complexity file operation',
          riskAssessment: 'medium',
          estimatedSteps: 3,
          userExperience: 'intermediate',
          safetyConsiderations: ['File operations require workspace awareness']
        };
      } else {
        return {
          approach: 'simple_execution',
          requiresApproval: false,
          actionType: 'execution_simple',
          reasoning: 'Fallback: Simple file operation',
          riskAssessment: 'low',
          estimatedSteps: 1,
          userExperience: 'beginner',
          safetyConsiderations: ['Simple operation, low risk']
        };
      }
    }

    // Default safe approach
    return {
      approach: 'complex_planning',
      requiresApproval: true,
      actionType: 'execution_complex',
      reasoning: 'Fallback: Default safe approach with approval required',
      riskAssessment: 'medium',
      estimatedSteps: 3,
      userExperience: 'intermediate',
      safetyConsiderations: ['Fallback mode - extra caution advised']
    };
  }

  /**
   * Validate approach based on context
   */
  validateApproach(mappedApproach, context) {
    // This method is now handled by validateAndEnhanceApproach
    return mappedApproach;
  }

  /**
   * Generate appropriate response based on mapped approach
   */
  generateResponse(prompt, intentResult, mappedApproach) {
    const { actionType, requiresPlanning, requiresApproval, description } = mappedApproach;

    switch (actionType) {
      case 'simple_chat':
        return this.generateSimpleChatResponse(prompt, intentResult);

      case 'execution_simple':
      case 'execution_medium':
      case 'execution_complex':
        return this.generateExecutionResponse(prompt, intentResult, mappedApproach);

      default:
        return this.generateDefaultResponse(prompt, intentResult);
    }
  }

  /**
   * Generate simple chat response
   */
  generateSimpleChatResponse(prompt, intentResult) {
    const { intent, confidence, reasoning } = intentResult;

    let message = '';

    switch (intent) {
      case 'math':
        message = this.handleMathQuestion(prompt);
        break;
      case 'greeting':
        message = this.handleGreeting(prompt);
        break;
      case 'simple_question':
        message = this.handleSimpleQuestion(prompt);
        break;
      default:
        message = "I'm here to help! What would you like to work on?";
    }

    return {
      type: 'simple_chat',
      message,
      tools: [],
      requiresApproval: false,
      modelUsed: 'ai_approach_mapping',
      actionType: 'simple_chat',
      context: {
        intent,
        confidence,
        reasoning
      }
    };
  }

  /**
   * Generate execution response
   */
  generateExecutionResponse(prompt, intentResult, mappedApproach) {
    const { actionType, requiresApproval, reasoning, riskAssessment, estimatedSteps } = mappedApproach;

    let message = `I'll help you with: ${prompt}`;

    if (requiresApproval) {
      message += `\n\nThis task requires approval before execution.`;
      if (riskAssessment === 'high') {
        message += `\n⚠️ High-risk operation detected.`;
      }
      if (estimatedSteps > 3) {
        message += `\n📋 Estimated steps: ${estimatedSteps}`;
      }
    }

    return {
      type: 'execution_task',
      message,
      tools: [], // Tools will be generated by the execution system
      requiresApproval,
      modelUsed: 'ai_approach_mapping',
      actionType: actionType,
      context: {
        intent: intentResult.intent,
        complexity: intentResult.complexity,
        reasoning,
        riskAssessment,
        estimatedSteps
      }
    };
  }

  /**
   * Generate default response
   */
  generateDefaultResponse(prompt, intentResult) {
    return {
      type: 'simple_chat',
      message: "I'm here to help! What would you like to work on?",
      tools: [],
      requiresApproval: false,
      modelUsed: 'ai_approach_mapping (fallback)',
      actionType: 'simple_chat',
      context: {
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        reasoning: 'Default response generated'
      }
    };
  }

  // Legacy helper methods
  handleMathQuestion(prompt) {
    // Extract math expression and provide answer
    const mathMatch = prompt.match(/(?:what is|calculate|compute|solve)\s+([0-9+\-*/()\s.]+)/i);
    if (mathMatch) {
      try {
        const expression = mathMatch[1].replace(/\s/g, '');
        const result = eval(expression);
        return `The result of ${expression} is ${result}`;
      } catch (error) {
        return "I can help with math calculations! What would you like me to compute?";
      }
    }
    return "I can help with math calculations! What would you like me to compute?";
  }

  handleGreeting(prompt) {
    const greetings = [
      "Hello! How can I help you today?",
      "Hi there! What would you like to work on?",
      "Greetings! I'm ready to assist with your development tasks.",
      "Hey! What can I help you build or create today?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  handleSimpleQuestion(prompt) {
    return "I'd be happy to help answer your question! Could you provide more context about what you'd like to know?";
  }
}

module.exports = ApproachMapper;
