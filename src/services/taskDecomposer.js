const { Logger } = require('../utils/logger');

class TaskDecomposer {
  constructor() {
    this.logger = new Logger();
  }

  /**
   * Decompose a complex request into logical, executable steps
   */
  decomposeRequest(prompt, intentResult) {
    try {
      this.logger.info(`🧠 Decomposing complex request: "${prompt}"`);

      if (intentResult.intent === 'complex_multi_step') {
        return this.decomposeMultiStepWorkflow(prompt, intentResult);
      }

      // Default decomposition for other complex intents
      return this.decomposeGeneralComplexRequest(prompt, intentResult);
    } catch (error) {
      this.logger.error('Task decomposition failed:', error);
      return this.createFallbackDecomposition(prompt);
    }
  }

  /**
   * Decompose multi-step workflows like file + math + content
   */
  decomposeMultiStepWorkflow(prompt, intentResult) {
    const steps = [];
    const context = {};

    // Step 1: File Creation
    const fileStep = this.extractFileCreationStep(prompt);
    if (fileStep) {
      steps.push(fileStep);
      context.targetFile = fileStep.target;
      this.logger.info(`📁 Extracted file creation step: ${fileStep.target}`);
    } else {
      this.logger.warn(`⚠️ No file creation step detected in prompt: ${prompt}`);
    }

    // Step 2: Math Calculation
    const mathStep = this.extractMathCalculationStep(prompt);
    if (mathStep) {
      steps.push(mathStep);
      context.mathResult = null; // Will be populated during execution
      this.logger.info(`🧮 Extracted math calculation step: ${mathStep.expression}`);
    } else {
      this.logger.warn(`⚠️ No math calculation step detected in prompt: ${prompt}`);
    }

    // Step 3: Content Generation
    const contentStep = this.extractContentGenerationStep(prompt);
    if (contentStep) {
      steps.push(contentStep);
      context.content = contentStep.content;
      this.logger.info(`📝 Extracted content generation step: "${contentStep.content}"`);
    } else {
      this.logger.warn(`⚠️ No content generation step detected in prompt: ${prompt}`);
    }

    // Step 4: Repetition Logic
    const repetitionStep = this.extractRepetitionLogic(prompt);
    if (repetitionStep) {
      steps.push(repetitionStep);
      context.repetitionCount = null; // Will be populated from math result
      this.logger.info(`🔄 Extracted repetition logic step`);
    } else {
      this.logger.warn(`⚠️ No repetition logic step detected in prompt: ${prompt}`);
    }

    // Create execution plan with data flow
    const executionPlan = this.createExecutionPlan(steps, context);

    this.logger.info(`📋 Decomposed into ${steps.length} steps with data flow`);

    return {
      type: 'multi_step_workflow',
      steps: steps,
      executionPlan: executionPlan,
      context: context,
      complexity: 'high',
      requiresOrchestration: true
    };
  }

  /**
   * Extract file creation step with directory context
   */
  extractFileCreationStep(prompt) {
    // First, try to extract directory information
    const directoryPatterns = [
      /(?:in\s+(?:a\s+)?(?:folder\s+named\s+|directory\s+named\s+|folder\s+called\s+|directory\s+called\s+))([a-zA-Z0-9._-]+)/i,
      /(?:in\s+(?:a\s+)?(?:folder\s+|directory\s+))([a-zA-Z0-9._-]+)/i,
      /(?:folder\s+named\s+|directory\s+named\s+|folder\s+called\s+|directory\s+called\s+)([a-zA-Z0-9._-]+)/i
    ];

    let targetDirectory = null;
    for (const dirPattern of directoryPatterns) {
      const dirMatch = prompt.match(dirPattern);
      if (dirMatch) {
        targetDirectory = dirMatch[1];
        this.logger.info(`✅ Directory pattern matched: ${dirMatch[0]} -> ${targetDirectory}`);
        break;
      }
    }

    // Then extract file information
    const filePatterns = [
      /(?:make|create|new)\s+(?:a\s+)?file\s+(?:called\s+|named\s+)?([a-zA-Z0-9._-]+)/i,
      /(?:make|create|new)\s+(?:a\s+)?file\s+([a-zA-Z0-9._-]+)/i,
      /file\s+(?:called\s+|named\s+)?([a-zA-Z0-9._-]+)/i
    ];

    for (const pattern of filePatterns) {
      const fileMatch = prompt.match(pattern);
      if (fileMatch) {
        const fileName = fileMatch[1];
        this.logger.info(`✅ File creation pattern matched: ${fileMatch[0]} -> ${fileName}`);

        // Create parameters with directory context
        const parameters = {
          name: fileName,
          content: '' // Will be populated later
        };

        // Add directory context if found
        if (targetDirectory) {
          parameters.targetDirectory = targetDirectory;
          parameters.directory = targetDirectory;
          this.logger.info(`📁 File will be created in directory: ${targetDirectory}`);
        }

        return {
          id: 'file_creation',
          type: 'file_creation',
          target: fileName,
          description: `Create file ${fileName}${targetDirectory ? ` in directory ${targetDirectory}` : ''}`,
          tool: 'create_file',
          parameters: parameters,
          dependencies: [],
          output: 'targetFile'
        };
      }
    }

    this.logger.warn(`❌ No file creation pattern matched for prompt: ${prompt}`);
    return null;
  }

  /**
   * Extract math calculation step
   */
  extractMathCalculationStep(prompt) {
    const mathMatch = prompt.match(/(?:calculate|compute|solve)\s+(.+?)(?:\s+and|\s+then|\s*[.,]|\s*$)/i);
    if (mathMatch) {
      const expression = mathMatch[1].trim();
      return {
        id: 'math_calculation',
        type: 'math_calculation',
        expression: expression,
        description: `Calculate: ${expression}`,
        tool: 'math_evaluate',
        parameters: {
          expression: expression
        },
        dependencies: [],
        output: 'mathResult'
      };
    }
    return null;
  }

  /**
   * Extract content generation step
   */
  extractContentGenerationStep(prompt) {
    const contentMatch = prompt.match(/(?:write|put)\s+(.+?)\s+(?:that\s+many\s+times|in\s+the\s+file|to\s+the\s+file)/i);
    if (contentMatch) {
      const content = contentMatch[1].trim();
      return {
        id: 'content_generation',
        type: 'content_generation',
        content: content,
        description: `Generate content: "${content}"`,
        tool: 'content_prepare',
        parameters: {
          content: content
        },
        dependencies: ['math_calculation'],
        output: 'preparedContent'
      };
    }
    return null;
  }

  /**
   * Extract repetition logic step
   */
  extractRepetitionLogic(prompt) {
    const repetitionMatch = prompt.match(/(?:that\s+many\s+times|(\d+)\s+times)/i);
    if (repetitionMatch) {
      return {
        id: 'repetition_logic',
        type: 'repetition_logic',
        reference: repetitionMatch[1] || 'math_result',
        description: `Repeat content based on calculation result`,
        tool: 'content_repeat',
        parameters: {
          content: null, // Will be populated from content generation
          count: null,   // Will be populated from math result
          targetFile: null // Will be populated from file creation
        },
        dependencies: ['file_creation', 'math_calculation', 'content_generation'],
        output: 'finalFile'
      };
    }
    return null;
  }

  /**
   * Create execution plan with proper data flow
   */
  createExecutionPlan(steps, context) {
    const executionOrder = [];
    const dataFlow = {};

    // Sort steps by dependencies
    const sortedSteps = this.topologicalSort(steps);

    sortedSteps.forEach((step, index) => {
      executionOrder.push({
        stepId: step.id,
        order: index + 1,
        tool: step.tool,
        parameters: step.parameters,
        dependencies: step.dependencies,
        output: step.output
      });

      // Set up data flow
      if (step.output) {
        dataFlow[step.output] = {
          source: step.id,
          type: step.type,
          value: null // Will be populated during execution
        };
      }
    });

    return {
      order: executionOrder,
      dataFlow: dataFlow,
      context: context
    };
  }

  /**
   * Topological sort to handle dependencies
   */
  topologicalSort(steps) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (step) => {
      if (visiting.has(step.id)) {
        throw new Error(`Circular dependency detected: ${step.id}`);
      }
      if (visited.has(step.id)) {
        return;
      }

      visiting.add(step.id);

      // Visit dependencies first
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          const depStep = steps.find(s => s.id === depId);
          if (depStep) {
            visit(depStep);
          }
        }
      }

      visiting.delete(step.id);
      visited.add(step.id);
      sorted.push(step);
    };

    steps.forEach(step => visit(step));
    return sorted;
  }

  /**
   * Decompose general complex requests
   */
  decomposeGeneralComplexRequest(prompt, intentResult) {
    return {
      type: 'general_complex',
      steps: [{
        id: 'general_execution',
        type: 'general_execution',
        description: `Execute: ${prompt}`,
        tool: 'general_planning',
        parameters: { prompt },
        dependencies: [],
        output: 'result'
      }],
      executionPlan: {
        order: [{
          stepId: 'general_execution',
          order: 1,
          tool: 'general_planning',
          parameters: { prompt },
          dependencies: [],
          output: 'result'
        }],
        dataFlow: {},
        context: {}
      },
      context: {},
      complexity: 'high',
      requiresOrchestration: true
    };
  }

  /**
   * Create fallback decomposition if all else fails
   */
  createFallbackDecomposition(prompt) {
    this.logger.warn(`Creating fallback decomposition for: "${prompt}"`);

    return {
      type: 'fallback',
      steps: [{
        id: 'fallback_execution',
        type: 'fallback_execution',
        description: `Fallback execution for: ${prompt}`,
        tool: 'fallback_planning',
        parameters: { prompt },
        dependencies: [],
        output: 'result'
      }],
      executionPlan: {
        order: [{
          stepId: 'fallback_execution',
          order: 1,
          tool: 'fallback_planning',
          parameters: { prompt },
          dependencies: [],
          output: 'result'
        }],
        dataFlow: {},
        context: {}
      },
      context: {},
      complexity: 'medium',
      requiresOrchestration: false
    };
  }
}

module.exports = TaskDecomposer;
