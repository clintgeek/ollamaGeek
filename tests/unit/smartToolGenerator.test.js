const SmartToolGenerator = require('../../src/services/smartToolGenerator');

describe('SmartToolGenerator', () => {
  let smartToolGenerator;

  beforeEach(() => {
    smartToolGenerator = new SmartToolGenerator();
  });

  describe('Initialization', () => {
    test('should initialize with tool templates', () => {
      expect(smartToolGenerator.toolTemplates).toBeDefined();
      expect(smartToolGenerator.toolTemplates.project_setup).toBeDefined();
      expect(smartToolGenerator.toolTemplates.api_development).toBeDefined();
      expect(smartToolGenerator.toolTemplates.testing).toBeDefined();
    });

    test('should have create_directory template in project_setup', () => {
      const projectSetup = smartToolGenerator.toolTemplates.project_setup;
      expect(projectSetup.create_directory).toBeDefined();
      expect(typeof projectSetup.create_directory.template).toBe('function');
    });

    test('should have create_file template in project_setup', () => {
      const projectSetup = smartToolGenerator.toolTemplates.project_setup;
      expect(projectSetup.create_file).toBeDefined();
      expect(typeof projectSetup.create_file.template).toBe('function');
    });
  });

  describe('Tool Generation for Phase', () => {
    test('should generate tools for project_setup phase', async () => {
      const context = {
        projectName: 'test-project',
        targetDir: '/tmp/test',
        description: 'A test project'
      };

      const tools = await smartToolGenerator.generateToolsForPhase('project_setup', context);

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Check that tools have required properties
      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.params).toBeDefined();
        expect(tool.priority).toBeDefined();
        expect(tool.dependencies).toBeDefined();
        expect(tool.critical).toBeDefined();
      });

      // Check specific tools
      const createDirTool = tools.find(t => t.name === 'create_directory');
      expect(createDirTool).toBeDefined();
      expect(createDirTool.params.path).toBe('.');

      const createFileTool = tools.find(t => t.name === 'create_file');
      expect(createFileTool).toBeDefined();
      expect(createFileTool.params.path).toBe('package.json');
    });

    test('should generate tools for api_development phase', async () => {
      const context = {
        projectName: 'test-project',
        targetDir: '/tmp/test'
      };

      const tools = await smartToolGenerator.generateToolsForPhase('api_development', context);

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Check for server file creation
      const serverTool = tools.find(t => t.name === 'create_server_file' && t.params.path === 'src/server.js');
      expect(serverTool).toBeDefined();

      // Check for README creation
      const readmeTool = tools.find(t => t.name === 'create_readme_file' && t.params.path === 'README.md');
      expect(readmeTool).toBeDefined();
    });

    test('should handle unknown phase gracefully', async () => {
      const context = { projectName: 'test-project' };

      await expect(
        smartToolGenerator.generateToolsForPhase('unknown_phase', context)
      ).rejects.toThrow('No templates found for phase: unknown_phase');
    });
  });

  describe('Workflow Tool Generation', () => {
    test('should generate tools for complete nodejs_api workflow', async () => {
      const context = {
        projectName: 'test-api',
        targetDir: '/tmp/test-api'
      };

      const tools = await smartToolGenerator.generateToolsForWorkflow('nodejs_api', context);

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Check that tools have phase information
      tools.forEach(tool => {
        expect(tool.phase).toBeDefined();
        expect(tool.workflowType).toBe('nodejs_api');
      });

      // Check phase distribution
      const projectSetupTools = tools.filter(t => t.phase === 'project_setup');
      const apiDevTools = tools.filter(t => t.phase === 'api_development');
      const testingTools = tools.filter(t => t.phase === 'testing');

      expect(projectSetupTools.length).toBeGreaterThan(0);
      expect(apiDevTools.length).toBeGreaterThan(0);
      expect(testingTools.length).toBeGreaterThan(0);
    });

    test('should get correct phase order for different workflow types', () => {
      const nodejsOrder = smartToolGenerator.getPhaseOrder('nodejs_api');
      expect(nodejsOrder).toEqual(['project_setup', 'api_development', 'testing']);

      const reactOrder = smartToolGenerator.getPhaseOrder('react_app');
      expect(reactOrder).toEqual(['project_setup', 'frontend_development', 'testing']);

      const defaultOrder = smartToolGenerator.getPhaseOrder('unknown');
      expect(defaultOrder).toEqual(['project_setup', 'development', 'testing']);
    });
  });

  describe('Content Generation', () => {
    test('should generate valid package.json content', () => {
      const context = {
        projectName: 'my-awesome-project',
        description: 'The best project ever'
      };

      const packageJson = smartToolGenerator.generatePackageJson(context);

      expect(typeof packageJson).toBe('string');

      const parsed = JSON.parse(packageJson);
      expect(parsed.name).toBe('my-awesome-project');
      expect(parsed.description).toBe('The best project ever');
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.scripts).toBeDefined();
      expect(parsed.dependencies).toBeDefined();
    });

    test('should generate valid README content', () => {
      const context = {
        projectName: 'test-project',
        description: 'A test project'
      };

      const readme = smartToolGenerator.generateReadmeFile(context);

      expect(typeof readme).toBe('string');
      expect(readme).toContain('# test-project');
      expect(readme).toContain('A test project');
      expect(readme).toContain('npm install');
      expect(readme).toContain('npm start');
      expect(readme).toContain('npm test');
    });

    test('should generate valid test file content', () => {
      const context = {
        projectName: 'test-project'
      };

      const testFile = smartToolGenerator.generateTestFile(context);

      expect(typeof testFile).toBe('string');
      expect(testFile).toContain('test-project');
      expect(testFile).toContain('🧪 Running tests...');
      expect(testFile).toContain('🎉 All tests completed!');
    });
  });

  describe('Tool Validation', () => {
    test('should validate valid tools', () => {
      const validTools = [
        {
          name: 'create_directory',
          params: { path: '.' },
          priority: 1
        }
      ];

      const validation = smartToolGenerator.validateTools(validTools);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.toolCount).toBe(1);
    });

    test('should detect invalid tools', () => {
      const invalidTools = [
        {
          name: 'create_directory',
          // Missing params
          priority: 1
        }
      ];

      const validation = smartToolGenerator.validateTools(invalidTools);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('missing params');
    });
  });
});
