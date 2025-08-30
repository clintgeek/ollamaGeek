const PerformanceDashboard = require('../../src/services/performanceDashboard');

describe('PerformanceDashboard', () => {
  let performanceDashboard;

  beforeEach(() => {
    // Create a simple test instance
    performanceDashboard = new PerformanceDashboard();

    // Mock the logger to reduce noise
    performanceDashboard.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
  });

  afterEach(() => {
    if (performanceDashboard) {
      performanceDashboard.close();
    }
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    test('should initialize properly', () => {
      expect(performanceDashboard).toBeDefined();
      expect(performanceDashboard.performanceMonitor).toBeDefined();
      expect(performanceDashboard.logger).toBeDefined();
    });

    test('should get performance overview', async () => {
      const overview = await performanceDashboard.getPerformanceOverview();

      expect(overview).toBeDefined();
      expect(typeof overview).toBe('object');
      // Check if overview has expected properties, but don't assume they're defined
      expect(Object.keys(overview).length).toBeGreaterThan(0);
    });
  });

  describe('Model Recommendations', () => {
    test('should get model recommendations', async () => {
      const recommendations = await performanceDashboard.getModelRecommendations();

      expect(recommendations).toBeDefined();
      expect(typeof recommendations).toBe('object');
    });
  });

  describe('Optimization Opportunities', () => {
    test('should identify optimization opportunities', async () => {
      const opportunities = await performanceDashboard.identifyOptimizationOpportunities();

      expect(opportunities).toBeDefined();
      expect(Array.isArray(opportunities)).toBe(true);
    });
  });

  describe('Slow Models Detection', () => {
    test('should find slow models', async () => {
      const slowModels = await performanceDashboard.findSlowModels();

      expect(slowModels).toBeDefined();
      expect(Array.isArray(slowModels)).toBe(true);
    });
  });

  describe('Low Success Models Detection', () => {
    test('should find low success rate models', async () => {
      const lowSuccessModels = await performanceDashboard.findLowSuccessModels();

      expect(lowSuccessModels).toBeDefined();
      expect(Array.isArray(lowSuccessModels)).toBe(true);
    });
  });

  describe('Resource Management', () => {
    test('should close properly', () => {
      expect(() => {
        performanceDashboard.close();
      }).not.toThrow();
    });
  });
});
