const { AutoToolExecutor } = require('./autoToolExecutor');
const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class AgenticWorkflowExecutor extends AutoToolExecutor {
  constructor() {
    super();
    this.workflowCache = new Map();
  }

  /**
   * Execute a complete workflow based on natural language request
   */
  async executeWorkflow(request, context) {
    console.log('🧠 Agentic Workflow Analysis:', request);

    // Analyze the request for workflow patterns
    const workflow = this._analyzeWorkflow(request);

    if (!workflow) {
      console.log('❌ No workflow pattern detected, falling back to individual tools');
      return null;
    }

    console.log(`🚀 Executing ${workflow.type} workflow:`, workflow.steps.length, 'steps');

    const results = [];

    try {
      for (const step of workflow.steps) {
        console.log(`📋 Executing step: ${step.description}`);

        const result = await this._executeWorkflowStep(step, context);
        results.push({
          step: step.description,
          success: result.success,
          result: result,
          error: result.error
        });

        if (!result.success) {
          console.log(`❌ Step failed: ${step.description}`, result.error);
          break;
        }

        console.log(`✅ Step completed: ${step.description}`);
      }

      // Execute post-workflow actions
      if (workflow.postActions) {
        for (const action of workflow.postActions) {
          console.log(`🔧 Post-action: ${action.description}`);
          await this._executeWorkflowStep(action, context);
        }
      }

      return {
        workflow: workflow.type,
        steps: workflow.steps.length,
        results: results,
        success: results.every(r => r.success)
      };

    } catch (error) {
      console.error('❌ Workflow execution failed:', error);
      return {
        workflow: workflow.type,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Analyze request for workflow patterns
   */
  _analyzeWorkflow(request) {
    const content = this._extractContent(request);
    const lowerContent = content.toLowerCase();

        // React/Node.js Full Stack Project
    if (this._isReactNodeProject(content)) {
      return this._createReactNodeWorkflow(content);
    }

        // Simple Node.js Project (including Express)
    if (this._isSimpleNodeProject(content)) {
      return this._createSimpleNodeWorkflow(content);
    }

    // Express Backend Project
    if (this._isExpressProject(content)) {
      return this._createExpressWorkflow(content);
    }

    // React Frontend Project
    if (this._isReactFrontendProject(content)) {
      return this._createReactFrontendWorkflow(content);
    }

    // Python Project
    if (this._isPythonProject(content)) {
      return this._createPythonWorkflow(content);
    }

    // Git Repository Setup
    if (this._isGitSetup(content)) {
      return this._createGitWorkflow(content);
    }

        // Package Installation
    if (this._isPackageInstallation(content)) {
      return this._createPackageWorkflow(content);
    }

    // Generic file/folder creation
    if (this._isFileCreationRequest(content)) {
      return this._createFileCreationWorkflow(content);
    }

        // Generic command execution
    if (this._isCommandExecutionRequest(content)) {
      return this._createCommandExecutionWorkflow(content);
    }
    
    // AI-powered code analysis
    if (this._isAIAnalysisRequest(content)) {
      return this._createAIAnalysisWorkflow(content);
    }
    
    // AI-powered code refactoring
    if (this._isAIRefactoringRequest(content)) {
      return this._createAIRefactoringWorkflow(content);
    }
    
    // AI-powered test generation
    if (this._isAITestGenerationRequest(content)) {
      return this._createAITestGenerationWorkflow(content);
    }
    
    // AI-powered debugging
    if (this._isAIDebuggingRequest(content)) {
      return this._createAIDebuggingWorkflow(content);
    }
    
    return null;
  }

  /**
   * Check if request is for a React/Node.js full stack project
   */
  _isReactNodeProject(content) {
    const lowerContent = content.toLowerCase();
    return (
      (lowerContent.includes('react') && lowerContent.includes('express')) ||
      (lowerContent.includes('full stack') && (lowerContent.includes('react') || lowerContent.includes('node'))) ||
      (lowerContent.includes('full stack') && lowerContent.includes('project')) ||
      (lowerContent.includes('fullstack') && lowerContent.includes('project'))
    );
  }

  /**
   * Check if request is for a simple Node.js project
   */
  _isSimpleNodeProject(content) {
    const lowerContent = content.toLowerCase();
    return (
      (lowerContent.includes('node') && lowerContent.includes('project')) ||
      (lowerContent.includes('node.js') && lowerContent.includes('project')) ||
      (lowerContent.includes('create') && lowerContent.includes('folder') && lowerContent.includes('node')) ||
      (lowerContent.includes('set up') && lowerContent.includes('node')) ||
      (lowerContent.includes('setup') && lowerContent.includes('node')) ||
      (lowerContent.includes('create') && lowerContent.includes('directory') && lowerContent.includes('node')) ||
      (lowerContent.includes('mkdir') && lowerContent.includes('node')) ||
      (lowerContent.includes('express') && lowerContent.includes('server')) ||
      (lowerContent.includes('express') && lowerContent.includes('app'))
    );
  }

  /**
   * Check if request is for an Express backend project
   */
  _isExpressProject(content) {
    const lowerContent = content.toLowerCase();
    return (
      lowerContent.includes('express') &&
      (lowerContent.includes('backend') || lowerContent.includes('api') || lowerContent.includes('server'))
    );
  }

  /**
   * Check if request is for a React frontend project
   */
  _isReactFrontendProject(content) {
    const lowerContent = content.toLowerCase();
    return (
      lowerContent.includes('react') &&
      (lowerContent.includes('frontend') || lowerContent.includes('component') || lowerContent.includes('app'))
    );
  }

  /**
   * Check if request is for a Python project
   */
  _isPythonProject(content) {
    const lowerContent = content.toLowerCase();
    return (
      lowerContent.includes('python') ||
      lowerContent.includes('flask') ||
      lowerContent.includes('django')
    );
  }

  /**
   * Check if request is for git setup
   */
  _isGitSetup(content) {
    const lowerContent = content.toLowerCase();
    return (
      lowerContent.includes('git') &&
      (lowerContent.includes('init') || lowerContent.includes('repository') || lowerContent.includes('commit'))
    );
  }

  /**
   * Check if request is for package installation
   */
  _isPackageInstallation(content) {
    const lowerContent = content.toLowerCase();
    return (
      lowerContent.includes('install') ||
      lowerContent.includes('npm install') ||
      lowerContent.includes('yarn add')
    );
  }

  /**
   * Create React/Node.js full stack workflow
   */
  _createReactNodeWorkflow(content) {
    const projectName = this._extractProjectName(content) || 'fullstack-app';

    return {
      type: 'react-node-fullstack',
      description: `Create a complete React frontend + Express backend project: ${projectName}`,
      steps: [
        {
          description: 'Create project directory structure',
          action: 'create_directories',
          params: { projectName, structure: ['src', 'src/components', 'src/pages', 'src/utils', 'server', 'server/routes', 'server/controllers', 'server/models'] }
        },
        {
          description: 'Create package.json for root project',
          action: 'create_file',
          params: { path: `${projectName}/package.json`, content: this._generateRootPackageJson(projectName), language: 'json' }
        },
        {
          description: 'Create frontend package.json',
          action: 'create_file',
          params: { path: `${projectName}/src/package.json`, content: this._generateFrontendPackageJson(), language: 'json' }
        },
        {
          description: 'Create backend package.json',
          action: 'create_file',
          params: { path: `${projectName}/server/package.json`, content: this._generateBackendPackageJson(), language: 'json' }
        },
        {
          description: 'Create React App.jsx',
          action: 'create_file',
          params: { path: `${projectName}/src/App.jsx`, content: this._generateReactApp(), language: 'jsx' }
        },
        {
          description: 'Create Express server.js',
          action: 'create_file',
          params: { path: `${projectName}/server/server.js`, content: this._generateExpressServer(), language: 'javascript' }
        },
        {
          description: 'Create README.md',
          action: 'create_file',
          params: { path: `${projectName}/README.md`, content: this._generateFullStackReadme(projectName), language: 'markdown' }
        }
      ],
      postActions: [
        {
          description: 'Install dependencies',
          action: 'run_terminal',
          params: { command: `cd ${projectName} && npm install`, cwd: path.resolve(process.cwd(), '..') }
        }
      ]
    };
  }

  /**
   * Create simple Node.js project workflow
   */
  _createSimpleNodeWorkflow(content) {
    const projectName = this._extractProjectName(content) || 'node-project';

    return {
      type: 'simple-node',
      description: `Create a simple Node.js project: ${projectName}`,
      steps: [
        {
          description: 'Create project directory structure',
          action: 'create_directories',
          params: { projectName, structure: ['src', 'tests'] }
        },
        {
          description: 'Create package.json',
          action: 'create_file',
          params: { path: `${projectName}/package.json`, content: this._generateSimpleNodePackageJson(projectName), language: 'json' }
        },
        {
          description: 'Create main index.js',
          action: 'create_file',
          params: { path: `${projectName}/src/index.js`, content: this._generateSimpleNodeIndex(), language: 'javascript' }
        },
        {
          description: 'Create README.md',
          action: 'create_file',
          params: { path: `${projectName}/README.md`, content: this._generateSimpleNodeReadme(projectName), language: 'markdown' }
        }
      ],
      postActions: [
        {
          description: 'Initialize git repository',
          action: 'run_terminal',
          params: { command: `cd ${projectName} && git init && git add . && git commit -m "Initial commit by OllamaGeek"`, cwd: path.resolve(process.cwd(), '..') }
        }
      ]
    };
  }

  /**
   * Create Express backend workflow
   */
  _createExpressWorkflow(content) {
    const projectName = this._extractProjectName(content) || 'express-api';

    return {
      type: 'express-backend',
      description: `Create a complete Express.js backend API: ${projectName}`,
      steps: [
        {
          description: 'Create project directory structure',
          action: 'create_directories',
          params: { projectName, structure: ['src', 'src/routes', 'src/controllers', 'src/models', 'src/middleware', 'src/config'] }
        },
        {
          description: 'Create package.json',
          action: 'create_file',
          params: { path: `${projectName}/package.json`, content: this._generateBackendPackageJson(), language: 'json' }
        },
        {
          description: 'Create main server file',
          action: 'create_file',
          params: { path: `${projectName}/src/server.js`, content: this._generateExpressServer(), language: 'javascript' }
        },
        {
          description: 'Create basic route',
          action: 'create_file',
          params: { path: `${projectName}/src/routes/index.js`, content: this._generateBasicRoute(), language: 'javascript' }
        },
        {
          description: 'Create README.md',
          action: 'create_file',
          params: { path: `${projectName}/README.md`, content: this._generateBackendReadme(projectName), language: 'markdown' }
        }
      ],
      postActions: [
        {
          description: 'Install dependencies',
          action: 'run_terminal',
          params: { command: `cd ${projectName} && npm install`, cwd: path.resolve(process.cwd(), '..') }
        }
      ]
    };
  }

  /**
   * Create React frontend workflow
   */
  _createReactFrontendWorkflow(content) {
    const projectName = this._extractProjectName(content) || 'react-app';

    return {
      type: 'react-frontend',
      description: `Create a complete React frontend application: ${projectName}`,
      steps: [
        {
          description: 'Create project directory structure',
          action: 'create_directories',
          params: { projectName, structure: ['src', 'src/components', 'src/pages', 'src/utils', 'src/assets', 'public'] }
        },
        {
          description: 'Create package.json',
          action: 'create_file',
          params: { path: `${projectName}/package.json`, content: this._generateFrontendPackageJson(), language: 'json' }
        },
        {
          description: 'Create React App.jsx',
          action: 'create_file',
          params: { path: `${projectName}/src/App.jsx`, content: this._generateReactApp(), language: 'jsx' }
        },
        {
          description: 'Create index.html',
          action: 'create_file',
          params: { path: `${projectName}/public/index.html`, content: this._generateIndexHtml(projectName), language: 'html' }
        },
        {
          description: 'Create README.md',
          action: 'create_file',
          params: { path: `${projectName}/README.md`, content: this._generateFrontendReadme(projectName), language: 'markdown' }
        }
      ],
      postActions: [
        {
          description: 'Install dependencies',
          action: 'run_terminal',
          params: { command: `cd ${projectName} && npm install`, cwd: path.resolve(process.cwd(), '..') }
        }
      ]
    };
  }

  /**
   * Create Python project workflow
   */
  _createPythonWorkflow(content) {
    const projectName = this._extractProjectName(content) || 'python-app';

    return {
      type: 'python-project',
      description: `Create a complete Python project: ${projectName}`,
      steps: [
        {
          description: 'Create project directory structure',
          action: 'create_directories',
          params: { projectName, structure: ['src', 'tests', 'docs'] }
        },
        {
          description: 'Create requirements.txt',
          action: 'create_file',
          params: { path: `${projectName}/requirements.txt`, content: this._generateRequirementsTxt(), language: 'text' }
        },
        {
          description: 'Create main.py',
          action: 'create_file',
          params: { path: `${projectName}/src/main.py`, content: this._generatePythonMain(), language: 'python' }
        },
        {
          description: 'Create README.md',
          action: 'create_file',
          params: { path: `${projectName}/README.md`, content: this._generatePythonReadme(projectName), language: 'markdown' }
        }
      ]
    };
  }

  /**
   * Create Git setup workflow
   */
  _createGitWorkflow(content) {
    return {
      type: 'git-setup',
      description: 'Initialize Git repository and make first commit',
      steps: [
        {
          description: 'Initialize Git repository',
          action: 'run_terminal',
          params: { command: 'git init', cwd: path.resolve(process.cwd(), '..') }
        },
        {
          description: 'Add all files to Git',
          action: 'run_terminal',
          params: { command: 'git add .', cwd: path.resolve(process.cwd(), '..') }
        },
        {
          description: 'Make initial commit',
          action: 'run_terminal',
          params: { command: 'git commit -m "Initial commit by OllamaGeek"', cwd: path.resolve(process.cwd(), '..') }
        }
      ]
    };
  }

  /**
   * Create package installation workflow
   */
  _createPackageWorkflow(content) {
    const packages = this._extractPackageNames(content);

    return {
      type: 'package-installation',
      description: `Install packages: ${packages.join(', ')}`,
      steps: [
        {
          description: `Install packages: ${packages.join(', ')}`,
          action: 'run_terminal',
          params: { command: `npm install ${packages.join(' ')}`, cwd: path.resolve(process.cwd(), '..') }
        }
      ]
    };
  }

  /**
   * Execute a workflow step
   */
  async _executeWorkflowStep(step, context) {
    try {
      console.log(`🔍 Executing step: ${step.action} with params:`, JSON.stringify(step.params, null, 2));

      let result;
      switch (step.action) {
        case 'create_directories':
          result = await this._createDirectories(step.params);
          break;

        case 'create_file':
          console.log(`📝 Creating file: ${step.params.path}`);
          result = await this.createFile(step.params.path, step.params.content, step.params.language);
          console.log(`📝 File creation result:`, result);
          break;

        case 'run_terminal':
          result = await this.runTerminal(step.params.command, step.params.cwd);
          break;

        case 'ai_analyze':
          result = await this._runAIAnalysis(step.params);
          break;

        case 'ai_refactor':
          result = await this._runAIRefactoring(step.params);
          break;

        case 'ai_generate_tests':
          result = await this._runAITestGeneration(step.params);
          break;

        case 'ai_debug':
          result = await this._runAIDebugging(step.params);
          break;

        default:
          result = { success: false, error: `Unknown action: ${step.action}` };
      }

      console.log(`✅ Step ${step.action} completed with result:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Step ${step.action} failed with error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create multiple directories
   */
  async _createDirectories(params) {
    const { projectName, structure } = params;

    try {
      // Create the project in the parent directory (where the user is working)
      const parentDir = path.resolve(process.cwd(), '..');
      const projectPath = path.join(parentDir, projectName);

      // Create main project directory
      await fs.mkdir(projectPath, { recursive: true });

      // Create subdirectories
      for (const dir of structure) {
        await fs.mkdir(path.join(projectPath, dir), { recursive: true });
      }

      return {
        success: true,
        action: 'directories_created',
        projectPath,
        projectName,
        directories: structure
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract project name from content
   */
  _extractProjectName(content) {
    // Simple and robust project name extraction
    console.log(`🔍 Extracting project name from: "${content}"`);

    // Look for "called" pattern first (most reliable)
    const calledMatch = content.match(/called\s+([a-zA-Z0-9-_]+)/i);
    if (calledMatch) {
      const projectName = calledMatch[1];
      console.log(`🎯 Extracted project name from "called": ${projectName}`);
      return projectName;
    }

    // Look for project/app/application followed by a name
    const projectMatch = content.match(/(?:project|app|application)\s+([a-zA-Z0-9-_]+)/i);
    if (projectMatch) {
      const projectName = projectMatch[1];
      console.log(`🎯 Extracted project name from project/app: ${projectName}`);
      return projectName;
    }

    // Look for a name followed by project/app/application
    const nameMatch = content.match(/([a-zA-Z0-9-_]+)\s+(?:project|app|application)/i);
    if (nameMatch) {
      const projectName = nameMatch[1];
      // Skip common words
      if (!['a', 'an', 'the', 'new', 'full', 'stack', 'create', 'make', 'generate'].includes(projectName.toLowerCase())) {
        console.log(`🎯 Extracted project name from name + project: ${projectName}`);
        return projectName;
      }
    }

    console.log(`❌ No project name extracted from: "${content}"`);
    return null;
  }

  /**
   * Extract package names from content
   */
  _extractPackageNames(content) {
    const match = content.match(/(?:install|add)\s+([a-zA-Z0-9-_@/\s]+)/i);
    if (match) {
      return match[1].split(/\s+/).filter(pkg => pkg.trim());
    }
    return ['express', 'react', 'react-dom'];
  }

  /**
   * Generate root package.json for full stack projects
   */
  _generateRootPackageJson(projectName) {
    return JSON.stringify({
      name: projectName,
      version: "1.0.0",
      description: "Full stack React + Express application",
      scripts: {
        "dev": "concurrently \"npm run server\" \"npm run client\"",
        "server": "cd server && npm run dev",
        "client": "cd src && npm start",
        "build": "cd src && npm run build",
        "install-all": "npm install && cd server && npm install && cd ../src && npm install"
      },
      devDependencies: {
        "concurrently": "^7.6.0"
      }
    }, null, 2);
  }

  /**
   * Generate frontend package.json
   */
  _generateFrontendPackageJson() {
    return JSON.stringify({
      name: "frontend",
      version: "1.0.0",
      dependencies: {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "react-scripts": "5.0.1"
      },
      scripts: {
        "start": "react-scripts start",
        "build": "react-scripts build",
        "test": "react-scripts test",
        "eject": "react-scripts eject"
      },
      browserslist: {
        production: [">0.2%", "not dead", "not op_mini all"],
        development: ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
      }
    }, null, 2);
  }

  /**
   * Generate backend package.json
   */
  _generateBackendPackageJson() {
    return JSON.stringify({
      name: "backend",
      version: "1.0.0",
      main: "server.js",
      scripts: {
        "start": "node server.js",
        "dev": "nodemon server.js"
      },
      dependencies: {
        "express": "^4.18.2",
        "cors": "^2.8.5",
        "helmet": "^7.0.0"
      },
      devDependencies: {
        "nodemon": "^2.0.22"
      }
    }, null, 2);
  }

  /**
   * Generate React App.jsx
   */
  _generateReactApp() {
    return `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to Your App</h1>
        <p>Created by OllamaGeek</p>
      </header>
    </div>
  );
}

export default App;`;
  }

  /**
   * Generate Express server.js
   */
  _generateExpressServer() {
    return `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to your Express API!' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`;
  }

  /**
   * Generate basic route
   */
  _generateBasicRoute() {
    return `const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'API is working!' });
});

module.exports = router;`;
  }

  /**
   * Generate index.html
   */
  _generateIndexHtml(projectName) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>`;
  }

  /**
   * Generate requirements.txt
   */
  _generateRequirementsTxt() {
    return `flask==2.3.3
pytest==7.4.0
requests==2.31.0`;
  }

  /**
   * Generate Python main.py
   */
  _generatePythonMain() {
    return `#!/usr/bin/env python3
"""
Main application file
Created by OllamaGeek
"""

def main():
    print("Hello from your Python app!")
    print("Created by OllamaGeek")

if __name__ == "__main__":
    main()`;
  }

  /**
   * Generate full stack README
   */
  _generateFullStackReadme(projectName) {
    return `# ${projectName}

A full-stack React + Express application created by **OllamaGeek**!

## Project Structure

\`\`\`
${projectName}/
├── src/           # React frontend
├── server/        # Express backend
└── package.json   # Root dependencies
\`\`\`

## Getting Started

\`\`\`bash
# Install all dependencies
npm run install-all

# Start development servers
npm run dev
\`\`\`

## Features

- ✅ **React Frontend**: Modern React with hooks
- ✅ **Express Backend**: RESTful API server
- ✅ **Full Stack**: Integrated frontend + backend
- ✅ **Development**: Hot reloading for both

Created automatically by OllamaGeek! 🚀`;
  }

  /**
   * Generate backend README
   */
  _generateBackendReadme(projectName) {
    return `# ${projectName}

An Express.js backend API created by **OllamaGeek**!

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## API Endpoints

- \`GET /\` - Welcome message
- \`GET /api/health\` - Health check

## Features

- ✅ **Express.js**: Fast, unopinionated web framework
- ✅ **CORS**: Cross-origin resource sharing
- ✅ **Helmet**: Security headers
- ✅ **Nodemon**: Development auto-reload

Created automatically by OllamaGeek! 🚀`;
  }

  /**
   * Generate frontend README
   */
  _generateFrontendReadme(projectName) {
    return `# ${projectName}

A React frontend application created by **OllamaGeek**!

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\`

## Features

- ✅ **React 18**: Latest React features
- ✅ **Modern JSX**: Clean component syntax
- ✅ **Hot Reloading**: Instant development feedback
- ✅ **Responsive**: Mobile-friendly design

Created automatically by OllamaGeek! 🚀`;
  }

  /**
   * Generate simple Node.js package.json
   */
  _generateSimpleNodePackageJson(projectName) {
    return JSON.stringify({
      name: projectName,
      version: "1.0.0",
      description: "A simple Node.js project",
      main: "src/index.js",
      scripts: {
        "start": "node src/index.js",
        "dev": "nodemon src/index.js",
        "test": "echo \"Error: no test specified\" && exit 1"
      },
      keywords: ["node", "javascript", "ollamageek"],
      author: "OllamaGeek",
      license: "ISC",
      devDependencies: {
        "nodemon": "^2.0.22"
      }
    }, null, 2);
  }

  /**
   * Generate simple Node.js index.js
   */
  _generateSimpleNodeIndex() {
    return `#!/usr/bin/env node

/**
 * Simple Node.js Application
 * Created by OllamaGeek
 */

console.log('🚀 Hello from your Node.js app!');
console.log('✨ Created automatically by OllamaGeek');

// Add your application logic here
function main() {
  console.log('\\n📁 Project structure created successfully!');
  console.log('🔧 Ready for development!');
}

main();`;
  }

  /**
   * Generate simple Node.js README
   */
  _generateSimpleNodeReadme(projectName) {
    return `# ${projectName}

A simple Node.js project created by **OllamaGeek**!

## Project Structure

\`\`\`
${projectName}/
├── src/           # Source code
│   └── index.js   # Main entry point
├── tests/         # Test files
├── package.json   # Dependencies and scripts
└── README.md      # This file
\`\`\`

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Run the application
npm start

# Run in development mode (with auto-reload)
npm run dev
\`\`\`

## Features

- ✅ **Node.js**: Modern JavaScript runtime
- ✅ **Simple Structure**: Clean, organized project layout
- ✅ **Git Ready**: Repository initialized and first commit made
- ✅ **Development Ready**: Nodemon for auto-reload

Created automatically by OllamaGeek! 🚀`;
  }

  /**
   * Generate Python README
   */
  _generatePythonReadme(projectName) {
    return `# ${projectName}

A Python application created by **OllamaGeek**!

## Getting Started

\`\`\`bash
pip install -r requirements.txt
python src/main.py
\`\`\`

## Features

- ✅ **Python 3**: Modern Python syntax
- ✅ **Flask Ready**: Web framework setup
- ✅ **Testing**: Pytest configuration
- ✅ **Clean Structure**: Organized project layout

Created automatically by OllamaGeek! 🚀`;
  }

  /**
   * Extract content from request
   */
  _extractContent(request) {
    if (request.prompt) return request.prompt;
    if (request.messages) {
      const userMessages = request.messages.filter(msg => msg.role === 'user');
      return userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
    }
    return '';
  }

  /**
   * Check if request is for generic file/folder creation
   */
  _isFileCreationRequest(content) {
    const lowerContent = content.toLowerCase();
    return (
      (lowerContent.includes('create') && lowerContent.includes('folder')) ||
      (lowerContent.includes('create') && lowerContent.includes('directory')) ||
      (lowerContent.includes('mkdir') && lowerContent.includes('folder')) ||
      (lowerContent.includes('mkdir') && lowerContent.includes('directory')) ||
      (lowerContent.includes('create') && lowerContent.includes('file')) ||
      (lowerContent.includes('make') && lowerContent.includes('folder')) ||
      (lowerContent.includes('make') && lowerContent.includes('directory'))
    );
  }

  /**
   * Check if request is for generic command execution
   */
  _isCommandExecutionRequest(content) {
    const lowerContent = content.toLowerCase();
    return (
      (lowerContent.includes('run') && lowerContent.includes('command')) ||
      (lowerContent.includes('execute') && lowerContent.includes('command')) ||
      (lowerContent.includes('run') && lowerContent.includes('npm')) ||
      (lowerContent.includes('run') && lowerContent.includes('git')) ||
      (lowerContent.includes('install') && lowerContent.includes('package')) ||
      (lowerContent.includes('install') && lowerContent.includes('dependency'))
    );
  }

  /**
   * Create generic file/folder creation workflow
   */
  _createFileCreationWorkflow(content) {
    const projectName = this._extractProjectName(content) || 'new-project';

    return {
      type: 'file-creation',
      description: `Create files/folders: ${projectName}`,
      steps: [
        {
          description: 'Create project directory',
          action: 'create_directories',
          params: { projectName, structure: ['src'] }
        },
        {
          description: 'Create basic README',
          action: 'create_file',
          params: { path: `${projectName}/README.md`, content: this._generateGenericReadme(projectName), language: 'markdown' }
        }
      ]
    };
  }

  /**
   * Create generic command execution workflow
   */
  _createCommandExecutionWorkflow(content) {
    return {
      type: 'command-execution',
      description: 'Execute requested commands',
      steps: [
        {
          description: 'Execute commands',
          action: 'run_terminal',
          params: { command: this._extractCommands(content), cwd: process.cwd() }
        }
      ]
    };
  }

  /**
   * Generate generic README
   */
  _generateGenericReadme(projectName) {
    return `# ${projectName}

A project created by **OllamaGeek**!

## Getting Started

This project was created automatically based on your request.

## Features

- ✅ **Auto-generated**: Created by OllamaGeek
- ✅ **Ready to use**: Basic structure in place
- ✅ **Customizable**: Modify as needed

Created automatically by OllamaGeek! 🚀`;
  }

    /**
   * Extract commands from content
   */
  _extractCommands(content) {
    // Simple command extraction - could be enhanced with AI
    const commands = [];
    
    if (content.toLowerCase().includes('npm install')) {
      commands.push('npm install');
    }
    if (content.includes('git init')) {
      commands.push('git init');
    }
    if (content.toLowerCase().includes('npm start')) {
      commands.push('npm start');
    }
    
    return commands.join(' && ');
  }

  /**
   * Check if request is for AI code analysis
   */
  _isAIAnalysisRequest(content) {
    const lowerContent = content.toLowerCase();
    return (
      (lowerContent.includes('analyze') && lowerContent.includes('code')) ||
      (lowerContent.includes('code') && lowerContent.includes('quality')) ||
      (lowerContent.includes('review') && lowerContent.includes('code')) ||
      (lowerContent.includes('check') && lowerContent.includes('code')) ||
      (lowerContent.includes('inspect') && lowerContent.includes('code'))
    );
  }

  /**
   * Check if request is for AI code refactoring
   */
  _isAIRefactoringRequest(content) {
    const lowerContent = content.toLowerCase();
    return (
      (lowerContent.includes('refactor') && lowerContent.includes('code')) ||
      (lowerContent.includes('improve') && lowerContent.includes('code')) ||
      (lowerContent.includes('optimize') && lowerContent.includes('code')) ||
      (lowerContent.includes('clean') && lowerContent.includes('code')) ||
      (lowerContent.includes('restructure') && lowerContent.includes('code'))
    );
  }

  /**
   * Check if request is for AI test generation
   */
  _isAITestGenerationRequest(content) {
    const lowerContent = content.toLowerCase();
    return (
      (lowerContent.includes('generate') && lowerContent.includes('test')) ||
      (lowerContent.includes('create') && lowerContent.includes('test')) ||
      (lowerContent.includes('write') && lowerContent.includes('test')) ||
      (lowerContent.includes('test') && lowerContent.includes('coverage')) ||
      (lowerContent.includes('unit') && lowerContent.includes('test'))
    );
  }

  /**
   * Check if request is for AI debugging
   */
  _isAIDebuggingRequest(content) {
    const lowerContent = content.toLowerCase();
    return (
      (lowerContent.includes('debug') && lowerContent.includes('code')) ||
      (lowerContent.includes('fix') && lowerContent.includes('bug')) ||
      (lowerContent.includes('error') && lowerContent.includes('code')) ||
      (lowerContent.includes('troubleshoot') && lowerContent.includes('code')) ||
      (lowerContent.includes('issue') && lowerContent.includes('code'))
    );
  }

  /**
   * Create AI code analysis workflow
   */
  _createAIAnalysisWorkflow(content) {
    const filePath = this._extractFilePath(content) || 'current file';
    
    return {
      type: 'ai-code-analysis',
      description: `AI-powered code analysis for: ${filePath}`,
      steps: [
        {
          description: 'Analyze code quality and identify issues',
          action: 'ai_analyze',
          params: { filePath, options: { focus: 'comprehensive' } }
        }
      ]
    };
  }

  /**
   * Create AI code refactoring workflow
   */
  _createAIRefactoringWorkflow(content) {
    const filePath = this._extractFilePath(content) || 'current file';
    const refactoringType = this._extractRefactoringType(content) || 'quality';
    
    return {
      type: 'ai-code-refactoring',
      description: `AI-powered code refactoring for: ${filePath}`,
      steps: [
        {
          description: 'Refactor code for better quality and maintainability',
          action: 'ai_refactor',
          params: { filePath, refactoringType, options: { focus: 'quality' } }
        }
      ]
    };
  }

  /**
   * Create AI test generation workflow
   */
  _createAITestGenerationWorkflow(content) {
    const filePath = this._extractFilePath(content) || 'current file';
    const testFramework = this._extractTestFramework(content) || 'auto';
    
    return {
      type: 'ai-test-generation',
      description: `AI-powered test generation for: ${filePath}`,
      steps: [
        {
          description: 'Generate comprehensive tests',
          action: 'ai_generate_tests',
          params: { filePath, testFramework, options: { coverage: 'comprehensive' } }
        }
      ]
    };
  }

  /**
   * Create AI debugging workflow
   */
  _createAIDebuggingWorkflow(content) {
    const filePath = this._extractFilePath(content) || 'current file';
    
    return {
      type: 'ai-debugging',
      description: `AI-powered debugging for: ${filePath}`,
      steps: [
        {
          description: 'Debug code and provide solutions',
          action: 'ai_debug',
          params: { filePath, options: { provideSolutions: true } }
        }
      ]
    };
  }

  /**
   * Extract file path from content
   */
  _extractFilePath(content) {
    // Look for file paths in quotes or after keywords
    const fileMatch = content.match(/(?:file|analyze|refactor|test|debug)\s+(?:the\s+)?["']?([^"'\s]+\.(?:js|jsx|ts|tsx|py|java|cpp|c|go|rs|php|rb|swift|kt|scala))["']?/i);
    if (fileMatch) {
      return fileMatch[1];
    }
    
    // Look for common file patterns
    const patternMatch = content.match(/([a-zA-Z0-9_\-\.\/]+\.(?:js|jsx|ts|tsx|py|java|cpp|c|go|rs|php|rb|swift|kt|scala))/);
    if (patternMatch) {
      return patternMatch[1];
    }
    
    return null;
  }

  /**
   * Extract refactoring type from content
   */
  _extractRefactoringType(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('performance')) return 'performance';
    if (lowerContent.includes('readability')) return 'readability';
    if (lowerContent.includes('maintainability')) return 'maintainability';
    if (lowerContent.includes('security')) return 'security';
    if (lowerContent.includes('clean')) return 'clean';
    if (lowerContent.includes('modern')) return 'modern';
    
    return 'quality';
  }

  /**
   * Extract test framework from content
   */
  _extractTestFramework(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('jest')) return 'jest';
    if (lowerContent.includes('mocha')) return 'mocha';
    if (lowerContent.includes('pytest')) return 'pytest';
    if (lowerContent.includes('junit')) return 'junit';
    if (lowerContent.includes('gtest')) return 'gtest';
    if (lowerContent.includes('testing')) return 'testing';
    
    return 'auto';
  }

  /**
   * Run AI code analysis
   */
  async _runAIAnalysis(params) {
    try {
      const { AICodeAnalyzer } = require('./aiCodeAnalyzer');
      const aiAnalyzer = new AICodeAnalyzer();
      
      const result = await aiAnalyzer.analyzeCode(params.filePath, params.options);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Run AI code refactoring
   */
  async _runAIRefactoring(params) {
    try {
      const { AICodeAnalyzer } = require('./aiCodeAnalyzer');
      const aiAnalyzer = new AICodeAnalyzer();
      
      const result = await aiAnalyzer.refactorCode(params.filePath, params.refactoringType, params.options);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Run AI test generation
   */
  async _runAITestGeneration(params) {
    try {
      const { AICodeAnalyzer } = require('./aiCodeAnalyzer');
      const aiAnalyzer = new AICodeAnalyzer();
      
      const result = await aiAnalyzer.generateTests(params.filePath, params.testFramework, params.options);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Run AI debugging
   */
  async _runAIDebugging(params) {
    try {
      const { AICodeAnalyzer } = require('./aiCodeAnalyzer');
      const aiAnalyzer = new AICodeAnalyzer();
      
      const result = await aiAnalyzer.debugCode(params.filePath, params.errorContext, params.options);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = { AgenticWorkflowExecutor };
