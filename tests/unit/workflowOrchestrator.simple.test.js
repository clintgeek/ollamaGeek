const WorkflowOrchestrator = require('../../src/services/workflowOrchestrator');

// Mock the dependencies
jest.mock('../../src/services/smartToolGenerator');
jest.mock('../../src/services/performanceMonitor');
jest.mock('../../src/utils/logger');
jest.mock('../../src/services/memoryManager');
jest.mock('../../src/services/toolExecutionEngine');

// Mock better-sqlite3 at the module level
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn(() => ({
      run: jest.fn(() => ({ lastInsertRowid: 1, changes: 1 })),
      get: jest.fn(() => null),
      all: jest.fn(() => [])
    })),
    exec: jest.fn(),
    close: jest.fn()
  }));
});

describe('WorkflowOrchestrator - Simple', () => {
  let workflowOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    workflowOrchestrator = new WorkflowOrchestrator();
  });

  test('should initialize with workflow templates', () => {
    expect(workflowOrchestrator.workflowTemplates.size).toBeGreaterThan(0);
    expect(workflowOrchestrator.workflowTemplates.has('fullstack_react')).toBe(true);
    expect(workflowOrchestrator.workflowTemplates.has('nodejs_api')).toBe(true);
  });

  test('should initialize with empty active workflows', () => {
    expect(workflowOrchestrator.activeWorkflows.size).toBe(0);
  });
});
