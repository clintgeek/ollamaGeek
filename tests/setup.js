// Test setup for Sage Intelligence System

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Uncomment to see all console output during tests
  // log: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.REQUEST_TIMEOUT = '5000'; // Faster timeouts for tests

// Mock database dependencies (if needed in the future)
// jest.mock('better-sqlite3', () => {
//   const mockDb = {
//     prepare: jest.fn(() => ({
//       run: jest.fn(() => ({ lastInsertRowid: 1, changes: 1 })),
//       get: jest.fn(() => null),
//       all: jest.fn(() => [])
//     })),
//     exec: jest.fn(),
//     close: jest.fn(),
//     pragma: jest.fn()
//   };
//   return jest.fn(() => mockDb);
// });

// Global test utilities
global.testUtils = {
  // Create a mock logger for testing
  createMockLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }),

  // Create test database path
  getTestDbPath: (testName) => {
    const path = require('path');
    return path.join(__dirname, '../data', `test_${testName}_${Date.now()}.db`);
  },

  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock performance timing
  mockPerformanceTiming: () => {
    const startTime = Date.now();
    return {
      start: startTime,
      end: () => Date.now() - startTime
    };
  }
};

// Test timeout configuration
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test teardown
afterAll(() => {
  // Clean up any test artifacts if needed
  // This can be expanded when we add more test utilities
});
