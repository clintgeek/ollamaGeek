const IntentRecognizer = require('../../src/services/intentRecognizer');

// Integration tests - these require Ollama to be running
describe('IntentRecognizer Integration Tests', () => {
  let intentRecognizer;

  beforeAll(async () => {
    // Check if Ollama is available
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        throw new Error('Ollama not available');
      }
      console.log('✅ Ollama is running, proceeding with integration tests');
    } catch (error) {
      console.log('⚠️ Ollama not available, skipping integration tests');
      return;
    }

    intentRecognizer = new IntentRecognizer();
  });

  describe('Real AI Intent Recognition', () => {
    test('should recognize app creation intent', async () => {
      const prompt = 'Create a small node and express app in a mathGeek folder';
      const context = { workspace: { path: '/test' } };

      const result = await intentRecognizer.recognizeIntent(prompt, context);

      expect(result).toBeDefined();
      expect(result.intent).toBe('app_creation');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.complexity).toBeDefined();
      expect(result.approach).toBeDefined();
      expect(result.actionType).toBeDefined();
    }, 30000); // 30 second timeout for AI calls

    test('should recognize file operations intent', async () => {
      const prompt = 'Create a file called test.txt with some content';
      const context = { workspace: { path: '/test' } };

      const result = await intentRecognizer.recognizeIntent(prompt, context);

      expect(result).toBeDefined();
      expect(result.intent).toBe('file_ops');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.complexity).toBeDefined();
    }, 30000);

    test('should recognize code analysis intent', async () => {
      const prompt = 'Review this code and suggest improvements';
      const context = { workspace: { path: '/test' } };

      const result = await intentRecognizer.recognizeIntent(prompt, context);

      expect(result).toBeDefined();
      expect(result.intent).toBe('code_analysis');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.complexity).toBeDefined();
    }, 30000);

    test('should recognize complex multi-step intent', async () => {
      const prompt = 'Build a complete web application with database, authentication, and deployment pipeline';
      const context = { workspace: { path: '/test' } };

      const result = await intentRecognizer.recognizeIntent(prompt, context);

      expect(result).toBeDefined();
      expect(result.intent).toBe('complex_multi_step');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.complexity).toBe('high' || 'very_high');
      expect(result.requiresApproval).toBe(true);
    }, 30000);
  });

  describe('Performance Benchmarks', () => {
    test('should complete intent recognition within reasonable time', async () => {
      const prompt = 'Create a simple hello world app';
      const context = { workspace: { path: '/test' } };

      const startTime = Date.now();
      const result = await intentRecognizer.recognizeIntent(prompt, context);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds

      console.log(`⏱️ Intent recognition completed in ${duration}ms`);
    }, 30000);

    test('should cache category embeddings for subsequent calls', async () => {
      const prompt1 = 'Create a node app';
      const prompt2 = 'Create a python app';
      const context = { workspace: { path: '/test' } };

      // First call - should generate embeddings
      const startTime1 = Date.now();
      const result1 = await intentRecognizer.recognizeIntent(prompt1, context);
      const duration1 = Date.now() - startTime1;

      // Second call - should use cached embeddings
      const startTime2 = Date.now();
      const result2 = await intentRecognizer.recognizeIntent(prompt2, context);
      const duration2 = Date.now() - startTime2;

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(duration2).toBeLessThan(duration1); // Second call should be faster

      console.log(`⏱️ First call: ${duration1}ms, Second call: ${duration2}ms`);
      console.log(`🚀 Speed improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(1)}%`);
    }, 60000);
  });

  describe('Error Handling and Resilience', () => {
    test('should handle malformed prompts gracefully', async () => {
      const prompt = ''; // Empty prompt
      const context = { workspace: { path: '/test' } };

      const result = await intentRecognizer.recognizeIntent(prompt, context);

      expect(result).toBeDefined();
      expect(result.intent).toBe('general_assistance');
    }, 30000);

    test('should handle very long prompts', async () => {
      const prompt = 'Create a very complex application with many features including ' +
                    'user authentication, database management, API endpoints, frontend components, ' +
                    'state management, error handling, logging, monitoring, testing, deployment, ' +
                    'and documentation. The app should be production-ready and scalable.';
      const context = { workspace: { path: '/test' } };

      const result = await intentRecognizer.recognizeIntent(prompt, context);

      expect(result).toBeDefined();
      expect(result.intent).toBe('complex_multi_step');
      expect(result.complexity).toBe('high' || 'very_high');
    }, 30000);
  });

  describe('Intent Category Accuracy', () => {
    const testCases = [
      {
        prompt: 'What is 2 + 2?',
        expectedIntent: 'direct_response',
        description: 'Simple math question'
      },
      {
        prompt: 'Create a directory called projects',
        expectedIntent: 'file_ops',
        description: 'Directory creation'
      },
      {
        prompt: 'Build a REST API with Express',
        expectedIntent: 'app_creation',
        description: 'API development'
      },
      {
        prompt: 'Debug this JavaScript code',
        expectedIntent: 'code_analysis',
        description: 'Code debugging'
      },
      {
        prompt: 'Install Docker and set up containers',
        expectedIntent: 'system_ops',
        description: 'System operations'
      }
    ];

    testCases.forEach(({ prompt, expectedIntent, description }) => {
      test(`should correctly identify "${description}" as ${expectedIntent}`, async () => {
        const context = { workspace: { path: '/test' } };

        const result = await intentRecognizer.recognizeIntent(prompt, context);

        expect(result).toBeDefined();
        expect(result.intent).toBe(expectedIntent);
        expect(result.confidence).toBeGreaterThan(0.6);

        console.log(`✅ "${description}" correctly identified as ${expectedIntent} (confidence: ${result.confidence})`);
      }, 30000);
    });
  });
});
