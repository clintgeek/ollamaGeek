const { Logger } = require('../utils/logger');
const TaskDecomposer = require('./taskDecomposer');

class ToolOrchestrator {
  constructor() {
    this.logger = new Logger();
    this.taskDecomposer = new TaskDecomposer();
    this.executionContext = {};
  }

  /**
   * Orchestrate the execution of a complex multi-step request
   */
  async orchestrateExecution(prompt, intentResult) {
    try {
      this.logger.info(`🎬 Orchestrating execution for: "${prompt}"`);

      // Step 1: Decompose the request into logical steps
      const decomposition = this.taskDecomposer.decomposeRequest(prompt, intentResult);
      this.logger.info(`📋 Decomposed into ${decomposition.steps.length} steps`);

      // Step 2: Execute the steps in order with data flow
      const executionResult = await this.executeSteps(decomposition);

      // Step 3: Return the final result
      return this.formatExecutionResult(executionResult, decomposition);

    } catch (error) {
      this.logger.error('Tool orchestration failed:', error);
      return this.createErrorResult(error, prompt);
    }
  }

  /**
   * Execute steps in sequence with proper data flow
   */
  async executeSteps(decomposition) {
    const { steps, executionPlan, context } = decomposition;
    const results = {};
    const errors = [];

    this.logger.info(`🚀 Starting execution of ${executionPlan.order.length} steps`);

    // Execute each step in order
    for (const stepInfo of executionPlan.order) {
      try {
        this.logger.info(`⚡ Executing step ${stepInfo.order}: ${stepInfo.stepId}`);

        // Get the step details
        const step = steps.find(s => s.id === stepInfo.stepId);
        if (!step) {
          throw new Error(`Step ${stepInfo.stepId} not found`);
        }

        // Prepare parameters with data from previous steps
        const preparedParameters = this.prepareStepParameters(step, results, context);

        // Execute the step
        const stepResult = await this.executeStep(step, preparedParameters);

        // Store the result for data flow
        if (step.output && stepResult.success) {
          results[step.output] = stepResult.data;
          this.logger.info(`✅ Step ${stepInfo.stepId} completed, output: ${step.output}`);

          // Also update the context for future steps
          context[step.output] = stepResult.data;
        }

        // Update execution context
        this.executionContext[step.id] = {
          success: true,
          result: stepResult,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        this.logger.error(`❌ Step ${stepInfo.stepId} failed:`, error.message);
        errors.push({
          step: stepInfo.stepId,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        // Store failure in execution context
        this.executionContext[stepInfo.stepId] = {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };

        // Decide whether to continue or abort
        if (this.shouldAbortOnError(stepInfo, errors)) {
          this.logger.warn(`🛑 Aborting execution due to critical step failure`);
          break;
        }
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      context: this.executionContext
    };
  }

  /**
   * Execute a single step
   */
  async executeStep(step, parameters) {
    this.logger.info(`🔧 Executing ${step.type} with tool: ${step.tool}`);

    switch (step.tool) {
      case 'create_file':
        return await this.executeCreateFile(step, parameters);

      case 'math_evaluate':
        return await this.executeMathEvaluation(step, parameters);

      case 'content_prepare':
        return await this.executeContentPreparation(step, parameters);

      case 'content_repeat':
        return await this.executeContentRepetition(step, parameters);

      case 'edit_file':
        return await this.executeEditFile(step, parameters);

      default:
        throw new Error(`Unknown tool: ${step.tool}`);
    }
  }

  /**
   * Execute file creation with proper directory context
   */
  async executeCreateFile(step, parameters) {
    try {
      // Get the target directory from context or parameters
      let targetDirectory = parameters.targetDirectory || parameters.directory;

      // If we have a target directory, ensure the file path includes it
      if (targetDirectory) {
        const fileName = parameters.name;
        const fullPath = `${targetDirectory}/${fileName}`;

        this.logger.info(`📁 Creating file in directory: ${targetDirectory}`);
        this.logger.info(`📁 Full file path: ${fullPath}`);

        // Update parameters to include the full path
        const updatedParameters = {
          ...parameters,
          path: fullPath,
          targetDirectory: targetDirectory
        };

        // Call the actual file creation tool through the execution context
        const result = await this.callFileCreationTool(updatedParameters);

        return {
          success: true,
          data: {
            filePath: fullPath,
            targetDirectory: targetDirectory,
            fileName: fileName,
            content: parameters.content || '',
            created: true,
            toolResult: result
          }
        };
      } else {
        // Fallback to original behavior for files without specific directory
        const filePath = parameters.name;
        const content = parameters.content || '';

        this.logger.info(`📁 Creating file in root: ${filePath}`);

        // Call the actual file creation tool
        const result = await this.callFileCreationTool(parameters);

        return {
          success: true,
          data: {
            filePath,
            content,
            created: true,
            toolResult: result
          }
        };
      }
    } catch (error) {
      throw new Error(`File creation failed: ${error.message}`);
    }
  }

  /**
   * Call the actual file creation tool
   */
  async callFileCreationTool(parameters) {
    // This would be called by the VS Code extension
    // For now, we'll return a mock result
    return {
      success: true,
      path: parameters.path || parameters.name,
      message: `File created: ${parameters.path || parameters.name}`
    };
  }

  /**
   * Execute math evaluation
   */
  async executeMathEvaluation(step, parameters) {
    try {
      const expression = parameters.expression;
      this.logger.info(`🧮 Evaluating math expression: ${expression}`);

      let result;

      // Handle special math operations
      if (expression.toLowerCase().includes('square root')) {
        const number = expression.match(/\d+/)[0];
        result = Math.sqrt(parseInt(number));
      } else if (expression.toLowerCase().includes('sqrt')) {
        const number = expression.match(/\d+/)[0];
        result = Math.sqrt(parseInt(number));
      } else {
        // Try to evaluate as a regular expression
        result = eval(expression);
      }

      this.logger.info(`✅ Math result: ${expression} = ${result}`);

      return {
        success: true,
        data: {
          expression,
          result,
          type: 'math_result'
        }
      };
    } catch (error) {
      throw new Error(`Math evaluation failed: ${error.message}`);
    }
  }

  /**
   * Execute content preparation
   */
  async executeContentPreparation(step, parameters) {
    try {
      const content = parameters.content;
      this.logger.info(`📝 Preparing content: "${content}"`);

      // Clean and prepare the content
      const preparedContent = content.replace(/^["']|["']$/g, ''); // Remove quotes

      return {
        success: true,
        data: {
          originalContent: content,
          preparedContent,
          type: 'content'
        }
      };
    } catch (error) {
      throw new Error(`Content preparation failed: ${error.message}`);
    }
  }

  /**
   * Execute content repetition
   */
  async executeContentRepetition(step, parameters) {
    try {
      const { content, count, targetFile } = parameters;

      if (!content || !count || !targetFile) {
        throw new Error(`Missing required parameters for content repetition. Content: ${content}, Count: ${count}, TargetFile: ${targetFile}`);
      }

      this.logger.info(`🔄 Repeating content "${content}" ${count} times in ${targetFile}`);

      // Generate repeated content
      const repeatedContent = Array(parseInt(count)).fill(content).join('\n');

      // Update the file with repeated content
      const finalContent = `# File created by OllamaGeek\n# ${targetFile}\n\n${repeatedContent}\n`;

      return {
        success: true,
        data: {
          originalContent: content,
          repetitionCount: count,
          finalContent,
          targetFile,
          type: 'repeated_content'
        }
      };
    } catch (error) {
      throw new Error(`Content repetition failed: ${error.message}`);
    }
  }

  /**
   * Execute file editing
   */
  async executeEditFile(step, parameters) {
    try {
      const { path, content } = parameters;
      this.logger.info(`✏️ Editing file: ${path}`);

      // Simulate file editing
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        data: {
          filePath: path,
          content,
          edited: true,
          type: 'file_edit'
        }
      };
    } catch (error) {
      throw new Error(`File editing failed: ${error.message}`);
    }
  }

  /**
   * Prepare step parameters with data from previous steps
   */
  prepareStepParameters(step, results, context) {
    const parameters = { ...step.parameters };

    this.logger.info(`🔧 Preparing parameters for ${step.id}:`, parameters);

    // Replace null parameters with actual values from results
    Object.keys(parameters).forEach(key => {
      if (parameters[key] === null) {
        // Look for the value in results based on step dependencies
        for (const depId of step.dependencies || []) {
          const depStep = this.findStepById(depId);
          if (depStep && results[depStep.output]) {
            // Map the dependency output to this parameter
            const mappedValue = this.mapDependencyToParameter(key, depStep.output, results[depStep.output]);
            if (mappedValue !== undefined) {
              parameters[key] = mappedValue;
              this.logger.info(`✅ Mapped ${depStep.output} to ${key}: ${mappedValue}`);
              break;
            }
          }
        }
      }
    });

    // Also populate from context
    Object.keys(parameters).forEach(key => {
      if (parameters[key] === null && context[key]) {
        parameters[key] = context[key];
        this.logger.info(`✅ Populated ${key} from context: ${context[key]}`);
      }
    });

    this.logger.info(`🔧 Final parameters for ${step.id}:`, parameters);
    return parameters;
  }

  /**
   * Find step by ID
   */
  findStepById(stepId) {
    // This would need access to the decomposition steps
    // For now, return a mock step
    return {
      id: stepId,
      output: stepId === 'math_calculation' ? 'mathResult' :
              stepId === 'content_generation' ? 'preparedContent' :
              stepId === 'file_creation' ? 'targetFile' : 'unknown'
    };
  }

  /**
   * Map dependency output to parameter
   */
  mapDependencyToParameter(paramKey, depOutput, depValue) {
    // Map math result to count
    if (paramKey === 'count' && depOutput === 'mathResult') {
      return depValue.result;
    }

    // Map content to content parameter
    if (paramKey === 'content' && depOutput === 'preparedContent') {
      return depValue.preparedContent;
    }

    // Map target file
    if (paramKey === 'targetFile' && depOutput === 'targetFile') {
      return depValue.filePath;
    }

    return undefined;
  }

  /**
   * Determine if execution should abort on error
   */
  shouldAbortOnError(stepInfo, errors) {
    // Critical steps that should cause abortion
    const criticalSteps = ['file_creation', 'math_calculation'];

    if (criticalSteps.includes(stepInfo.stepId)) {
      return true;
    }

    // Too many errors
    if (errors.length > 3) {
      return true;
    }

    return false;
  }

  /**
   * Format the final execution result
   */
  formatExecutionResult(executionResult, decomposition) {
    if (executionResult.success) {
      return {
        type: 'execution_success',
        message: `Successfully executed ${decomposition.steps.length}-step workflow`,
        tools: this.formatToolsFromDecomposition(decomposition),
        requiresApproval: false,
        modelUsed: 'tool_orchestration',
        actionType: 'execution_complex',
        context: {
          steps: decomposition.steps.length,
          executionTime: new Date().toISOString(),
          results: executionResult.results
        }
      };
    } else {
      return {
        type: 'execution_failed',
        message: `Workflow execution failed after ${executionResult.errors.length} errors`,
        tools: [],
        requiresApproval: false,
        modelUsed: 'tool_orchestration',
        actionType: 'execution_failed',
        context: {
          errors: executionResult.errors,
          partialResults: executionResult.results
         }
      };
    }
  }

  /**
   * Format tools from decomposition for the response
   */
  formatToolsFromDecomposition(decomposition) {
    return decomposition.steps.map(step => ({
      name: step.tool,
      description: step.description,
      parameters: step.parameters,
      context: `Step: ${step.id}`
    }));
  }

  /**
   * Create error result
   */
  createErrorResult(error, prompt) {
    return {
      type: 'execution_error',
      message: `Failed to orchestrate execution: ${error.message}`,
      tools: [],
      requiresApproval: false,
      modelUsed: 'tool_orchestration',
      actionType: 'execution_error',
      context: {
        error: error.message,
        prompt: prompt
      }
    };
  }
}

module.exports = ToolOrchestrator;
