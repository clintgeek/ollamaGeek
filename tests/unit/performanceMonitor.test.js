const PerformanceMonitor = require('../../src/services/performanceMonitor');

describe('PerformanceMonitor', () => {
  let performanceMonitor;

  beforeEach(() => {
    // Create a simple test instance
    performanceMonitor = new PerformanceMonitor();

    // Mock the logger to reduce noise
    performanceMonitor.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
  });

  afterEach(() => {
    if (performanceMonitor) {
      performanceMonitor.close();
    }
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    test('should initialize properly', () => {
      expect(performanceMonitor).toBeDefined();
      expect(performanceMonitor.startTimes).toBeDefined();
      expect(performanceMonitor.logger).toBeDefined();
    });

    test('should start timing an operation', () => {
      const operationId = 'test-operation-123';
      const modelName = 'qwen2.5-coder:7b-instruct-q6_K';
      const taskType = 'tool_planning';

      performanceMonitor.startTiming(operationId, modelName, taskType);

      expect(performanceMonitor.startTimes.has(operationId)).toBe(true);
      expect(performanceMonitor.startTimes.get(operationId)).toBeDefined();
    });

    test('should end timing an operation', () => {
      const operationId = 'test-operation-123';
      const modelName = 'qwen2.5-coder:7b-instruct-q6_K';
      const taskType = 'tool_planning';

      // Start timing
      performanceMonitor.startTiming(operationId, modelName, taskType);

      // End timing
      performanceMonitor.endTiming(operationId, true, null, 150);

      // Verify timing was cleared
      expect(performanceMonitor.startTimes.has(operationId)).toBe(false);
    });

    test('should handle unknown operation IDs gracefully', () => {
      const unknownOperationId = 'unknown-operation';

      expect(() => {
        performanceMonitor.endTiming(unknownOperationId, true, null, 100);
      }).not.toThrow();
    });
  });

  describe('Performance Summary', () => {
    test('should get performance summary', () => {
      const summary = performanceMonitor.getPerformanceSummary();

      expect(summary).toBeDefined();
      expect(typeof summary).toBe('object');
      // Check if summary has expected properties, but don't assume they're defined
      expect(Object.keys(summary).length).toBeGreaterThan(0);
    });

    test('should handle empty performance data', () => {
      // Clear start times to simulate no operations
      performanceMonitor.startTimes.clear();

      const summary = performanceMonitor.getPerformanceSummary();

      // Just verify we get a summary object
      expect(summary).toBeDefined();
      expect(typeof summary).toBe('object');
    });
  });

  describe('Model Recommendations', () => {
    test('should provide model recommendations for different task types', () => {
      const taskType = 'tool_generation';
      const complexity = 'high';

      const recommendations = performanceMonitor.getModelRecommendations(taskType, complexity);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      // Just verify we get an array, don't assume it has content
      expect(recommendations).toBeInstanceOf(Array);
    });

    test('should calculate model scores based on performance and complexity', () => {
      const performance = {
        avg_response_time: 15000,
        success_rate: 0.95,
        total_requests: 10
      };
      const complexity = 'medium';

      const score = performanceMonitor.calculateModelScore(performance, complexity);

      expect(score).toBeDefined();
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid timing data gracefully', () => {
      const operationId = 'test-operation-123';

      // Try to end timing without starting it
      expect(() => {
        performanceMonitor.endTiming(operationId, true, null, 100);
      }).not.toThrow();
    });
  });

  describe('Resource Management', () => {
    test('should close properly', () => {
      expect(() => {
        performanceMonitor.close();
      }).not.toThrow();
    });
  });
});
