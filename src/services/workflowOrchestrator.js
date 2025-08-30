const { Logger } = require('../utils/logger');
const SmartToolGenerator = require('./smartToolGenerator');
const PerformanceMonitor = require('./performanceMonitor');
const ToolExecutionEngine = require('./toolExecutionEngine');

/**
 * 🚀 Workflow Orchestrator
 *
 * Manages complex multi-step workflows, handles dependencies,
 * and coordinates tool execution with intelligent error recovery.
 */
class WorkflowOrchestrator {
  constructor() {
    this.logger = new Logger();
    this.smartToolGenerator = new SmartToolGenerator();
    this.performanceMonitor = new PerformanceMonitor();
    this.toolExecutionEngine = new ToolExecutionEngine();

    // Workflow state management
    this.activeWorkflows = new Map();
    this.workflowTemplates = new Map();

    // Initialize core workflow templates
    this.initializeWorkflowTemplates();
  }

  /**
   * Initialize core workflow templates for common project types
   */
  initializeWorkflowTemplates() {
    // Full-Stack React App Template
    this.workflowTemplates.set('fullstack_react', {
      name: 'Full-Stack React Application',
      description: 'Complete React frontend + Node.js backend + database setup',
      phases: [
        {
          name: 'project_setup',
          description: 'Initialize project structure and dependencies',
          tools: ['create_directory', 'create_file', 'install_dependency'],
          dependencies: [],
          estimatedTime: '5-8 minutes',
          complexity: 'medium'
        },
        {
          name: 'backend_development',
          description: 'Create Express.js server with API endpoints',
          tools: ['create_file', 'install_dependency', 'configure_linter'],
          dependencies: ['project_setup'],
          estimatedTime: '10-15 minutes',
          complexity: 'high'
        },
        {
          name: 'frontend_development',
          description: 'Build React components and state management',
          tools: ['create_file', 'install_dependency', 'configure_linter'],
          dependencies: ['project_setup'],
          estimatedTime: '15-20 minutes',
          complexity: 'high'
        },
        {
          name: 'testing_setup',
          description: 'Configure testing framework and generate tests',
          tools: ['create_file', 'install_dependency', 'run_tests'],
          dependencies: ['backend_development', 'frontend_development'],
          estimatedTime: '8-12 minutes',
          complexity: 'medium'
        },
        {
          name: 'deployment_prep',
          description: 'Prepare for deployment with Docker and CI/CD',
          tools: ['create_file', 'configure_linter'],
          dependencies: ['testing_setup'],
          estimatedTime: '5-8 minutes',
          complexity: 'medium'
        }
      ],
      totalEstimatedTime: '43-63 minutes',
      complexity: 'high'
    });

    // Simple Node.js API Template
    this.workflowTemplates.set('nodejs_api', {
      name: 'Node.js REST API',
      description: 'Express.js API with database integration',
      phases: [
        {
          name: 'project_setup',
          description: 'Initialize Node.js project structure',
          tools: ['create_directory', 'create_file', 'install_dependency'],
          dependencies: [],
          estimatedTime: '3-5 minutes',
          complexity: 'low'
        },
        {
          name: 'api_development',
          description: 'Create Express.js server and routes',
          tools: ['create_file', 'install_dependency'],
          dependencies: ['project_setup'],
          estimatedTime: '8-12 minutes',
          complexity: 'medium'
        },
        {
          name: 'testing',
          description: 'Set up testing framework and generate tests',
          tools: ['create_file', 'install_dependency', 'run_tests'],
          dependencies: ['api_development'],
          estimatedTime: '5-8 minutes',
          complexity: 'low'
        }
      ],
      totalEstimatedTime: '16-25 minutes',
      complexity: 'medium'
    });

    this.logger.info('✅ Workflow templates initialized', {
      templates: Array.from(this.workflowTemplates.keys())
    });
  }

  /**
   * Start a new workflow based on user request
   */
  async startWorkflow(userRequest, projectContext) {
    try {
      const workflowId = this.generateWorkflowId();

      // Analyze user request to determine workflow type
      const workflowType = await this.analyzeWorkflowType(userRequest, projectContext);

      // Get or create workflow template
      const template = this.getWorkflowTemplate(workflowType, userRequest, projectContext);

      // Create workflow instance
      const workflow = {
        id: workflowId,
        type: workflowType,
        template: template,
        status: 'initializing',
        currentPhase: 0,
        phases: template.phases,
        context: projectContext,
        userRequest: userRequest,
        startTime: Date.now(),
        completedPhases: [],
        failedPhases: [],
        currentPhaseStartTime: null,
        totalExecutionTime: 0,
        errors: [],
        logs: []
      };

      // Store active workflow
      this.activeWorkflows.set(workflowId, workflow);

      this.logger.info('🚀 Workflow started', {
        workflowId,
        type: workflowType,
        phases: template.phases.length,
        estimatedTime: template.totalEstimatedTime
      });

      return {
        workflowId,
        workflow,
        nextPhase: template.phases[0]
      };

    } catch (error) {
      this.logger.error('❌ Failed to start workflow', { error: error.message });
      throw new Error(`Workflow initialization failed: ${error.message}`);
    }
  }

  /**
   * Analyze user request to determine appropriate workflow type
   */
  async analyzeWorkflowType(userRequest, projectContext) {
    try {
      const request = userRequest.toLowerCase();

      // Simple keyword-based analysis (can be enhanced with AI later)
      if (request.includes('full-stack') || request.includes('fullstack') ||
          request.includes('react') && request.includes('backend')) {
        return 'fullstack_react';
      }

      if (request.includes('api') || request.includes('rest') ||
          request.includes('express') || request.includes('server')) {
        return 'nodejs_api';
      }

      // Default to Node.js API for now
      return 'nodejs_api';

    } catch (error) {
      this.logger.warn('⚠️ Workflow type analysis failed, using default', { error: error.message });
      return 'nodejs_api';
    }
  }

  /**
   * Get or create workflow template based on type and context
   */
  getWorkflowTemplate(workflowType, userRequest, projectContext) {
    let template = this.workflowTemplates.get(workflowType);

    if (!template) {
      // Create custom template based on user request
      template = this.createCustomTemplate(userRequest, projectContext);
    }

    // Customize template based on project context
    return this.customizeTemplate(template, projectContext);
  }

  /**
   * Create custom workflow template based on user request
   */
  createCustomTemplate(userRequest, projectContext) {
    // This will be enhanced with AI analysis later
    return {
      name: 'Custom Workflow',
      description: `Custom workflow for: ${userRequest}`,
      phases: [
        {
          name: 'custom_phase',
          description: 'Custom implementation phase',
          tools: ['create_file', 'install_dependency'],
          dependencies: [],
          estimatedTime: '10-15 minutes',
          complexity: 'medium'
        }
      ],
      totalEstimatedTime: '10-15 minutes',
      complexity: 'medium'
    };
  }

  /**
   * Customize template based on project context
   */
  customizeTemplate(template, projectContext) {
    const customized = JSON.parse(JSON.stringify(template));

    // Adjust complexity based on project context
    if (projectContext.projectType === 'fullstack') {
      customized.complexity = 'high';
    } else if (projectContext.projectType === 'simple') {
      customized.complexity = 'low';
    }

    // Adjust estimated times based on complexity
    customized.phases.forEach(phase => {
      if (customized.complexity === 'high') {
        phase.estimatedTime = this.increaseEstimatedTime(phase.estimatedTime, 1.5);
      } else if (customized.complexity === 'low') {
        phase.estimatedTime = this.decreaseEstimatedTime(phase.estimatedTime, 0.7);
      }
    });

    return customized;
  }

  /**
   * Increase estimated time by multiplier
   */
  increaseEstimatedTime(timeString, multiplier) {
    const match = timeString.match(/(\d+)-(\d+)/);
    if (match) {
      const min = Math.ceil(parseInt(match[1]) * multiplier);
      const max = Math.ceil(parseInt(match[2]) * multiplier);
      return `${min}-${max} minutes`;
    }
    return timeString;
  }

  /**
   * Decrease estimated time by multiplier
   */
  decreaseEstimatedTime(timeString, multiplier) {
    const match = timeString.match(/(\d+)-(\d+)/);
    if (match) {
      const min = Math.ceil(parseInt(match[1]) * multiplier);
      const max = Math.ceil(parseInt(match[2]) * multiplier);
      return `${min}-${max} minutes`;
    }
    return timeString;
  }

  /**
   * Execute the next phase of a workflow
   */
  async executeNextPhase(workflowId) {
    try {
      const workflow = this.activeWorkflows.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      if (workflow.status === 'completed') {
        return { status: 'completed', message: 'Workflow already completed' };
      }

      if (workflow.status === 'failed') {
        return { status: 'failed', message: 'Workflow has failed and cannot continue' };
      }

      const currentPhase = workflow.phases[workflow.currentPhase];
      if (!currentPhase) {
        // Workflow completed
        workflow.status = 'completed';
        workflow.totalExecutionTime = Date.now() - workflow.startTime;
        this.activeWorkflows.set(workflowId, workflow);

        this.logger.info('🎉 Workflow completed', {
          workflowId,
          totalTime: workflow.totalExecutionTime,
          completedPhases: workflow.completedPhases.length
        });

        return { status: 'completed', workflow };
      }

      // Check phase dependencies
      if (!this.canExecutePhase(currentPhase, workflow.completedPhases)) {
        return {
          status: 'waiting',
          message: `Phase ${currentPhase.name} waiting for dependencies`,
          dependencies: currentPhase.dependencies
        };
      }

      // Start phase execution
      workflow.status = 'executing';
      workflow.currentPhaseStartTime = Date.now();
      this.activeWorkflows.set(workflowId, workflow);

      this.logger.info('🔄 Executing workflow phase', {
        workflowId,
        phase: currentPhase.name,
        tools: currentPhase.tools.length,
        estimatedTime: currentPhase.estimatedTime
      });

      // Execute phase tools
      const phaseResult = await this.executePhase(currentPhase, workflow);

      if (phaseResult.success) {
        // Phase completed successfully
        workflow.completedPhases.push(currentPhase.name);
        workflow.currentPhase++;
        workflow.status = 'ready';

        this.logger.info('✅ Phase completed successfully', {
          workflowId,
          phase: currentPhase.name,
          executionTime: Date.now() - workflow.currentPhaseStartTime
        });

        return {
          status: 'phase_completed',
          phase: currentPhase.name,
          nextPhase: workflow.phases[workflow.currentPhase],
          workflow
        };
      } else {
        // Phase failed
        workflow.failedPhases.push({
          phase: currentPhase.name,
          error: phaseResult.error,
          timestamp: Date.now()
        });
        workflow.status = 'failed';
        workflow.errors.push(phaseResult.error);

        this.logger.error('❌ Phase failed', {
          workflowId,
          phase: currentPhase.name,
          error: phaseResult.error
        });

        return {
          status: 'phase_failed',
          phase: currentPhase.name,
          error: phaseResult.error,
          workflow
        };
      }

    } catch (error) {
      this.logger.error('❌ Workflow phase execution failed', {
        workflowId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if a phase can be executed based on dependencies
   */
  canExecutePhase(phase, completedPhases) {
    if (!phase.dependencies || phase.dependencies.length === 0) {
      return true;
    }

    return phase.dependencies.every(dep => completedPhases.includes(dep));
  }

  /**
   * Execute a single phase with all its tools
   */
  async executePhase(phase, workflow) {
    try {
      this.logger.info(`🚀 Executing phase: ${phase.name}`, { workflowId: workflow.id });

      // First, generate the tool execution plan using AI
      const toolExecutionPlan = await this.generateToolExecutionPlan(phase, workflow);

      if (!toolExecutionPlan.success) {
        return {
          success: false,
          error: `Failed to generate tool execution plan: ${toolExecutionPlan.error}`,
          phase: phase.name
        };
      }

      // Execute the tools using the ToolExecutionEngine
      const executionResults = await this.toolExecutionEngine.executeTools(
        toolExecutionPlan.tools,
        workflow.context
      );

      // Analyze results and determine phase success
      const successfulTools = executionResults.filter(r => r.success);
      const failedTools = executionResults.filter(r => !r.success);

      if (failedTools.length > 0) {
        this.logger.warn(`⚠️ Phase ${phase.name} completed with ${failedTools.length} failed tools`, { failedTools });

        // Phase fails if any critical tools fail
        return {
          success: false,
          error: `Phase ${phase.name} failed: ${failedTools.length} tools failed`,
          phase: phase.name,
          results: executionResults,
          successfulTools: successfulTools.length,
          failedTools: failedTools.length
        };
      }

      this.logger.info(`✅ Phase ${phase.name} completed successfully`, {
        successfulTools: successfulTools.length,
        results: executionResults
      });

      return {
        success: true,
        phase: phase.name,
        results: executionResults,
        successfulTools: successfulTools.length,
        failedTools: failedTools.length
      };

    } catch (error) {
      this.logger.error(`❌ Phase ${phase.name} execution failed`, { error: error.message });
      return {
        success: false,
        error: `Phase execution failed: ${error.message}`,
        phase: phase.name
      };
    }
  }

  /**
   * Generate tool execution plan using Smart Tool Generator
   */
  async generateToolExecutionPlan(phase, workflow) {
    try {
      this.logger.info(`🧠 Generating tool execution plan for phase: ${phase.name}`);

      // Use Smart Tool Generator to create tools for this phase
      const generatedTools = await this.smartToolGenerator.generateToolsForPhase(
        phase.name,
        workflow.context
      );

      if (!generatedTools || generatedTools.length === 0) {
        throw new Error(`No tools generated for phase: ${phase.name}`);
      }

      // Convert to execution format
      const results = generatedTools.map(tool => ({
        tool: tool.name,
        params: tool.params,
        critical: tool.critical || this.isCriticalTool(tool.name),
        priority: tool.priority,
        dependencies: tool.dependencies || []
      }));

      this.logger.info(`✅ Generated ${results.length} tools for phase ${phase.name}`);
      return { success: true, tools: results };

    } catch (error) {
      this.logger.error(`❌ Failed to generate tool execution plan:`, error);
      return { success: false, error: error.message };
    }
  }





  /**
   * Determine if a tool is critical for phase success
   */
  isCriticalTool(toolName) {
    const criticalTools = ['create_directory', 'create_file', 'run_terminal'];
    return criticalTools.includes(toolName);
  }

  /**
   * Get workflow status and progress
   */
  getWorkflowStatus(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return null;
    }

    const totalPhases = workflow.phases.length;
    const completedPhases = workflow.completedPhases.length;
    const progress = (completedPhases / totalPhases) * 100;

    return {
      id: workflow.id,
      status: workflow.status,
      progress: Math.round(progress),
      currentPhase: workflow.currentPhase,
      totalPhases,
      completedPhases,
      failedPhases: workflow.failedPhases.length,
      estimatedTimeRemaining: this.calculateRemainingTime(workflow),
      errors: workflow.errors,
      startTime: workflow.startTime,
      totalExecutionTime: workflow.totalExecutionTime
    };
  }

  /**
   * Calculate estimated time remaining for workflow
   */
  calculateRemainingTime(workflow) {
    if (workflow.status === 'completed' || workflow.status === 'failed') {
      return '0 minutes';
    }

    const remainingPhases = workflow.phases.slice(workflow.currentPhase);
    let totalMinutes = 0;

    remainingPhases.forEach(phase => {
      const timeMatch = phase.estimatedTime.match(/(\d+)-(\d+)/);
      if (timeMatch) {
        totalMinutes += parseInt(timeMatch[2]); // Use max estimate
      }
    });

    return `${totalMinutes} minutes`;
  }

  /**
   * Generate unique workflow ID
   */
  generateWorkflowId() {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all active workflows
   */
  getActiveWorkflows() {
    return Array.from(this.activeWorkflows.values()).map(workflow => ({
      id: workflow.id,
      type: workflow.type,
      status: workflow.status,
      progress: Math.round((workflow.completedPhases.length / workflow.phases.length) * 100),
      startTime: workflow.startTime
    }));
  }

  /**
   * Clean up completed workflows
   */
  cleanupCompletedWorkflows() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [id, workflow] of this.activeWorkflows.entries()) {
      if (workflow.status === 'completed' || workflow.status === 'failed') {
        if (now - workflow.startTime > maxAge) {
          this.activeWorkflows.delete(id);
          this.logger.info('🧹 Cleaned up old workflow', { workflowId: id });
        }
      }
    }
  }
}

module.exports = WorkflowOrchestrator;
