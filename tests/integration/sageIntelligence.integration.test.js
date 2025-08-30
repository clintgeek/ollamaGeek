const MemoryManager = require('../../src/services/memoryManager');
const PerformanceMonitor = require('../../src/services/performanceMonitor');
const PerformanceDashboard = require('../../src/services/performanceDashboard');
const path = require('path');
const fs = require('fs');

describe('Sage Intelligence System Integration', () => {
  let memoryManager;
  let performanceMonitor;
  let performanceDashboard;
  let testDbPath;

  beforeEach(() => {
    // Create a temporary test database
    testDbPath = path.join(__dirname, '../../data/test_sage_intelligence.db');
    const testDataDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Initialize all services with the test database
    memoryManager = new MemoryManager();
    performanceMonitor = new PerformanceMonitor();
    performanceDashboard = new PerformanceDashboard();
  });

  afterEach(() => {
    // Clean up all services
    if (memoryManager) memoryManager.close();
    if (performanceMonitor) performanceMonitor.close();
    if (performanceDashboard) performanceDashboard.close();

    // Remove test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Complete Workflow: Project Creation and Learning', () => {
    test('should learn and optimize through complete project workflow', async () => {
      const repoPath = '/test/mathApp';
      const projectType = 'nodejs';
      const userId = 'testUser';

      // 1. Store initial repository context
      console.log('1️⃣ Setting up repository context...');
      const repoId = memoryManager.storeRepoInfo(
        repoPath,
        'mathApp',
        ['javascript', 'nodejs'],
        { 'express': '^4.18.0', 'better-sqlite3': '^8.0.0' },
        ['express', 'sqlite'],
        'main',
        { 'src': 'source', 'tests': 'test files' },
        { 'port': 3000, 'timeout': 120000 }
      );
      expect(repoId).toBeDefined();

      // 2. Simulate first project attempt (learning phase)
      console.log('2️⃣ Simulating first project attempt...');
      const firstAttemptId = performanceMonitor.startTiming(
        'first-attempt-123',
        'granite3.3:8b',
        'tool_planning'
      );

      // Simulate some work time
      await new Promise(resolve => setTimeout(resolve, 100));

      // Record first attempt results
      performanceMonitor.endTiming('first-attempt-123', true, null, 200);

      // 3. Store error solutions from first attempt
      console.log('3️⃣ Learning from first attempt errors...');
      const error1Id = memoryManager.storeErrorSolution(
        'TypeError: Cannot read property of undefined',
        'TypeError',
        'Check if object exists before accessing properties',
        repoPath,
        projectType,
        'medium'
      );

      const error2Id = memoryManager.storeErrorSolution(
        'SQLite3 can only bind numbers, strings, bigints, buffers, and null',
        'SQLiteError',
        'Convert boolean values to integers (0/1) before binding to SQLite',
        repoPath,
        projectType,
        'low'
      );

      expect(error1Id).toBeDefined();
      expect(error2Id).toBeDefined();

      // 4. Simulate second project attempt (optimization phase)
      console.log('4️⃣ Simulating optimized second attempt...');
      const secondAttemptId = performanceMonitor.startTiming(
        'second-attempt-456',
        'qwen2.5-coder:7b-instruct-q6_K',
        'tool_planning'
      );

      // Simulate faster work time (optimized)
      await new Promise(resolve => setTimeout(resolve, 50));

      // Record second attempt results
      performanceMonitor.endTiming('second-attempt-456', true, null, 150);

      // 5. Store project model preferences based on performance
      console.log('5️⃣ Learning optimal model preferences...');
      const mappingId = memoryManager.storeProjectModelMapping(
        repoPath,
        projectType,
        'tool_planning',
        'qwen2.5-coder:7b-instruct-q6_K',
        'granite3.3:8b'
      );

      expect(mappingId).toBeDefined();

      // 6. Test intelligent model selection
      console.log('6️⃣ Testing intelligent model selection...');
      const optimalModel = memoryManager.getOptimalModelForProject(
        repoPath,
        projectType,
        'tool_planning'
      );

      expect(optimalModel).toBeDefined();
      expect(optimalModel.primary).toBe('qwen2.5-coder:7b-instruct-q6_K');
      expect(optimalModel.source).toBe('project_mapping');

      // 7. Test performance dashboard integration
      console.log('7️⃣ Testing performance dashboard...');
      const overview = await performanceDashboard.getPerformanceOverview();

      expect(overview).toBeDefined();
      expect(overview.summary).toBeDefined();
      expect(overview.model_recommendations).toBeDefined();

      // 8. Verify learning and optimization
      console.log('8️⃣ Verifying learning and optimization...');

      // Check that error solutions are remembered
      const solutions = memoryManager.findPastSolutions(
        'TypeError: Cannot read property',
        repoPath
      );
      expect(solutions.length).toBeGreaterThan(0);

      // Check that repository context is preserved
      const repoInfo = memoryManager.getRepoInfo(repoPath);
      expect(repoInfo).toBeDefined();
      expect(repoInfo.repo_name).toBe('mathApp');
      expect(repoInfo.languages).toContain('javascript');

      // Check that model preferences are learned
      const modelMapping = memoryManager.getOptimalModelForProject(
        repoPath,
        projectType,
        'tool_planning'
      );
      expect(modelMapping.primary).toBe('qwen2.5-coder:7b-instruct-q6_K');

      console.log('✅ Complete workflow test passed!');
    });
  });

  describe('Cross-Service Data Flow', () => {
    test('should maintain data consistency across all services', async () => {
      const repoPath = '/test/consistencyTest';
      const projectType = 'python';
      const userId = 'testUser';

      // 1. Store data in MemoryManager
      const repoId = memoryManager.storeRepoInfo(
        repoPath, 'consistencyTest', ['python'],
        { 'flask': '^2.0.0' }, ['flask'], 'main',
        { 'src': 'source' }, { 'port': 5000 }
      );

      const errorId = memoryManager.storeErrorSolution(
        'ModuleNotFoundError: No module named flask',
        'ImportError',
        'Install flask with: pip install flask',
        repoPath,
        projectType,
        'low'
      );

      // 2. Track performance with PerformanceMonitor
      const timingId = performanceMonitor.startTiming(
        'consistency-test-123',
        'qwen2.5-coder:7b-instruct-q6_K',
        'tool_generation'
      );

      await new Promise(resolve => setTimeout(resolve, 75));
      performanceMonitor.endTiming('consistency-test-123', true, null, 180);

      // 3. Verify data consistency across services
      const repoInfo = memoryManager.getRepoInfo(repoPath);
      const solutions = memoryManager.findPastSolutions('ModuleNotFoundError', repoPath);
      const performanceSummary = performanceMonitor.getPerformanceSummary();

      // All services should have consistent data
      expect(repoInfo.repo_name).toBe('consistencyTest');
      expect(solutions.length).toBeGreaterThan(0);
      expect(performanceSummary.total_operations).toBeGreaterThan(0);

      // 4. Test PerformanceDashboard can access all data
      const dashboardOverview = await performanceDashboard.getPerformanceOverview();
      expect(dashboardOverview).toBeDefined();
      expect(dashboardOverview.summary.total_operations).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery and Learning', () => {
    test('should learn from failures and improve over time', async () => {
      const repoPath = '/test/errorRecovery';
      const projectType = 'react';

      // 1. Simulate initial failure
      console.log('1️⃣ Simulating initial failure...');
      const failureId = performanceMonitor.startTiming(
        'failure-123',
        'granite3.3:8b',
        'tool_generation'
      );

      await new Promise(resolve => setTimeout(resolve, 200)); // Slow failure
      performanceMonitor.endTiming('failure-123', false, 'Model timeout exceeded', 0);

      // 2. Store error solution
      const errorId = memoryManager.storeErrorSolution(
        'Model timeout exceeded',
        'TimeoutError',
        'Switch to faster model or increase timeout',
        repoPath,
        projectType,
        'high'
      );

      // 3. Simulate successful retry with different approach
      console.log('2️⃣ Simulating successful retry...');
      const retryId = performanceMonitor.startTiming(
        'retry-456',
        'qwen2.5-coder:7b-instruct-q6_K',
        'tool_generation'
      );

      await new Promise(resolve => setTimeout(resolve, 80)); // Faster success
      performanceMonitor.endTiming('retry-456', true, null, 200);

      // 4. Store successful model preference
      const mappingId = memoryManager.storeProjectModelMapping(
        repoPath,
        projectType,
        'tool_generation',
        'qwen2.5-coder:7b-instruct-q6_K',
        'granite3.3:8b'
      );

      // 5. Verify learning from failure
      const solutions = memoryManager.findPastSolutions('timeout exceeded', repoPath);
      expect(solutions.length).toBeGreaterThan(0);

      const optimalModel = memoryManager.getOptimalModelForProject(
        repoPath,
        projectType,
        'tool_generation'
      );
      expect(optimalModel.primary).toBe('qwen2.5-coder:7b-instruct-q6_K');

      // 6. Verify performance improvement
      const performanceSummary = performanceMonitor.getPerformanceSummary();
      expect(performanceSummary.total_operations).toBe(2);
      expect(performanceSummary.success_rate).toBe(0.5); // 1 success, 1 failure

      console.log('✅ Error recovery and learning test passed!');
    });
  });

  describe('Multi-Project Context Switching', () => {
    test('should maintain separate contexts for different projects', async () => {
      const project1Path = '/test/project1';
      const project2Path = '/test/project2';
      const project1Type = 'nodejs';
      const project2Type = 'python';

      // 1. Set up project 1 context
      memoryManager.storeRepoInfo(
        project1Path, 'project1', ['javascript'],
        { 'express': '^4.18.0' }, ['express'], 'main',
        { 'src': 'source' }, { 'port': 3000 }
      );

      memoryManager.storeProjectModelMapping(
        project1Path, project1Type, 'tool_planning',
        'qwen2.5-coder:7b-instruct-q6_K'
      );

      // 2. Set up project 2 context
      memoryManager.storeRepoInfo(
        project2Path, 'project2', ['python'],
        { 'flask': '^2.0.0' }, ['flask'], 'main',
        { 'src': 'source' }, { 'port': 5000 }
      );

      memoryManager.storeProjectModelMapping(
        project2Path, project2Type, 'tool_planning',
        'granite3.3:8b'
      );

      // 3. Verify contexts are separate
      const project1Model = memoryManager.getOptimalModelForProject(
        project1Path, project1Type, 'tool_planning'
      );
      const project2Model = memoryManager.getOptimalModelForProject(
        project2Path, project2Type, 'tool_planning'
      );

      expect(project1Model.primary).toBe('qwen2.5-coder:7b-instruct-q6_K');
      expect(project2Model.primary).toBe('granite3.3:8b');

      // 4. Verify repository info is separate
      const project1Info = memoryManager.getRepoInfo(project1Path);
      const project2Info = memoryManager.getRepoInfo(project2Path);

      expect(project1Info.repo_name).toBe('project1');
      expect(project2Info.repo_name).toBe('project2');
      expect(project1Info.languages).toContain('javascript');
      expect(project2Info.languages).toContain('python');

      console.log('✅ Multi-project context switching test passed!');
    });
  });

  describe('Performance Optimization Workflow', () => {
    test('should identify and act on optimization opportunities', async () => {
      const repoPath = '/test/optimization';
      const projectType = 'nodejs';

      // 1. Simulate slow performance with granite model
      console.log('1️⃣ Simulating slow performance...');
      for (let i = 0; i < 3; i++) {
        const timingId = performanceMonitor.startTiming(
          `slow-${i}`,
          'granite3.3:8b',
          'tool_planning'
        );
        await new Promise(resolve => setTimeout(resolve, 150)); // Slow
        performanceMonitor.endTiming(`slow-${i}`, true, null, 200);
      }

      // 2. Simulate fast performance with qwen model
      console.log('2️⃣ Simulating fast performance...');
      for (let i = 0; i < 3; i++) {
        const timingId = performanceMonitor.startTiming(
          `fast-${i}`,
          'qwen2.5-coder:7b-instruct-q6_K',
          'tool_planning'
        );
        await new Promise(resolve => setTimeout(resolve, 80)); // Fast
        performanceMonitor.endTiming(`fast-${i}`, true, null, 150);
      }

      // 3. Store optimization preference
      memoryManager.storeProjectModelMapping(
        repoPath, projectType, 'tool_planning',
        'qwen2.5-coder:7b-instruct-q6_K',
        'granite3.3:8b'
      );

      // 4. Test optimization identification
      const slowModels = await performanceDashboard.findSlowModels();
      const optimizationOpportunities = await performanceDashboard.identifyOptimizationOpportunities();

      expect(slowModels.length).toBeGreaterThan(0);
      expect(optimizationOpportunities.length).toBeGreaterThan(0);

      // 5. Verify optimization is applied
      const optimalModel = memoryManager.getOptimalModelForProject(
        repoPath, projectType, 'tool_planning'
      );
      expect(optimalModel.primary).toBe('qwen2.5-coder:7b-instruct-q6_K');

      console.log('✅ Performance optimization workflow test passed!');
    });
  });

  describe('System Cleanup and Resource Management', () => {
    test('should properly clean up resources and close connections', async () => {
      // 1. Create some test data
      const repoId = memoryManager.storeRepoInfo(
        '/test/cleanup', 'cleanupTest', ['javascript'],
        {}, [], 'main', {}, {}
      );

      const timingId = performanceMonitor.startTiming(
        'cleanup-test', 'test-model', 'test-task'
      );
      performanceMonitor.endTiming('cleanup-test', true, null, 100);

      // 2. Verify data exists
      const repoInfo = memoryManager.getRepoInfo('/test/cleanup');
      expect(repoInfo).toBeDefined();

      // 3. Clean up all services
      memoryManager.close();
      performanceMonitor.close();
      performanceDashboard.close();

      // 4. Verify cleanup (services should be closed)
      expect(memoryManager.db).toBeUndefined();
      expect(performanceMonitor.memoryManager).toBeUndefined();
      expect(performanceDashboard.performanceMonitor).toBeUndefined();

      console.log('✅ System cleanup and resource management test passed!');
    });
  });
});
