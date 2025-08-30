const request = require('supertest');
const express = require('express');

// Mock the WorkflowOrchestrator service
jest.mock('../../src/services/workflowOrchestrator');

const WorkflowOrchestrator = require('../../src/services/workflowOrchestrator');

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock workflow orchestrator instance
const mockWorkflowOrchestrator = {
  startWorkflow: jest.fn(),
  getWorkflowStatus: jest.fn(),
  executeNextPhase: jest.fn(),
  getActiveWorkflows: jest.fn(),
  workflowTemplates: new Map([
    ['nodejs_api', { name: 'Node.js REST API' }],
    ['fullstack_react', { name: 'Full-Stack React Application' }]
  ]),
  activeWorkflows: new Map(),
  canExecutePhase: jest.fn(),
  cleanupCompletedWorkflows: jest.fn()
};

// Set up the mock to return our mock instance
WorkflowOrchestrator.mockImplementation(() => mockWorkflowOrchestrator);

// Import the routes after mocking
const workflowRoutes = require('../../src/routes/workflowRoutes');

// Apply routes to test app
app.use('/api/workflows', workflowRoutes);

describe('Workflow Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock maps
    mockWorkflowOrchestrator.workflowTemplates = new Map([
      ['nodejs_api', { name: 'Node.js REST API' }],
      ['fullstack_react', { name: 'Full-Stack React Application' }]
    ]);
    mockWorkflowOrchestrator.activeWorkflows = new Map();
  });

  describe('GET /', () => {
    test('should return list of active workflows', async () => {
      const mockWorkflows = [
        { id: 'workflow_1', type: 'nodejs_api', status: 'running' },
        { id: 'workflow_2', type: 'fullstack_react', status: 'completed' }
      ];

      mockWorkflowOrchestrator.getActiveWorkflows.mockReturnValue(mockWorkflows);

      const response = await request(app)
        .get('/api/workflows')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          activeWorkflows: mockWorkflows,
          totalActive: 2,
          availableTemplates: ['nodejs_api', 'fullstack_react']
        }
      });

      expect(mockWorkflowOrchestrator.getActiveWorkflows).toHaveBeenCalled();
    });

    test('should handle errors when getting workflows', async () => {
      mockWorkflowOrchestrator.getActiveWorkflows.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/workflows')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve workflows',
        details: 'Database error'
      });
    });
  });

  describe('GET /templates', () => {
    test('should return available workflow templates', async () => {
      const response = await request(app)
        .get('/api/workflows/templates')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          templates: [
            { id: 'nodejs_api', name: 'Node.js REST API' },
            { id: 'fullstack_react', name: 'Full-Stack React Application' }
          ],
          totalTemplates: 2
        }
      });
    });

    test('should handle errors when getting templates', async () => {
      // Mock the templates access to throw an error
      const originalTemplates = mockWorkflowOrchestrator.workflowTemplates;
      mockWorkflowOrchestrator.workflowTemplates = null;

      const response = await request(app)
        .get('/api/workflows/templates')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get workflow templates',
        details: 'Cannot read properties of null (reading \'entries\')'
      });

      // Restore original
      mockWorkflowOrchestrator.workflowTemplates = originalTemplates;
    });
  });

  describe('POST /', () => {
    test('should start a new workflow', async () => {
      const workflowRequest = {
        userRequest: 'Build a Node.js API',
        projectContext: { projectType: 'nodejs' }
      };

      const mockResult = {
        workflowId: 'workflow_123',
        workflow: { id: 'workflow_123', type: 'nodejs_api' },
        nextPhase: { name: 'project_setup' }
      };

      mockWorkflowOrchestrator.startWorkflow.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/workflows')
        .send(workflowRequest)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockResult,
        message: 'Workflow started successfully'
      });

      expect(mockWorkflowOrchestrator.startWorkflow).toHaveBeenCalledWith(
        workflowRequest.userRequest,
        workflowRequest.projectContext
      );
    });

    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'userRequest is required'
      });
    });

    test('should handle workflow start errors', async () => {
      const workflowRequest = {
        userRequest: 'Build a Node.js API',
        projectContext: { projectType: 'nodejs' }
      };

      mockWorkflowOrchestrator.startWorkflow.mockRejectedValue(
        new Error('Workflow start failed')
      );

      const response = await request(app)
        .post('/api/workflows')
        .send(workflowRequest)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to start workflow',
        details: 'Workflow start failed'
      });
    });
  });

  describe('GET /:id', () => {
    test('should return workflow status', async () => {
      const workflowId = 'workflow_123';
      const mockStatus = {
        id: workflowId,
        status: 'running',
        progress: 50,
        currentPhase: 1
      };

      mockWorkflowOrchestrator.getWorkflowStatus.mockReturnValue(mockStatus);

      const response = await request(app)
        .get(`/api/workflows/${workflowId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStatus
      });

      expect(mockWorkflowOrchestrator.getWorkflowStatus).toHaveBeenCalledWith(workflowId);
    });

    test('should handle non-existent workflow', async () => {
      const workflowId = 'non-existent';
      mockWorkflowOrchestrator.getWorkflowStatus.mockReturnValue(null);

      const response = await request(app)
        .get(`/api/workflows/${workflowId}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Workflow not found'
      });
    });
  });

  describe('POST /:id/execute', () => {
    test('should execute next phase of workflow', async () => {
      const workflowId = 'workflow_123';
      const mockResult = {
        status: 'phase_completed',
        phase: 'project_setup',
        nextPhase: { name: 'api_development' }
      };

      mockWorkflowOrchestrator.executeNextPhase.mockResolvedValue(mockResult);

      const response = await request(app)
        .post(`/api/workflows/${workflowId}/execute`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResult
      });

      expect(mockWorkflowOrchestrator.executeNextPhase).toHaveBeenCalledWith(workflowId);
    });

    test('should handle execution errors', async () => {
      const workflowId = 'workflow_123';
      mockWorkflowOrchestrator.executeNextPhase.mockRejectedValue(
        new Error('Execution failed')
      );

      const response = await request(app)
        .post(`/api/workflows/${workflowId}/execute`)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to execute workflow phase',
        details: 'Execution failed'
      });
    });
  });

  describe('GET /:id/phases', () => {
    test('should return workflow phase details', async () => {
      const workflowId = 'workflow_123';
      const mockWorkflow = {
        id: workflowId,
        currentPhase: 1,
        completedPhases: ['project_setup'],
        failedPhases: [],
        phases: [
          { name: 'project_setup', description: 'Setup project' },
          { name: 'api_development', description: 'Develop API' }
        ]
      };

      // Mock the activeWorkflows access
      mockWorkflowOrchestrator.activeWorkflows.set(workflowId, mockWorkflow);
      mockWorkflowOrchestrator.canExecutePhase.mockReturnValue(true);

      const response = await request(app)
        .get(`/api/workflows/${workflowId}/phases`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          phases: [
            { name: 'project_setup', description: 'Setup project', index: 0, status: 'completed', canExecute: true },
            { name: 'api_development', description: 'Develop API', index: 1, status: 'current', canExecute: true }
          ],
          currentPhase: 1,
          completedPhases: ['project_setup'],
          failedPhases: []
        }
      });
    });

    test('should handle non-existent workflow for phases', async () => {
      const workflowId = 'non-existent';

      const response = await request(app)
        .get(`/api/workflows/${workflowId}/phases`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Workflow not found'
      });
    });
  });

  describe('POST /:id/pause', () => {
    test('should pause workflow', async () => {
      const workflowId = 'workflow_123';
      const mockWorkflow = {
        id: workflowId,
        status: 'executing'
      };

      // Mock the activeWorkflows access
      mockWorkflowOrchestrator.activeWorkflows.set(workflowId, mockWorkflow);

      const response = await request(app)
        .post(`/api/workflows/${workflowId}/pause`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Workflow paused successfully',
        data: { status: 'paused' }
      });

      expect(mockWorkflow.status).toBe('paused');
    });

    test('should handle workflow that cannot be paused', async () => {
      const workflowId = 'workflow_123';
      const mockWorkflow = {
        id: workflowId,
        status: 'completed'
      };

      // Mock the activeWorkflows access
      mockWorkflowOrchestrator.activeWorkflows.set(workflowId, mockWorkflow);

      const response = await request(app)
        .post(`/api/workflows/${workflowId}/pause`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Workflow cannot be paused in current state',
        currentStatus: 'completed'
      });
    });
  });

  describe('POST /:id/resume', () => {
    test('should resume workflow', async () => {
      const workflowId = 'workflow_123';
      const mockWorkflow = {
        id: workflowId,
        status: 'paused'
      };

      // Mock the activeWorkflows access
      mockWorkflowOrchestrator.activeWorkflows.set(workflowId, mockWorkflow);

      const response = await request(app)
        .post(`/api/workflows/${workflowId}/resume`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Workflow resumed successfully',
        data: { status: 'ready' }
      });

      expect(mockWorkflow.status).toBe('ready');
    });

    test('should handle workflow that cannot be resumed', async () => {
      const workflowId = 'workflow_123';
      const mockWorkflow = {
        id: workflowId,
        status: 'running'
      };

      // Mock the activeWorkflows access
      mockWorkflowOrchestrator.activeWorkflows.set(workflowId, mockWorkflow);

      const response = await request(app)
        .post(`/api/workflows/${workflowId}/resume`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Workflow cannot be resumed in current state',
        currentStatus: 'running'
      });
    });
  });

  describe('DELETE /:id', () => {
    test('should delete workflow', async () => {
      const workflowId = 'workflow_123';
      const mockWorkflow = {
        id: workflowId,
        status: 'running',
        startTime: Date.now()
      };

      // Mock the activeWorkflows access
      mockWorkflowOrchestrator.activeWorkflows.set(workflowId, mockWorkflow);

      const response = await request(app)
        .delete(`/api/workflows/${workflowId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Workflow cancelled successfully',
        data: { status: 'cancelled' }
      });

      expect(mockWorkflow.status).toBe('cancelled');
    });

    test('should handle non-existent workflow for deletion', async () => {
      const workflowId = 'non-existent';

      const response = await request(app)
        .delete(`/api/workflows/${workflowId}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Workflow not found'
      });
    });
  });

  describe('POST /cleanup', () => {
    test('should cleanup completed workflows', async () => {
      // Add some mock workflows
      mockWorkflowOrchestrator.activeWorkflows.set('workflow_1', { status: 'completed' });
      mockWorkflowOrchestrator.activeWorkflows.set('workflow_2', { status: 'running' });

      const response = await request(app)
        .post('/api/workflows/cleanup')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Cleanup completed successfully',
        data: {
          workflowsBefore: 2,
          workflowsAfter: 2,
          cleanedCount: 0
        }
      });
    });
  });
});
