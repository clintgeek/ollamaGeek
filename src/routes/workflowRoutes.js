const express = require('express');
const router = express.Router();
const WorkflowOrchestrator = require('../services/workflowOrchestrator');

// Initialize workflow orchestrator
const workflowOrchestrator = new WorkflowOrchestrator();

/**
 * 🚀 Workflow Management API Routes
 *
 * Provides endpoints for:
 * - Starting new workflows
 * - Executing workflow phases
 * - Monitoring workflow progress
 * - Managing active workflows
 */

/**
 * GET /api/workflows
 * List all active workflows
 */
router.get('/', async (req, res) => {
  try {
    const activeWorkflows = workflowOrchestrator.getActiveWorkflows();

    res.json({
      success: true,
      data: {
        activeWorkflows,
        totalActive: activeWorkflows.length,
        availableTemplates: Array.from(workflowOrchestrator.workflowTemplates.keys())
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workflows',
      details: error.message
    });
  }
});

/**
 * GET /api/workflows/templates
 * Get available workflow templates
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = Array.from(workflowOrchestrator.workflowTemplates.entries()).map(([key, template]) => ({
      id: key,
      ...template
    }));

    res.json({
      success: true,
      data: {
        templates,
        totalTemplates: templates.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow templates',
      details: error.message
    });
  }
});

/**
 * GET /api/workflows/tools
 * Get list of supported tools and their parameters
 */
router.get('/tools', async (req, res) => {
  try {
    const toolStats = workflowOrchestrator.toolExecutionEngine.getStats();

    res.json({
      success: true,
      data: {
        supportedTools: toolStats.supportedTools,
        totalTools: toolStats.totalTools,
        toolDetails: toolStats.supportedTools.map(toolName => ({
          name: toolName,
          requiredParams: workflowOrchestrator.toolExecutionEngine.getRequiredParams(toolName)
        }))
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get tool information',
      details: error.message
    });
  }
});

/**
 * POST /api/workflows
 * Start a new workflow
 */
router.post('/', async (req, res) => {
  try {
    const { userRequest, projectContext } = req.body;

    if (!userRequest) {
      return res.status(400).json({
        success: false,
        error: 'userRequest is required'
      });
    }

    // Set default project context if not provided
    const context = projectContext || {
      projectType: 'nodejs',
      projectName: 'workflow-project',
      targetDir: '/tmp/workflow-project'
    };

    // Start the workflow
    const result = await workflowOrchestrator.startWorkflow(userRequest, context);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Workflow started successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start workflow',
      details: error.message
    });
  }
});

/**
 * GET /api/workflows/:id
 * Get workflow status and details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const status = workflowOrchestrator.getWorkflowStatus(id);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow status',
      details: error.message
    });
  }
});

/**
 * POST /api/workflows/:id/execute
 * Execute the next phase of a workflow
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await workflowOrchestrator.executeNextPhase(id);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to execute workflow phase',
      details: error.message
    });
  }
});

/**
 * GET /api/workflows/:id/phases
 * Get detailed information about workflow phases
 */
router.get('/:id/phases', async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = workflowOrchestrator.activeWorkflows.get(id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    const phases = workflow.phases.map((phase, index) => ({
      ...phase,
      index,
      status: index < workflow.currentPhase ? 'completed' :
              index === workflow.currentPhase ? 'current' : 'pending',
      canExecute: workflowOrchestrator.canExecutePhase(phase, workflow.completedPhases)
    }));

    res.json({
      success: true,
      data: {
        phases,
        currentPhase: workflow.currentPhase,
        completedPhases: workflow.completedPhases,
        failedPhases: workflow.failedPhases
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow phases',
      details: error.message
    });
  }
});

/**
 * POST /api/workflows/:id/pause
 * Pause a workflow (future enhancement)
 */
router.post('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = workflowOrchestrator.activeWorkflows.get(id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    if (workflow.status === 'executing') {
      workflow.status = 'paused';
      workflowOrchestrator.activeWorkflows.set(id, workflow);

      res.json({
        success: true,
        message: 'Workflow paused successfully',
        data: { status: 'paused' }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Workflow cannot be paused in current state',
        currentStatus: workflow.status
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to pause workflow',
      details: error.message
    });
  }
});

/**
 * POST /api/workflows/:id/resume
 * Resume a paused workflow (future enhancement)
 */
router.post('/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = workflowOrchestrator.activeWorkflows.get(id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    if (workflow.status === 'paused') {
      workflow.status = 'ready';
      workflowOrchestrator.activeWorkflows.set(id, workflow);

      res.json({
        success: true,
        message: 'Workflow resumed successfully',
        data: { status: 'ready' }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Workflow cannot be resumed in current state',
        currentStatus: workflow.status
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resume workflow',
      details: error.message
    });
  }
});

/**
 * DELETE /api/workflows/:id
 * Cancel/delete a workflow
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = workflowOrchestrator.activeWorkflows.get(id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    // Mark workflow as cancelled
    workflow.status = 'cancelled';
    workflow.totalExecutionTime = Date.now() - workflow.startTime;
    workflowOrchestrator.activeWorkflows.set(id, workflow);

    res.json({
      success: true,
      message: 'Workflow cancelled successfully',
      data: { status: 'cancelled' }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to cancel workflow',
      details: error.message
    });
  }
});

/**
 * POST /api/workflows/cleanup
 * Clean up completed workflows (admin endpoint)
 */
router.post('/cleanup', async (req, res) => {
  try {
    const beforeCount = workflowOrchestrator.activeWorkflows.size;
    workflowOrchestrator.cleanupCompletedWorkflows();
    const afterCount = workflowOrchestrator.activeWorkflows.size;
    const cleanedCount = beforeCount - afterCount;

    res.json({
      success: true,
      message: `Cleanup completed successfully`,
      data: {
        workflowsBefore: beforeCount,
        workflowsAfter: afterCount,
        cleanedCount
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup workflows',
      details: error.message
    });
  }
});

/**
 * POST /api/workflows/execute-tool
 * Execute a single tool directly (for testing and direct tool execution)
 */
router.post('/execute-tool', async (req, res) => {
  try {
    const { toolName, params, context } = req.body;

    if (!toolName) {
      return res.status(400).json({
        success: false,
        error: 'toolName is required'
      });
    }

    // Execute the tool using the workflow orchestrator's tool execution engine
    const result = await workflowOrchestrator.toolExecutionEngine.executeTool(
      toolName,
      params || {},
      context || {}
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to execute tool',
      details: error.message
    });
  }
});

module.exports = router;
