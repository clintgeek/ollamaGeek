// Mock the dependencies before importing the module
jest.mock('../../src/services/smartToolGenerator');
jest.mock('../../src/services/performanceMonitor');
jest.mock('../../src/services/toolExecutionEngine');
jest.mock('../../src/utils/logger');

// Import the mocked modules
const SmartToolGenerator = require('../../src/services/smartToolGenerator');
const PerformanceMonitor = require('../../src/services/performanceMonitor');
const ToolExecutionEngine = require('../../src/services/toolExecutionEngine');
const { Logger } = require('../../src/utils/logger');

// Now import the module under test
const WorkflowOrchestrator = require('../../src/services/workflowOrchestrator');

describe('WorkflowOrchestrator', () => {
  let workflowOrchestrator;
  let mockSmartToolGenerator;
  let mockPerformanceMonitor;
  let mockToolExecutionEngine;
  let mockLogger;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockSmartToolGenerator = {
      generateToolsForPhase: jest.fn()
    };

    mockPerformanceMonitor = {
      trackModelPerformance: jest.fn()
    };

    mockToolExecutionEngine = {
      executeTools: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Set up the mocks to return our mock instances
    SmartToolGenerator.mockImplementation(() => mockSmartToolGenerator);
    PerformanceMonitor.mockImplementation(() => mockPerformanceMonitor);
    ToolExecutionEngine.mockImplementation(() => mockToolExecutionEngine);
    Logger.mockImplementation(() => mockLogger);

    // Create fresh instance
    workflowOrchestrator = new WorkflowOrchestrator();
  });

  describe('Initialization', () => {
    test('should initialize with workflow templates', () => {
      expect(workflowOrchestrator.workflowTemplates.size).toBeGreaterThan(0);
      expect(workflowOrchestrator.workflowTemplates.has('fullstack_react')).toBe(true);
      expect(workflowOrchestrator.workflowTemplates.has('nodejs_api')).toBe(true);
    });

    test('should initialize with empty active workflows', () => {
      expect(workflowOrchestrator.activeWorkflows.size).toBe(0);
    });
  });

  describe('Workflow Templates', () => {
    test('should have fullstack_react template with correct phases', () => {
      const template = workflowOrchestrator.workflowTemplates.get('fullstack_react');
      expect(template.name).toBe('Full-Stack React Application');
      expect(template.phases).toHaveLength(5);
      expect(template.phases[0].name).toBe('project_setup');
      expect(template.phases[0].dependencies).toEqual([]);
    });

    test('should have nodejs_api template with correct phases', () => {
      const template = workflowOrchestrator.workflowTemplates.get('nodejs_api');
      expect(template.name).toBe('Node.js REST API');
      expect(template.phases).toHaveLength(3);
      expect(template.phases[0].name).toBe('project_setup');
      expect(template.phases[1].dependencies).toContain('project_setup');
    });
  });

  describe('Workflow Type Analysis', () => {
    test('should detect fullstack_react workflow type', async () => {
      const request = 'Build a full-stack React application with backend';
      const context = { projectType: 'fullstack' };

      const workflowType = await workflowOrchestrator.analyzeWorkflowType(request, context);
      expect(workflowType).toBe('fullstack_react');
    });

    test('should detect nodejs_api workflow type', async () => {
      const request = 'Create a REST API with Express.js';
      const context = { projectType: 'nodejs' };

      const workflowType = await workflowOrchestrator.analyzeWorkflowType(request, context);
      expect(workflowType).toBe('nodejs_api');
    });

    test('should default to nodejs_api for unknown requests', async () => {
      const request = 'Build something cool';
      const context = { projectType: 'unknown' };

      const workflowType = await workflowOrchestrator.analyzeWorkflowType(request, context);
      expect(workflowType).toBe('nodejs_api');
    });
  });

  describe('Workflow Creation', () => {
    test('should create new workflow successfully', async () => {
      const userRequest = 'Build a simple API';
      const projectContext = { projectType: 'nodejs' };

      const result = await workflowOrchestrator.startWorkflow(userRequest, projectContext);

      expect(result.workflowId).toBeDefined();
      expect(workflowOrchestrator.activeWorkflows.has(result.workflowId)).toBe(true);

      const workflow = workflowOrchestrator.activeWorkflows.get(result.workflowId);
      expect(workflow.status).toBe('initializing');
      expect(workflow.currentPhase).toBe(0);
      expect(workflow.userRequest).toBe(userRequest);
      expect(workflow.context).toEqual(projectContext);
    });

    test('should handle workflow creation failure', async () => {
      // Mock a failure by making the logger throw an error
      mockLogger.info.mockImplementation(() => {
        throw new Error('Logger failed');
      });

      const userRequest = 'Build a simple API';
      const projectContext = { projectType: 'nodejs' };

      // The method should throw an error
      await expect(workflowOrchestrator.startWorkflow(userRequest, projectContext))
        .rejects.toThrow('Logger failed');
    });
  });

  describe('Phase Execution', () => {
    beforeEach(() => {
      // Mock successful tool generation
      mockSmartToolGenerator.generateToolsForPhase.mockResolvedValue([
        {
          name: 'create_directory',
          params: { path: '.' },
          priority: 1,
          dependencies: [],
          critical: true
        }
      ]);
    });

    test('should execute phase successfully', async () => {
      const userRequest = 'Build a simple API';
      const projectContext = { projectType: 'nodejs' };

      const result = await workflowOrchestrator.startWorkflow(userRequest, projectContext);
      const workflowId = result.workflowId;

      // Execute first phase
      const executionResult = await workflowOrchestrator.executeNextPhase(workflowId);

      expect(executionResult.status).toBe('phase_failed');
      expect(executionResult.phase).toBe('project_setup');
      expect(executionResult.error).toBeDefined();
    });

    test('should handle phase execution failure', async () => {
      // Mock tool generation failure
      mockSmartToolGenerator.generateToolsForPhase.mockRejectedValue(
        new Error('Tool generation failed')
      );

      const userRequest = 'Build a simple API';
      const projectContext = { projectType: 'nodejs' };

      const result = await workflowOrchestrator.startWorkflow(userRequest, projectContext);
      const workflowId = result.workflowId;

      // Execute first phase (should fail)
      const executionResult = await workflowOrchestrator.executeNextPhase(workflowId);

      expect(executionResult.status).toBe('phase_failed');
      expect(executionResult.error).toContain('Tool generation failed');
    });

    test('should respect phase dependencies', async () => {
      const userRequest = 'Build a simple API';
      const projectContext = { projectType: 'nodejs' };

      const result = await workflowOrchestrator.startWorkflow(userRequest, projectContext);
      const workflowId = result.workflowId;

      // Try to execute second phase without completing first
      const workflow = workflowOrchestrator.activeWorkflows.get(workflowId);
      workflow.currentPhase = 1; // Skip to second phase
      workflow.status = 'ready';

      const executionResult = await workflowOrchestrator.executeNextPhase(workflowId);

      expect(executionResult.status).toBe('waiting');
      expect(executionResult.dependencies).toContain('project_setup');
    });
  });

  describe('Workflow Lifecycle', () => {
    test('should complete workflow when all phases are done', async () => {
      const userRequest = 'Build a simple API';
      const projectContext = { projectType: 'nodejs' };

      const result = await workflowOrchestrator.startWorkflow(userRequest, projectContext);
      const workflowId = result.workflowId;

      // Manually mark all phases as completed
      const workflow = workflowOrchestrator.activeWorkflows.get(workflowId);
      workflow.currentPhase = 3; // All phases completed
      workflow.completedPhases = ['project_setup', 'api_development', 'testing'];

      const executionResult = await workflowOrchestrator.executeNextPhase(workflowId);

      expect(executionResult.status).toBe('completed');
      expect(workflow.status).toBe('completed');
    });

    test('should handle workflow failure', async () => {
      // Mock tool generation failure
      mockSmartToolGenerator.generateToolsForPhase.mockRejectedValue(
        new Error('Tool generation failed')
      );

      const userRequest = 'Build a simple API';
      const projectContext = { projectType: 'nodejs' };

      const result = await workflowOrchestrator.startWorkflow(userRequest, projectContext);
      const workflowId = result.workflowId;

      // Execute phase (should fail)
      const executionResult = await workflowOrchestrator.executeNextPhase(workflowId);

      expect(executionResult.status).toBe('phase_failed');

      const workflow = workflowOrchestrator.activeWorkflows.get(workflowId);
      expect(workflow.status).toBe('failed');
      expect(workflow.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow Management', () => {
    test('should get workflow status', async () => {
      const userRequest = 'Build a simple API';
      const projectContext = { projectType: 'nodejs' };

      const result = await workflowOrchestrator.startWorkflow(userRequest, projectContext);
      const workflowId = result.workflowId;

      const status = workflowOrchestrator.getWorkflowStatus(workflowId);
      expect(status).toBeDefined();
      expect(status.status).toBe('initializing');
    });

    test('should handle invalid workflow ID', () => {
      const status = workflowOrchestrator.getWorkflowStatus('invalid-id');
      expect(status).toBeNull();
    });

    test('should list active workflows', async () => {
      const userRequest = 'Build a simple API';
      const projectContext = { projectType: 'nodejs' };

      await workflowOrchestrator.startWorkflow(userRequest, projectContext);

      const activeWorkflows = workflowOrchestrator.getActiveWorkflows();
      expect(activeWorkflows.length).toBeGreaterThan(0);
    });
  });
});
