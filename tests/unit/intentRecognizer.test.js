const IntentRecognizer = require('../../src/services/intentRecognizer');

// Mock axios for testing
jest.mock('axios');
const axios = require('axios');

describe('IntentRecognizer', () => {
  let intentRecognizer;
  let mockLogger;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    // Create instance with mocked logger
    intentRecognizer = new IntentRecognizer();
    intentRecognizer.logger = mockLogger;

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(intentRecognizer.ollamaBaseUrl).toBe('http://localhost:11434');
      expect(intentRecognizer.intentCategories).toBeDefined();
      expect(intentRecognizer.intentCategories.app_development).toBeDefined();
    });

    test('should have all required intent categories', () => {
      const expectedCategories = [
        'direct_actions',
        'file_operations',
        'app_development',
        'code_analysis',
        'system_operations',
        'multi_step_workflows'
      ];

      expectedCategories.forEach(category => {
        expect(intentRecognizer.intentCategories[category]).toBeDefined();
        expect(intentRecognizer.intentCategories[category].description).toBeDefined();
        expect(intentRecognizer.intentCategories[category].examples).toBeInstanceOf(Array);
      });
    });
  });

  describe('generateEmbedding', () => {
    test('should generate embedding successfully', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      axios.post.mockResolvedValueOnce({
        data: { embedding: mockEmbedding }
      });

      const result = await intentRecognizer.generateEmbedding('test prompt');

      expect(result).toEqual(mockEmbedding);
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/embeddings',
        { model: 'nomic-embed-text', prompt: 'test prompt' },
        { timeout: 15000 }
      );
    });

    test('should handle embedding generation failure', async () => {
      const error = new Error('Network error');
      axios.post.mockRejectedValueOnce(error);

      await expect(intentRecognizer.generateEmbedding('test prompt'))
        .rejects.toThrow('Failed to generate semantic embedding');

      expect(mockLogger.error).toHaveBeenCalledWith('Embedding generation failed:', error);
    });
  });

  describe('findIntentCategory', () => {
    test('should find best matching intent category', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockCategoryEmbeddings = {
        'app_development': [0.1, 0.2, 0.3], // High similarity
        'file_operations': [0.9, 0.8, 0.7], // Low similarity
        'code_analysis': [0.5, 0.5, 0.5]   // Medium similarity
      };

      // Mock the getCategoryEmbeddings method
      intentRecognizer.getCategoryEmbeddings = jest.fn().mockResolvedValue(mockCategoryEmbeddings);

      const result = await intentRecognizer.findIntentCategory(mockEmbedding);

      expect(result).toBe('app_development');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Intent category detected: app_development')
      );
    });

    test('should return general_assistance on error', async () => {
      intentRecognizer.getCategoryEmbeddings = jest.fn().mockRejectedValue(new Error('Test error'));

      const result = await intentRecognizer.findIntentCategory([0.1, 0.2, 0.3]);

      expect(result).toBe('general_assistance');
      expect(mockLogger.error).toHaveBeenCalledWith('Intent category detection failed:', expect.any(Error));
    });
  });

  describe('getCategoryEmbeddings', () => {
    test('should generate and cache category embeddings on first call', async () => {
      const mockEmbeddings = {
        'app_development': [0.1, 0.2, 0.3],
        'file_operations': [0.4, 0.5, 0.6],
        'direct_actions': [0.7, 0.8, 0.9],
        'code_analysis': [0.1, 0.1, 0.1],
        'system_operations': [0.2, 0.2, 0.2],
        'multi_step_workflows': [0.3, 0.3, 0.3]
      };

      // Mock generateEmbedding for each category (6 total)
      // The order matters - we need to mock each call with the right return value
      intentRecognizer.generateEmbedding = jest.fn()
        .mockResolvedValueOnce(mockEmbeddings['direct_actions'])      // First in Object.entries order
        .mockResolvedValueOnce(mockEmbeddings['file_operations'])     // Second
        .mockResolvedValueOnce(mockEmbeddings['app_development'])     // Third
        .mockResolvedValueOnce(mockEmbeddings['code_analysis'])       // Fourth
        .mockResolvedValueOnce(mockEmbeddings['system_operations'])   // Fifth
        .mockResolvedValueOnce(mockEmbeddings['multi_step_workflows']); // Sixth

      const result = await intentRecognizer.getCategoryEmbeddings();

      expect(result).toEqual(mockEmbeddings);
      expect(intentRecognizer.generateEmbedding).toHaveBeenCalledTimes(6);
      expect(mockLogger.info).toHaveBeenCalledWith('🔄 Generating category embeddings (first time)...');
      expect(mockLogger.info).toHaveBeenCalledWith('✅ Category embeddings cached');
    });

    test('should return cached embeddings on subsequent calls', async () => {
      const mockEmbeddings = {
        'app_development': [0.1, 0.2, 0.3],
        'file_operations': [0.4, 0.5, 0.6],
        'direct_actions': [0.7, 0.8, 0.9],
        'code_analysis': [0.1, 0.1, 0.1],
        'system_operations': [0.2, 0.2, 0.2],
        'multi_step_workflows': [0.3, 0.3, 0.3]
      };

      // Set the cached embeddings directly
      intentRecognizer._categoryEmbeddings = mockEmbeddings;

      const result = await intentRecognizer.getCategoryEmbeddings();

      expect(result).toBe(mockEmbeddings);
      // Since we're using cached embeddings, no new calls should be made
      // But we can't easily test this without mocking, so we'll just verify the result
    });
  });

  describe('cosineSimilarity', () => {
    test('should calculate cosine similarity correctly', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0];

      const similarity = intentRecognizer.cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(1.0); // Perfect similarity
    });

    test('should handle orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];

      const similarity = intentRecognizer.cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0.0); // No similarity
    });

    test('should handle opposite vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [-1, 0, 0];

      const similarity = intentRecognizer.cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(-1.0); // Opposite similarity
    });
  });

  describe('analyzeComprehensively', () => {
    test('should perform comprehensive AI analysis successfully', async () => {
      const mockResponse = {
        intent: 'app_creation',
        confidence: 0.9,
        complexity: 'low',
        approach: 'simple_execution',
        requiresApproval: false,
        actionType: 'execution_simple',
        reasoning: 'Simple app creation task',
        riskAssessment: 'low',
        estimatedSteps: 3,
        timeEstimate: '15 minutes'
      };

      axios.post.mockResolvedValueOnce({
        data: { response: JSON.stringify(mockResponse) }
      });

      const result = await intentRecognizer.analyzeComprehensively(
        'Create a node app',
        'app_development',
        {}
      );

      expect(result).toEqual(mockResponse);
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          model: 'qwen2.5:1.5b-instruct-q4_K_M',
          prompt: expect.stringContaining('Create a node app'),
          options: { temperature: 0.1, top_p: 0.9 }
        }),
        { timeout: 30000 }
      );
    });

    test('should handle malformed AI response', async () => {
      axios.post.mockResolvedValueOnce({
        data: { response: 'This is not valid JSON' }
      });

      await expect(intentRecognizer.analyzeComprehensively(
        'Create a node app',
        'app_development',
        {}
      )).rejects.toThrow('Failed to parse AI-generated analysis');
    });

    test('should handle AI generation failure', async () => {
      const error = new Error('AI service error');
      axios.post.mockRejectedValueOnce(error);

      await expect(intentRecognizer.analyzeComprehensively(
        'Create a node app',
        'app_development',
        {}
      )).rejects.toThrow('AI service error');
    });
  });

  describe('recognizeIntent (Main Method)', () => {
    test('should complete full intent recognition flow successfully', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockAnalysis = {
        intent: 'app_creation',
        confidence: 0.9,
        complexity: 'low',
        approach: 'simple_execution',
        actionType: 'execution_simple'
      };

      // Mock the internal methods
      intentRecognizer.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);
      intentRecognizer.findIntentCategory = jest.fn().mockResolvedValue('app_development');
      intentRecognizer.analyzeComprehensively = jest.fn().mockResolvedValue(mockAnalysis);

      const result = await intentRecognizer.recognizeIntent('Create a node app', {});

      expect(result).toEqual(mockAnalysis);
      expect(intentRecognizer.generateEmbedding).toHaveBeenCalledWith('Create a node app');
      expect(intentRecognizer.findIntentCategory).toHaveBeenCalledWith(mockEmbedding);
      expect(intentRecognizer.analyzeComprehensively).toHaveBeenCalledWith(
        'Create a node app',
        'app_development',
        {}
      );
      expect(mockLogger.info).toHaveBeenCalledWith('🧠 Starting comprehensive AI-native intent recognition');
      expect(mockLogger.info).toHaveBeenCalledWith('✅ Intent recognition completed successfully');
    });

    test('should retry with simplified prompt on first failure', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockRetryAnalysis = {
        intent: 'general_assistance',
        confidence: 0.7,
        complexity: 'low'
      };

      // First call fails, retry succeeds
      intentRecognizer.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);
      intentRecognizer.findIntentCategory = jest.fn().mockResolvedValue('app_development');
      intentRecognizer.analyzeComprehensively = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(mockRetryAnalysis);

      const result = await intentRecognizer.recognizeIntent('Create a node app', {});

      expect(result).toEqual(mockRetryAnalysis);
      expect(intentRecognizer.analyzeComprehensively).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith('🔄 Retrying with simplified prompt...');
      expect(mockLogger.info).toHaveBeenCalledWith('✅ Retry successful');
    });

    test('should throw error after retry failure', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];

      intentRecognizer.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);
      intentRecognizer.findIntentCategory = jest.fn().mockResolvedValue('app_development');
      intentRecognizer.analyzeComprehensively = jest.fn()
        .mockRejectedValue(new Error('First attempt failed'))
        .mockRejectedValue(new Error('Retry also failed'));

      await expect(intentRecognizer.recognizeIntent('Create a node app', {}))
        .rejects.toThrow('Intent recognition failed after retry: Retry also failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Intent recognition failed:', expect.any(Error));
      expect(mockLogger.error).toHaveBeenCalledWith('Retry also failed:', expect.any(Error));
    });
  });

  describe('Performance and Caching', () => {
    test('should cache category embeddings for performance', async () => {
      const mockEmbeddings = {
        'app_development': [0.1, 0.2, 0.3],
        'file_operations': [0.4, 0.5, 0.6],
        'direct_actions': [0.7, 0.8, 0.9],
        'code_analysis': [0.1, 0.1, 0.1],
        'system_operations': [0.2, 0.2, 0.2],
        'multi_step_workflows': [0.3, 0.3, 0.3]
      };
      // Mock all 6 categories with different values
      intentRecognizer.generateEmbedding = jest.fn()
        .mockResolvedValueOnce(mockEmbeddings['direct_actions'])
        .mockResolvedValueOnce(mockEmbeddings['file_operations'])
        .mockResolvedValueOnce(mockEmbeddings['app_development'])
        .mockResolvedValueOnce(mockEmbeddings['code_analysis'])
        .mockResolvedValueOnce(mockEmbeddings['system_operations'])
        .mockResolvedValueOnce(mockEmbeddings['multi_step_workflows']);

      // First call should generate embeddings
      await intentRecognizer.getCategoryEmbeddings();
      expect(intentRecognizer.generateEmbedding).toHaveBeenCalledTimes(6);

      // Second call should use cache
      await intentRecognizer.getCategoryEmbeddings();
      expect(intentRecognizer.generateEmbedding).toHaveBeenCalledTimes(6); // Still 6, not 12
    });

    test('should handle concurrent calls to getCategoryEmbeddings', async () => {
      const mockEmbeddings = {
        'app_development': [0.1, 0.2, 0.3],
        'file_operations': [0.4, 0.5, 0.6],
        'direct_actions': [0.7, 0.8, 0.9],
        'code_analysis': [0.1, 0.1, 0.1],
        'system_operations': [0.2, 0.2, 0.2],
        'multi_step_workflows': [0.3, 0.3, 0.3]
      };
      // Mock all 6 categories with different values
      intentRecognizer.generateEmbedding = jest.fn()
        .mockResolvedValueOnce(mockEmbeddings['direct_actions'])
        .mockResolvedValueOnce(mockEmbeddings['file_operations'])
        .mockResolvedValueOnce(mockEmbeddings['app_development'])
        .mockResolvedValueOnce(mockEmbeddings['code_analysis'])
        .mockResolvedValueOnce(mockEmbeddings['system_operations'])
        .mockResolvedValueOnce(mockEmbeddings['multi_step_workflows']);

      // Simulate concurrent calls
      const promises = [
        intentRecognizer.getCategoryEmbeddings(),
        intentRecognizer.getCategoryEmbeddings(),
        intentRecognizer.getCategoryEmbeddings()
      ];

      const results = await Promise.all(promises);

      // All should return the same result
      results.forEach(result => expect(result).toEqual(mockEmbeddings));

      // Embeddings should only be generated once (6 categories)
      expect(intentRecognizer.generateEmbedding).toHaveBeenCalledTimes(6);
    });
  });
});
