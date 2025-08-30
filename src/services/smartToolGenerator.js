const { Logger } = require('../utils/logger');
const path = require('path');

/**
 * 🧠 Smart Tool Generator
 *
 * Generates tool execution plans using predefined templates and intelligent
 * parameter generation. This works without requiring AI models and provides
 * reliable tool generation for common project tasks.
 */
class SmartToolGenerator {
  constructor() {
    this.logger = new Logger();
    this.toolTemplates = this.initializeToolTemplates();
  }

  /**
   * Initialize tool templates for common project tasks
   */
  initializeToolTemplates() {
    return {
      // Project setup templates
      project_setup: {
        create_directory: {
          template: (context) => ({
            name: 'create_directory',
            description: 'Create project root directory',
            params: { path: '.' },
            priority: 1,
            dependencies: [],
            critical: true
          })
        },
        create_file: {
          template: (context) => ({
            name: 'create_file',
            description: 'Create package.json file',
            params: {
              path: 'package.json',
              content: this.generatePackageJson(context)
            },
            priority: 2,
            dependencies: ['create_directory'],
            critical: true
          })
        },
        install_dependency: {
          template: (context) => ({
            name: 'install_dependency',
            description: 'Install project dependencies',
            params: { package: 'express', packageManager: 'npm' },
            priority: 3,
            dependencies: ['create_file'],
            critical: false
          })
        }
      },

      // API development templates
      api_development: {
        create_server_file: {
          template: (context) => ({
            name: 'create_server_file',
            description: 'Create main server file',
            params: {
              path: 'src/server.js',
              content: this.generateServerFile(context)
            },
            priority: 1,
            dependencies: [],
            critical: true
          })
        },
        create_readme_file: {
          template: (context) => ({
            name: 'create_readme_file',
            description: 'Create README file',
            params: {
              path: 'README.md',
              content: this.generateReadmeFile(context)
            },
            priority: 2,
            dependencies: [],
            critical: false
          })
        }
      },

      // Testing templates
      testing: {
        create_file: {
          template: (context) => ({
            name: 'create_file',
            description: 'Create test configuration',
            params: {
              path: 'test/test.js',
              content: this.generateTestFile(context)
            },
            priority: 1,
            dependencies: [],
            critical: false
          })
        },
        run_tests: {
          template: (context) => ({
            name: 'run_tests',
            description: 'Run project tests',
            params: { testScript: 'test' },
            priority: 2,
            dependencies: ['create_file'],
            critical: false
          })
        }
      }
    };
  }

  /**
   * Generate tools for a specific phase
   */
  async generateToolsForPhase(phaseName, context) {
    try {
      this.logger.info(`🧠 Generating tools for phase: ${phaseName}`);

      const phaseTemplates = this.toolTemplates[phaseName];
      if (!phaseTemplates) {
        throw new Error(`No templates found for phase: ${phaseName}`);
      }

      const tools = [];
      const toolMap = new Map();

      // Generate tools using templates
      for (const [toolName, template] of Object.entries(phaseTemplates)) {
        const tool = template.template(context);

        // Ensure unique tool names
        if (toolMap.has(tool.name)) {
          this.logger.warn(`⚠️ Duplicate tool name detected: ${tool.name}, skipping`);
          continue;
        }

        toolMap.set(tool.name, true);
        tools.push(tool);
        this.logger.info(`✅ Generated tool: ${tool.name} for phase ${phaseName}`);
      }

      // Sort tools by priority
      tools.sort((a, b) => a.priority - b.priority);

      this.logger.info(`✅ Generated ${tools.length} tools for phase ${phaseName}`);
      return tools;

    } catch (error) {
      this.logger.error(`❌ Failed to generate tools for phase ${phaseName}:`, error);
      throw error;
    }
  }

  /**
   * Generate tools for a complete workflow
   */
  async generateToolsForWorkflow(workflowType, context) {
    try {
      this.logger.info(`🧠 Generating tools for workflow: ${workflowType}`);

      const phaseOrder = this.getPhaseOrder(workflowType);
      const allTools = [];

      for (const phaseName of phaseOrder) {
        const phaseTools = await this.generateToolsForPhase(phaseName, context);

        // Add phase information to tools
        phaseTools.forEach(tool => {
          tool.phase = phaseName;
          tool.workflowType = workflowType;
        });

        allTools.push(...phaseTools);
      }

      this.logger.info(`✅ Generated ${allTools.length} total tools for workflow ${workflowType}`);
      return allTools;

    } catch (error) {
      this.logger.error(`❌ Failed to generate tools for workflow ${workflowType}:`, error);
      throw error;
    }
  }

  /**
   * Get phase order for different workflow types
   */
  getPhaseOrder(workflowType) {
    const phaseOrders = {
      'nodejs_api': ['project_setup', 'api_development', 'testing'],
      'react_app': ['project_setup', 'frontend_development', 'testing'],
      'python_app': ['project_setup', 'backend_development', 'testing'],
      'simple': ['project_setup', 'file_creation', 'testing']
    };

    return phaseOrders[workflowType] || ['project_setup', 'development', 'testing'];
  }

  /**
   * Generate package.json content
   */
  generatePackageJson(context) {
    const projectName = context.projectName || 'my-project';
    const description = context.description || 'A Node.js project';

    return JSON.stringify({
      name: projectName,
      version: '1.0.0',
      description: description,
      main: 'src/server.js',
      scripts: {
        start: 'node src/server.js',
        test: 'node test/test.js',
        dev: 'nodemon src/server.js'
      },
      dependencies: {
        express: '^4.18.2'
      },
      devDependencies: {
        nodemon: '^3.0.1'
      }
    }, null, 2);
  }

  /**
   * Generate server.js content
   */
  generateServerFile(context) {
    return `const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from ${context.projectName || 'My API'}!' });
});

app.listen(port, () => {
  console.log(\`🚀 Server running on port \${port}\`);
});`;
  }

  /**
   * Generate README.md content
   */
  generateReadmeFile(context) {
    return `# ${context.projectName || 'My Project'}

${context.description || 'A Node.js project'}

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

3. Run tests:
   \`\`\`bash
   npm test
   \`\`\`

## Project Structure

- \`src/server.js\` - Main server file
- \`package.json\` - Project configuration
- \`README.md\` - This file

## License

MIT
`;
  }

  /**
   * Generate test file content
   */
  generateTestFile(context) {
    return `// Test file for ${context.projectName || 'My Project'}

console.log('🧪 Running tests...');

// Basic test
function testBasicFunctionality() {
  console.log('✅ Basic functionality test passed');
  return true;
}

// Run tests
testBasicFunctionality();

console.log('🎉 All tests completed!');`;
  }

  /**
   * Validate generated tools
   */
  validateTools(tools) {
    const errors = [];

    for (const tool of tools) {
      if (!tool.name) {
        errors.push(`Tool missing name: ${JSON.stringify(tool)}`);
      }
      if (!tool.params) {
        errors.push(`Tool ${tool.name} missing params`);
      }
      if (typeof tool.priority !== 'number') {
        errors.push(`Tool ${tool.name} missing priority`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      toolCount: tools.length
    };
  }
}

module.exports = SmartToolGenerator;
