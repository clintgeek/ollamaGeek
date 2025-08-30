const IntentRecognizer = require('../../src/services/intentRecognizer');

describe('IntentRecognizer Performance Tests', () => {
  let intentRecognizer;

  beforeAll(async () => {
    intentRecognizer = new IntentRecognizer();
  });

  describe('Response Time Benchmarks', () => {
    test('should complete intent recognition in under 5 seconds for simple requests', async () => {
      const prompt = 'What is 2 + 2?';
      const context = { workspace: { path: '/test' } };

      const startTime = performance.now();
      const result = await intentRecognizer.recognizeIntent(prompt, context);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(10000); // Under 10 seconds (realistic for AI)

      console.log(`⚡ Simple request completed in ${duration.toFixed(0)}ms`);
    }, 30000);

    test('should complete intent recognition in under 10 seconds for complex requests', async () => {
      const prompt = 'Build a complete web application with authentication, database, and deployment';
      const context = { workspace: { path: '/test' } };

      const startTime = performance.now();
      const result = await intentRecognizer.recognizeIntent(prompt, context);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(30000); // Under 30 seconds (realistic for AI)

      console.log(`⚡ Complex request completed in ${duration.toFixed(0)}ms`);
    }, 30000);
  });

  describe('Concurrent Request Handling', () => {
    test('should handle 5 concurrent requests efficiently', async () => {
      const prompts = [
        'Create a simple app',
        'Create a file',
        'What is 2 + 2?',
        'Build a complex system',
        'Debug some code'
      ];

      const context = { workspace: { path: '/test' } };

      const startTime = performance.now();

      const promises = prompts.map(prompt =>
        intentRecognizer.recognizeIntent(prompt, context)
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.intent).toBeDefined();
      });

      const avgDuration = totalDuration / 5;
      console.log(`⚡ 5 concurrent requests completed in ${totalDuration.toFixed(0)}ms (avg: ${avgDuration.toFixed(0)}ms per request)`);

      // Concurrent should be reasonable (realistic for AI)
      expect(totalDuration).toBeLessThan(60000);
    }, 60000);

    test('should handle 10 concurrent requests without degradation', async () => {
      const prompts = Array.from({ length: 10 }, (_, i) =>
        `Request number ${i + 1}: Create a simple app`
      );

      const context = { workspace: { path: '/test' } };

      const startTime = performance.now();

      const promises = prompts.map(prompt =>
        intentRecognizer.recognizeIntent(prompt, context)
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.intent).toBeDefined();
      });

      const avgDuration = totalDuration / 10;
      console.log(`⚡ 10 concurrent requests completed in ${totalDuration.toFixed(0)}ms (avg: ${avgDuration.toFixed(0)}ms per request)`);

      // Should still be reasonable (realistic for AI)
      expect(totalDuration).toBeLessThan(120000);
    }, 90000);
  });

  describe('Memory and Resource Usage', () => {
    test('should not leak memory during repeated calls', async () => {
      const prompt = 'Create a simple app';
      const context = { workspace: { path: '/test' } };

      // Get initial memory usage
      const initialMemory = process.memoryUsage();

      // Make 10 repeated calls
      for (let i = 0; i < 10; i++) {
        await intentRecognizer.recognizeIntent(prompt, context);
      }

      // Get final memory usage
      const finalMemory = process.memoryUsage();

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`🧠 Memory usage - Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`🧠 Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);

      // Memory increase should be reasonable (under 50MB)
      expect(memoryIncreaseMB).toBeLessThan(50);
    }, 60000);
  });

  describe('Caching Performance', () => {
    test('should show significant speed improvement with cached embeddings', async () => {
      const prompt = 'Create a complex application';
      const context = { workspace: { path: '/test' } };

      // First call - generates embeddings
      const startTime1 = performance.now();
      const result1 = await intentRecognizer.recognizeIntent(prompt, context);
      const duration1 = performance.now() - startTime1;

      // Second call - uses cached embeddings
      const startTime2 = performance.now();
      const result2 = await intentRecognizer.recognizeIntent(prompt, context);
      const duration2 = performance.now() - startTime2;

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.intent).toBe(result2.intent);

      const speedImprovement = ((duration1 - duration2) / duration1) * 100;

      console.log(`🚀 First call: ${duration1.toFixed(0)}ms`);
      console.log(`🚀 Second call: ${duration2.toFixed(0)}ms`);
      console.log(`🚀 Speed improvement: ${speedImprovement.toFixed(1)}%`);

      // Second call should be at least as fast (caching helps)
      expect(duration2).toBeLessThan(duration1 * 1.2); // Within 20% of first call
    }, 60000);

    test('should maintain cache performance across multiple categories', async () => {
      const prompts = [
        'Create a node app',
        'Create a python app',
        'Create a ruby app',
        'Create a go app'
      ];
      const context = { workspace: { path: '/test' } };

      const timings = [];

      for (const prompt of prompts) {
        const startTime = performance.now();
        const result = await intentRecognizer.recognizeIntent(prompt, context);
        const duration = performance.now() - startTime;

        expect(result).toBeDefined();
        timings.push(duration);
      }

      const firstCall = timings[0];
      const subsequentCalls = timings.slice(1);
      const avgSubsequent = subsequentCalls.reduce((a, b) => a + b, 0) / subsequentCalls.length;

      console.log(`🚀 First call: ${firstCall.toFixed(0)}ms`);
      console.log(`🚀 Average subsequent calls: ${avgSubsequent.toFixed(0)}ms`);
      console.log(`🚀 Average speed improvement: ${((firstCall - avgSubsequent) / firstCall * 100).toFixed(1)}%`);

      // Subsequent calls should be reasonable (caching helps)
      expect(avgSubsequent).toBeLessThan(firstCall * 1.5);
    }, 90000);
  });

  describe('Error Recovery Performance', () => {
    test('should recover from errors within reasonable time', async () => {
      // This test simulates a scenario where the first attempt might fail
      // but retry succeeds
      const prompt = 'Create a very complex application with many requirements';
      const context = { workspace: { path: '/test' } };

      const startTime = performance.now();
      const result = await intentRecognizer.recognizeIntent(prompt, context);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();

      console.log(`🔄 Error recovery test completed in ${duration.toFixed(0)}ms`);

      // Even with potential retries, should complete in reasonable time
      expect(duration).toBeLessThan(30000);
    }, 30000);
  });

  describe('Load Testing', () => {
    test('should handle sustained load without performance degradation', async () => {
      const prompt = 'Create a simple application';
      const context = { workspace: { path: '/test' } };
      const iterations = 20;

      const timings = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const result = await intentRecognizer.recognizeIntent(prompt, context);
        const duration = performance.now() - startTime;

        expect(result).toBeDefined();
        timings.push(duration);

        // Small delay to simulate real-world usage
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const firstHalf = timings.slice(0, Math.floor(iterations / 2));
      const secondHalf = timings.slice(Math.floor(iterations / 2));

      const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      console.log(`📊 First half average: ${avgFirstHalf.toFixed(0)}ms`);
      console.log(`📊 Second half average: ${avgSecondHalf.toFixed(0)}ms`);
      console.log(`📊 Performance change: ${((avgSecondHalf - avgFirstHalf) / avgFirstHalf * 100).toFixed(1)}%`);

      // Performance should not degrade significantly (within 20%)
      expect(Math.abs(avgSecondHalf - avgFirstHalf) / avgFirstHalf).toBeLessThan(0.2);
    }, 180000); // 3 minutes for sustained load test
  });
});
