const ToolExecutionEngine = require('../../src/services/toolExecutionEngine');
const path = require('path');

// Mock fs and child_process
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    copyFile: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn()
  },
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn()
}));

jest.mock('../../src/utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}));

jest.mock('child_process', () => ({
  exec: jest.fn()
}));

describe('ToolExecutionEngine', () => {
  let toolExecutionEngine;
  let mockFs;
  let mockExec;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get mocked modules
    mockFs = require('fs').promises;
    mockExec = require('child_process').exec;

    toolExecutionEngine = new ToolExecutionEngine();
  });

  describe('Initialization', () => {
    test('should initialize with supported tools', () => {
      expect(toolExecutionEngine.supportedTools.size).toBe(11);
      expect(toolExecutionEngine.supportedTools.has('create_file')).toBe(true);
      expect(toolExecutionEngine.supportedTools.has('create_directory')).toBe(true);
      expect(toolExecutionEngine.supportedTools.has('run_terminal')).toBe(true);
    });

    test('should have correct tool count', () => {
      const stats = toolExecutionEngine.getStats();
      expect(stats.totalTools).toBe(11);
      expect(stats.supportedTools).toHaveLength(11);
    });
  });

  describe('Tool Parameter Validation', () => {
    test('should get correct required parameters for create_file', () => {
      const params = toolExecutionEngine.getRequiredParams('create_file');
      expect(params).toEqual(['path', 'content']);
    });

    test('should get correct required parameters for create_directory', () => {
      const params = toolExecutionEngine.getRequiredParams('create_directory');
      expect(params).toEqual(['path']);
    });

    test('should get correct required parameters for run_terminal', () => {
      const params = toolExecutionEngine.getRequiredParams('run_terminal');
      expect(params).toEqual(['command']);
    });

    test('should get empty array for tools with no required params', () => {
      const params = toolExecutionEngine.getRequiredParams('run_tests');
      expect(params).toEqual([]);
    });

    test('should validate required parameters correctly', () => {
      const validParams = { path: 'test.txt', content: 'test content' };
      expect(() => toolExecutionEngine.validateToolParams('create_file', validParams)).not.toThrow();

      const invalidParams = { path: 'test.txt' }; // Missing content
      expect(() => toolExecutionEngine.validateToolParams('create_file', invalidParams)).toThrow('Missing required parameter: content');
    });
  });

  describe('Path Resolution', () => {
    test('should resolve absolute paths correctly', () => {
      const absolutePath = '/absolute/path/file.txt';
      const context = { targetDir: '/tmp/project' };

      const resolved = toolExecutionEngine.resolvePath(absolutePath, context);
      expect(resolved).toBe(absolutePath);
    });

    test('should resolve relative paths with target directory', () => {
      const relativePath = 'src/file.js';
      const context = { targetDir: '/tmp/project' };

      const resolved = toolExecutionEngine.resolvePath(relativePath, context);
      expect(resolved).toBe('/tmp/project/src/file.js');
    });

    test('should resolve relative paths without target directory', () => {
      const relativePath = 'src/file.js';
      const context = {};

      const resolved = toolExecutionEngine.resolvePath(relativePath, context);
      expect(resolved).toBe(path.resolve(process.cwd(), 'src/file.js'));
    });
  });

  describe('Tool Execution', () => {
    test('should execute create_directory successfully', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);

      const params = { path: 'test-dir' };
      const context = { targetDir: '/tmp/project' };

      const result = await toolExecutionEngine.executeTool('create_directory', params, context);

      expect(result.success).toBe(true);
      expect(result.tool).toBe('create_directory');
      expect(result.result.path).toBe('/tmp/project/test-dir');
      expect(result.result.created).toBe(true);

      expect(mockFs.mkdir).toHaveBeenCalledWith('/tmp/project/test-dir', { recursive: true });
    });

    test('should execute create_file successfully', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const params = { path: 'test.txt', content: 'Hello World' };
      const context = { targetDir: '/tmp/project' };

      const result = await toolExecutionEngine.executeTool('create_file', params, context);

      expect(result.success).toBe(true);
      expect(result.tool).toBe('create_file');
      expect(result.result.path).toBe('/tmp/project/test.txt');
      expect(result.result.size).toBe(11);
      expect(result.result.created).toBe(true);

      expect(mockFs.mkdir).toHaveBeenCalledWith('/tmp/project', { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith('/tmp/project/test.txt', 'Hello World', 'utf8');
    });

    test('should execute list_files successfully', async () => {
      const mockFiles = [
        { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
        { name: 'dir1', isDirectory: () => true, isFile: () => false }
      ];
      mockFs.readdir.mockResolvedValue(mockFiles);

      const params = { path: '.' };
      const context = { targetDir: '/tmp/project' };

      const result = await toolExecutionEngine.executeTool('list_files', params, context);

      expect(result.success).toBe(true);
      expect(result.tool).toBe('list_files');
      expect(result.result.path).toBe('/tmp/project');
      expect(result.result.files).toHaveLength(2);
      expect(result.result.files[0].name).toBe('file1.txt');
      expect(result.result.files[0].isFile).toBe(true);
      expect(result.result.files[1].name).toBe('dir1');
      expect(result.result.files[1].isDirectory).toBe(true);
    });

    test('should handle unsupported tools gracefully', async () => {
      const params = { path: 'test' };
      const context = {};

      const result = await toolExecutionEngine.executeTool('unsupported_tool', params, context);

      expect(result.success).toBe(false);
      expect(result.tool).toBe('unsupported_tool');
      expect(result.error).toContain('Unsupported tool');
    });

    test('should handle tool execution errors gracefully', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      const params = { path: 'test-dir' };
      const context = { targetDir: '/tmp/project' };

      const result = await toolExecutionEngine.executeTool('create_directory', params, context);

      expect(result.success).toBe(false);
      expect(result.tool).toBe('create_directory');
      expect(result.error).toContain('Permission denied');
    });
  });

  describe('Multiple Tool Execution', () => {
    test('should execute multiple tools in sequence', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const tools = [
        { tool: 'create_directory', params: { path: 'src' } },
        { tool: 'create_file', params: { path: 'src/index.js', content: 'console.log("Hello")' } }
      ];
      const context = { targetDir: '/tmp/project' };

      const results = await toolExecutionEngine.executeTools(tools, context);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].tool).toBe('create_directory');
      expect(results[1].tool).toBe('create_file');
    });

    test('should stop execution on critical tool failure', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      mockFs.writeFile.mockResolvedValue(undefined);

      const tools = [
        { tool: 'create_directory', params: { path: 'src' }, critical: true },
        { tool: 'create_file', params: { path: 'src/index.js', content: 'console.log("Hello")' } }
      ];
      const context = { targetDir: '/tmp/project' };

      const results = await toolExecutionEngine.executeTools(tools, context);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].tool).toBe('create_directory');
    });

    test('should continue execution on non-critical tool failure', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      const tools = [
        { tool: 'create_directory', params: { path: 'src' }, critical: true },
        { tool: 'create_file', params: { path: 'src/index.js', content: 'console.log("Hello")' }, critical: false }
      ];
      const context = { targetDir: '/tmp/project' };

      const results = await toolExecutionEngine.executeTools(tools, context);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    test('should capitalize first letter correctly', () => {
      expect(toolExecutionEngine.capitalizeFirst('hello')).toBe('Hello');
      expect(toolExecutionEngine.capitalizeFirst('world')).toBe('World');
    });

    test('should handle underscore conversion correctly', () => {
      expect(toolExecutionEngine.capitalizeFirst('create_directory')).toBe('CreateDirectory');
      expect(toolExecutionEngine.capitalizeFirst('run_terminal')).toBe('RunTerminal');
      expect(toolExecutionEngine.capitalizeFirst('install_dependency')).toBe('InstallDependency');
    });
  });
});
