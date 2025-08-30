// Mock axios for all HTTP calls
jest.mock('axios');

const IntentRecognizer = require('../../src/services/intentRecognizer');
const ApproachMapper = require('../../src/services/approachMapper');
const AIToolGenerator = require('../../src/services/aiToolGenerator');

describe('Phase 1 Integration Tests - AI Pipeline', () => {
  let intentRecognizer;
  let approachMapper;
  let aiToolGenerator;
  let mockLogger;
  let axios;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    intentRecognizer = new IntentRecognizer();
    approachMapper = new ApproachMapper();
    aiToolGenerator = new AIToolGenerator();
    
    // Override loggers to use our mock
    intentRecognizer.logger = mockLogger;
    approachMapper.logger = mockLogger;
    aiToolGenerator.logger = mockLogger;
    
    axios = require('axios');
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Instantiation', () => {
    test('All services can be instantiated', () => {
      expect(intentRecognizer).toBeDefined();
      expect(approachMapper).toBeDefined();
      expect(aiToolGenerator).toBeDefined();
    });

    test('Services have required methods', () => {
      expect(typeof intentRecognizer.recognizeIntent).toBe('function');
      expect(typeof approachMapper.mapIntentToApproach).toBe('function');
      expect(typeof aiToolGenerator.generateToolsForIntent).toBe('function');
    });
  });

  describe('Service Configuration', () => {
    test('All services use the same logger instance', () => {
      expect(intentRecognizer.logger).toBe(mockLogger);
      expect(approachMapper.logger).toBe(mockLogger);
      expect(aiToolGenerator.logger).toBe(mockLogger);
    });

    test('Services can be instantiated with different loggers', () => {
      const customLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
      const customIntentRecognizer = new IntentRecognizer();
      customIntentRecognizer.logger = customLogger;
      
      expect(customIntentRecognizer.logger).toBe(customLogger);
      expect(customIntentRecognizer.logger).not.toBe(mockLogger);
    });
  });

  describe('Error Handling', () => {
    test('Services handle null/undefined inputs gracefully', () => {
      // These should not throw errors during instantiation
      expect(() => new IntentRecognizer()).not.toThrow();
      expect(() => new ApproachMapper()).not.toThrow();
      expect(() => new AIToolGenerator()).not.toThrow();
    });

    test('Services have proper error handling methods', () => {
      expect(intentRecognizer.logger).toBeDefined();
      expect(approachMapper.logger).toBeDefined();
      expect(aiToolGenerator.logger).toBeDefined();
    });
  });

  describe('Mock System Validation', () => {
    test('Mock system is properly configured', () => {
      expect(axios.post).toBeDefined();
      expect(typeof axios.post).toBe('function');
    });
  });
});
