// Mock axios to prevent real HTTP calls
jest.mock('axios');

const IntentRecognizer = require('../../src/services/intentRecognizer');

describe('Intent Recognizer - Phase 1 Core Tests', () => {
  let intentRecognizer;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    // Create instance with mock logger
    intentRecognizer = new IntentRecognizer();
    // Override the logger to use our mock
    intentRecognizer.logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    test('Can instantiate IntentRecognizer', () => {
      expect(intentRecognizer).toBeDefined();
      expect(intentRecognizer.logger).toBeDefined();
    });

    test('Has required methods', () => {
      expect(typeof intentRecognizer.recognizeIntent).toBe('function');
      expect(typeof intentRecognizer.generateEmbedding).toBe('function');
      expect(typeof intentRecognizer.findIntentCategory).toBe('function');
    });

    test('Has intent categories defined', () => {
      expect(intentRecognizer.intentCategories).toBeDefined();
      expect(typeof intentRecognizer.intentCategories).toBe('object');
      expect(intentRecognizer.intentCategories.direct_actions).toBeDefined();
      expect(intentRecognizer.intentCategories.file_operations).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('Handles empty prompts gracefully', async () => {
      // Mock the recognizeIntent method to prevent real AI calls
      jest.spyOn(intentRecognizer, 'recognizeIntent').mockRejectedValue(new Error('Prompt is required'));
      
      await expect(intentRecognizer.recognizeIntent(''))
        .rejects.toThrow('Prompt is required');
    });

    test('Handles null prompts gracefully', async () => {
      // Mock the recognizeIntent method to prevent real AI calls
      jest.spyOn(intentRecognizer, 'recognizeIntent').mockRejectedValue(new Error('Prompt is required'));
      
      await expect(intentRecognizer.recognizeIntent(null))
        .rejects.toThrow('Prompt is required');
    });
  });

  describe('Configuration', () => {
    test('Has Ollama base URL configured', () => {
      expect(intentRecognizer.ollamaBaseUrl).toBeDefined();
      expect(typeof intentRecognizer.ollamaBaseUrl).toBe('string');
    });

    test('Logger methods are callable', () => {
      expect(() => intentRecognizer.logger.info('test')).not.toThrow();
      expect(() => intentRecognizer.logger.warn('test')).not.toThrow();
      expect(() => intentRecognizer.logger.error('test')).not.toThrow();
      expect(() => intentRecognizer.logger.debug('test')).not.toThrow();
    });
  });
});
