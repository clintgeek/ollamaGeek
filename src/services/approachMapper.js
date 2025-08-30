const { Logger } = require('../utils/logger');
const axios = require('axios'); // Added axios for AI interaction
const PerformanceMonitor = require('./performanceMonitor');

class ApproachMapper {
  constructor() {
    this.logger = new Logger();
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.performanceMonitor = new PerformanceMonitor();
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

      // Start performance monitoring
      const operationId = `approach_analysis_${Date.now()}`;
      this.performanceMonitor.startTiming(operationId, 'qwen2.5-coder:7b-instruct-q6_K', 'approach_analysis');

      // Smart model selection: Use qwen2.5-coder:7b for approach mapping (faster than granite)
      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: 'qwen2.5-coder:7b-instruct-q6_K',
        prompt: analysisPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      }, { timeout: 120000 });

      // End performance monitoring
      this.performanceMonitor.endTiming(operationId, true);

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

      case 'web_search':
        return this.generateWebSearchResponse(prompt, intentResult);

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

  handleConversational(prompt) {
    const lowerPrompt = prompt.toLowerCase();

    // Handle basic greetings
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi') || lowerPrompt.includes('hey')) {
      const responses = [
        "Hey there! 👋 What's the vibe tonight - coding, chatting, or both? I'm ready for whatever you've got.",
        "Yo! What's good? I'm here to code, chat, and maybe learn something new. What's on your mind?",
        "Hello! 🚀 Ready to build something awesome or just shoot the breeze? I'm flexible like that.",
        "Hey! What's the plan? Coding session, casual chat, or are we solving the world's problems tonight?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Handle casual conversation
    if (lowerPrompt.includes('how are you') || lowerPrompt.includes('what\'s up') || lowerPrompt.includes('how\'s it going')) {
      const responses = [
        "Pretty solid! Though I'm more interested in what YOU'RE up to. What's the latest project or random thought?",
        "Doing great! Just waiting for your next brilliant idea or random question. What's on your mind?",
        "All good here! Though I'm curious - what's got you thinking tonight? Coding, life, or something completely random?",
        "Can't complain! But enough about me - what's your story? What are we building or discussing tonight?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Handle thanks/gratitude
    if (lowerPrompt.includes('thanks') || lowerPrompt.includes('thank you')) {
      const responses = [
        "Anytime! That's what I'm here for. What's next on the agenda?",
        "You got it! Ready for the next challenge or question whenever you are.",
        "No worries at all! What else can I help you with tonight?",
        "My pleasure! What's the next thing we're tackling?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Handle questions about drinks/alcohol
    if (lowerPrompt.includes('bourbon') || lowerPrompt.includes('whiskey') || lowerPrompt.includes('drink') || lowerPrompt.includes('pour')) {
      const responses = [
        "Oh man, now we're talking! 🥃 What's your usual go-to? I'm always curious about people's taste preferences.",
        "Drink choices are serious business! What's the occasion? That'll help narrow down the options.",
        "Ah, the important decisions in life! What's your mood tonight - something smooth and easy or something that'll wake up your taste buds?",
        "Now THIS is the kind of problem I can get behind! What are you working with? I might have some thoughts..."
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Handle questions about vehicles/cars
    if (lowerPrompt.includes('car') || lowerPrompt.includes('truck') || lowerPrompt.includes('vehicle') || lowerPrompt.includes('sierra') || lowerPrompt.includes('f150') || lowerPrompt.includes('silverado')) {
      const responses = [
        "Oh, vehicle talk! 🚗 What are you looking at? I'm always down to discuss cars, trucks, and everything in between.",
        "Nice! What's the situation? New purchase, upgrade, or just window shopping? I love talking vehicles.",
        "Vehicle decisions are the best kind of decisions! What's your current ride and what are you thinking about?",
        "Oh man, I love talking cars and trucks! What's got you interested? I might have some thoughts..."
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Handle questions about sports/entertainment
    if (lowerPrompt.includes('game') || lowerPrompt.includes('sport') || lowerPrompt.includes('team') || lowerPrompt.includes('movie') || lowerPrompt.includes('show')) {
      const responses = [
        "Oh yeah, what's happening? I'm always down to talk sports, movies, or whatever's on your mind!",
        "Nice! What's the latest? I'm curious about what's got you interested.",
        "Oh man, I love talking about this stuff! What's the scoop? I might have some thoughts...",
        "Tell me more! What's got you thinking about this? I'm always up for a good discussion."
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Handle questions that might benefit from web search
    if (this.needsWebSearch(prompt)) {
      return {
        type: 'web_search_suggested',
        message: "That's a great question! I'd love to give you the most up-to-date info on that. Want me to search the web for the latest details?",
        needsWebSearch: true,
        searchQuery: prompt,
        actionType: 'web_search'
      };
    }

    // Default conversational response - more personality
    const defaultResponses = [
      "Interesting question! What's got you thinking about that? I'm curious about your take.",
      "Oh, that's a good one! What's your perspective? I'd love to hear your thoughts.",
      "Hmm, that's got me thinking too. What's your angle on this? I'm intrigued.",
      "That's the kind of question I can get behind! What's your take? I'm all ears."
    ];
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }

  /**
   * Check if a prompt might benefit from web search
   */
  needsWebSearch(prompt) {
    const lowerPrompt = prompt.toLowerCase();

    // Questions about current events, news, or recent information
    const currentEventPatterns = [
      'latest', 'recent', 'today', 'this week', 'this month', 'this year',
      'news', 'update', 'announcement', 'release', 'launch', 'new',
      'current', 'now', 'latest version', 'latest release'
    ];

    // Questions about specific products, companies, or technologies
    const specificInfoPatterns = [
      'price', 'cost', 'review', 'rating', 'comparison', 'vs', 'versus',
      'specs', 'specifications', 'features', 'availability', 'stock',
      'release date', 'launch date', 'when will', 'what is the'
    ];

    // Questions about live data or real-time information
    const liveDataPatterns = [
      'weather', 'temperature', 'forecast', 'traffic', 'stock price',
      'crypto', 'bitcoin', 'ethereum', 'market', 'exchange rate',
      'live', 'real-time', 'current status', 'is it working'
    ];

    // Check if prompt contains patterns that suggest web search would be helpful
    const allPatterns = [...currentEventPatterns, ...specificInfoPatterns, ...liveDataPatterns];
    return allPatterns.some(pattern => lowerPrompt.includes(pattern));
  }
}

module.exports = ApproachMapper;
