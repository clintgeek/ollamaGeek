// Global test setup and configuration

// Increase timeout for all tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Mock logger for testing
  createMockLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }),

  // Create test context
  createTestContext: (workspacePath = '/test/workspace') => ({
    workspace: { path: workspacePath },
    files: [],
    directories: []
  }),

  // Wait for a specified time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Performance measurement utility
  measurePerformance: async (fn, description = 'Operation') => {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`⏱️ ${description}: ${duration.toFixed(0)}ms`);
    return { result, duration };
  },

  // Mock Ollama responses
  mockOllamaResponse: (response) => ({
    data: { response: typeof response === 'string' ? response : JSON.stringify(response) }
  }),

  // Mock embedding response
  mockEmbeddingResponse: (embedding) => ({
    data: { embedding: embedding || [0.1, 0.2, 0.3, 0.4, 0.5] }
  })
};

// Console output during tests
beforeEach(() => {
  console.log('\n🧪 Starting test...');
});

afterEach(() => {
  console.log('✅ Test completed\n');
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global timeout for all tests
afterAll(async () => {
  // Clean up any remaining resources
  await new Promise(resolve => setTimeout(resolve, 1000));
});
