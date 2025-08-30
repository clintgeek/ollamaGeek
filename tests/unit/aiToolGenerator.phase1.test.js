const AIToolGenerator = require('../../src/services/aiToolGenerator');

describe('AI Tool Generator - Phase 1 Core Tests', () => {
  let aiToolGenerator;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    aiToolGenerator = new AIToolGenerator(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Validation', () => {
    test('Validates tools with missing context', () => {
      const invalidTool = {
        name: 'create_file',
        description: 'Creates a test file',
        parameters: { filename: 'test.txt' }
        // Missing context
      };

      const result = aiToolGenerator.validateTool(invalidTool);
      expect(result).toBeFalsy();
    });

    test('Validates tools with filename parameter', () => {
      const validTool = {
        name: 'create_file',
        description: 'Creates a test file',
        parameters: { 
          filename: 'test.txt',
          content: 'test content',
          targetDirectory: '/test'
        },
        context: 'file_ops'
      };

      const result = aiToolGenerator.validateTool(validTool);
      expect(result).toBeTruthy();
    });

    test('Validates create_directory tool correctly', () => {
      const validTool = {
        name: 'create_directory',
        description: 'Creates a test directory',
        parameters: { path: '/test' },
        context: 'file_ops'
      };

      const result = aiToolGenerator.validateTool(validTool);
      expect(result).toBeTruthy();
    });
  });

  describe('Basic Functionality', () => {
    test('Can instantiate AIToolGenerator', () => {
      expect(aiToolGenerator).toBeDefined();
      expect(aiToolGenerator.logger).toBeDefined();
    });

    test('Has required methods', () => {
      expect(typeof aiToolGenerator.validateTool).toBe('function');
      expect(typeof aiToolGenerator.validateToolsBeforeExecution).toBe('function');
    });
  });
});
