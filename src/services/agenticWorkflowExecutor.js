const path = require('path');

class AgenticWorkflowExecutor {
  constructor() {
    this.workflowCache = new Map();
  }

  /**
   * Plan tools for a request using Ollama's intelligence
   */
  async planTools(request, context) {
    console.log('🧠 Tool Planning Analysis:', request);

    const content = this._extractContent(request);

    // Use Ollama to understand what tools are needed
    const toolPlan = await this._getToolPlanFromOllama(content, context);

    if (!toolPlan) {
      console.log('❌ No tool plan generated, falling back to basic tool suggestions');
      return this._getBasicToolSuggestions(content);
    }

    console.log(`🎯 Tool plan generated: ${toolPlan.tools.length} tools needed`);
    console.log(`📋 Plan description: ${toolPlan.description}`);

    return toolPlan;
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

    // Arduino Project
    if (this._isArduinoProject(content)) {
      return this._createArduinoWorkflow(content);
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
      (lowerContent.includes('fullstack') && lowerContent.includes('project')) ||
      // Enhanced detection for basic applications
      (lowerContent.includes('basic') && lowerContent.includes('application') && lowerContent.includes('node') && lowerContent.includes('express') && lowerContent.includes('react')) ||
      (lowerContent.includes('create') && lowerContent.includes('basic') && lowerContent.includes('application') && lowerContent.includes('using') && lowerContent.includes('node') && lowerContent.includes('express') && lowerContent.includes('react'))
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
   * Check if request is for an Arduino project
   */
  _isArduinoProject(content) {
    const lowerContent = content.toLowerCase();
    return (
      lowerContent.includes('arduino') ||
      (lowerContent.includes('led') && lowerContent.includes('flash')) ||
      (lowerContent.includes('onboard') && lowerContent.includes('led')) ||
      (lowerContent.includes('basic') && lowerContent.includes('arduino')) ||
      (lowerContent.includes('create') && lowerContent.includes('arduino'))
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

  // Execution methods removed - this is now a planning-only class

  // Directory creation methods removed - this is now a planning-only class

  /**
   * Extract project name from content
   */
  _extractProjectName(content) {
    // Enhanced project name extraction with better context understanding
    console.log(`🔍 Extracting project name from: "${content}"`);

    // Look for "called" pattern first (most reliable)
    const calledMatch = content.match(/called\s+([a-zA-Z0-9-_]+)/i);
    if (calledMatch) {
      const projectName = calledMatch[1];
      console.log(`🎯 Extracted project name from "called": ${projectName}`);
      return projectName;
    }

    // Look for "in a [name] folder" pattern
    const inFolderMatch = content.match(/in\s+a\s+([a-zA-Z0-9-_]+)\s+folder/i);
    if (inFolderMatch) {
      const projectName = inFolderMatch[1];
      console.log(`🎯 Extracted project name from "in a [name] folder": ${projectName}`);
      return projectName;
    }

    // Look for "in [name] folder" pattern
    const inNameFolderMatch = content.match(/in\s+([a-zA-Z0-9-_]+)\s+folder/i);
    if (inNameFolderMatch) {
      const projectName = inNameFolderMatch[1];
      console.log(`🎯 Extracted project name from "in [name] folder": ${projectName}`);
      return projectName;
    }

    // Look for "create [name]" pattern
    const createMatch = content.match(/create\s+(?:a\s+)?([a-zA-Z0-9-_]+)/i);
    if (createMatch) {
      const projectName = createMatch[1];
      // Skip common words and prepositions
      if (!['basic', 'node', 'express', 'react', 'application', 'app', 'project', 'using', 'in', 'a', 'an', 'the', 'new', 'full', 'stack', 'create', 'make', 'generate'].includes(projectName.toLowerCase())) {
        console.log(`🎯 Extracted project name from "create [name]": ${projectName}`);
        return projectName;
      }
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
      // Skip common words and prepositions
      if (!['a', 'an', 'the', 'new', 'full', 'stack', 'create', 'make', 'generate', 'basic', 'node', 'express', 'react', 'using', 'in'].includes(projectName.toLowerCase())) {
        console.log(`🎯 Extracted project name from name + project: ${projectName}`);
        return projectName;
      }
    }

    // Look for folder name at the end of the sentence
    const endFolderMatch = content.match(/([a-zA-Z0-9-_]+)\s+folder\s*$/i);
    if (endFolderMatch) {
      const projectName = endFolderMatch[1];
      console.log(`🎯 Extracted project name from end folder: ${projectName}`);
      return projectName;
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
   * Get tool plan from Ollama using its intelligence
   */
  async _getToolPlanFromOllama(content, context) {
    try {
      const axios = require('axios');

      // Create a prompt for Ollama to understand what tools are needed
      const planningPrompt = `Analyze this request and determine what tools Continue should execute:

Request: "${content}"

Available tools:
- create_file: Create new files with content (requires: name/path, content)
- create_directory: Create new directories (requires: path)
- edit_file: Modify existing files (requires: path, content)
- delete_file: Remove files (requires: path)
- run_terminal: Execute terminal commands (requires: command)
- git_operation: Perform git operations (requires: operation, path)
- search_files: Search file content (requires: query)

CRITICAL WORKSPACE RULES:
1. If the request specifies a folder/directory name (like "in mathGeek" or "in a folder named X"), ALL project files MUST be created INSIDE that folder
2. NEVER create package.json, package-lock.json, or other project files in the root workspace
3. Use relative paths like "folderName/package.json" not just "package.json"
4. Respect the specified folder structure completely

COMPLETE APP SCAFFOLDING REQUIREMENTS:
For ANY application creation request, you MUST include these essential steps:

**Node.js/Express Apps:**
- create_directory for the project folder
- create_file for package.json with ALL dependencies
- create_file for main server file (index.js/app.js)
- create_file for any additional source files
- run_terminal for "npm install" to install dependencies
- run_terminal for "npm start" or "node filename.js" to run

**Python/Flask Apps:**
- create_directory for the project folder
- create_file for requirements.txt with ALL dependencies
- create_file for main app file (app.py/main.py)
- create_file for any additional source files
- run_terminal for "pip install -r requirements.txt"
- run_terminal for "python app.py" to run

**Ruby on Rails Apps:**
- create_directory for the project folder
- create_file for Gemfile with ALL dependencies
- create_file for main app files
- run_terminal for "bundle install"
- run_terminal for "rails server" to run

**Perl Scripts:**
- create_directory for the project folder
- create_file for the main Perl script
- create_file for any additional modules
- run_terminal for "perl script.pl" to run

**General Rules:**
- ALWAYS create the project directory first
- ALWAYS include dependency management files
- ALWAYS include installation commands
- ALWAYS include run commands
- NEVER skip essential scaffolding steps

IMPORTANT: You MUST provide ALL required parameters for each tool. For file creation, extract the filename and content from the request.

Respond with a JSON plan:
{
  "description": "Brief description of what needs to be done",
  "tools": [
    {
      "tool": "tool_name",
      "description": "What this tool should do",
      "parameters": {
        "name": "filename.txt",
        "content": "file content here"
      }
    }
  ],
  "context": "Additional context for Continue"
}`;

      const response = await axios.post('http://localhost:11434/api/generate', {
        model: 'codellama:13b-instruct-q4_K_M',
        prompt: planningPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      });

      const planText = response.data.response;

      try {
        // Try to parse the JSON response
        const plan = JSON.parse(planText);
        return plan;
      } catch (parseError) {
        console.log('⚠️ Failed to parse Ollama response as JSON, using fallback');
        return this._getFallbackToolPlan(content);
      }

    } catch (error) {
      console.error('❌ Error getting tool plan from Ollama:', error.message);
      return null;
    }
  }

  /**
   * Get fallback tool plan when Ollama fails
   */
  _getFallbackToolPlan(content) {
    const lowerContent = content.toLowerCase();

        // Node.js app creation fallback
        if (lowerContent.includes('node') && (lowerContent.includes('app') || lowerContent.includes('application'))) {
          // Try to extract the folder name from the request
          let dirName = this._extractFolderName(content);

          // Fallback to default names if no folder name found
          if (!dirName) {
            dirName = lowerContent.includes('nodegeek') ? 'nodeGeek' : 'nodeApp';
          }

          return {
            description: `Create a complete Node.js application in ${dirName} directory`,
            tools: [
              {
                tool: "create_directory",
                description: `Create ${dirName} directory`,
                parameters: { path: dirName }
              },
              {
                tool: "create_file",
                description: `Create package.json for Node.js app`,
                parameters: {
                  path: `${dirName}/package.json`,
                  content: `{\n  "name": "${dirName}",\n  "version": "1.0.0",\n  "description": "Node.js application created by OllamaGeek",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js",\n    "dev": "node index.js"\n  },\n  "dependencies": {}\n}`
                }
              },
              {
                tool: "create_file",
                description: `Create main index.js file`,
                parameters: {
                  path: `${dirName}/index.js`,
                  content: `// Node.js application created by OllamaGeek\nconsole.log('Hello, World!');\n\n// Your Node.js app code goes here\n`
                }
              },
              {
                tool: "create_file",
                description: `Create README.md`,
                parameters: {
                  path: `${dirName}/README.md`,
                  content: `# ${dirName}\n\nNode.js application created by OllamaGeek.\n\n## Run\n\`\`\`bash\nnpm start\n\`\`\`\n\n## Development\n\`\`\`bash\nnpm run dev\n\`\`\``
                }
              },
              {
                tool: "run_terminal",
                description: `Install dependencies`,
                parameters: { command: `cd ${dirName} && npm install` }
              },
              {
                tool: "run_terminal",
                description: `Start the application`,
                parameters: { command: `cd ${dirName} && npm start` }
              }
            ],
            context: `Creating a complete Node.js application structure in ${dirName} directory with dependencies and run commands`
          };
        }

        // Python/Flask app creation fallback
        if (lowerContent.includes('python') || lowerContent.includes('flask') || lowerContent.includes('django')) {
          let dirName = this._extractFolderName(content);
          if (!dirName) {
            dirName = lowerContent.includes('flask') ? 'flaskApp' : 'pythonApp';
          }

          return {
            description: `Create a complete Python application in ${dirName} directory`,
            tools: [
              {
                tool: "create_directory",
                description: `Create ${dirName} directory`,
                parameters: { path: dirName }
              },
              {
                tool: "create_file",
                description: `Create requirements.txt with dependencies`,
                parameters: {
                  path: `${dirName}/requirements.txt`,
                  content: `flask==2.3.3\npython-dotenv==1.0.0\n`
                }
              },
              {
                tool: "create_file",
                description: `Create main app.py file`,
                parameters: {
                  path: `${dirName}/app.py`,
                  content: `from flask import Flask, render_template, request\n\napp = Flask(__name__)\n\n@app.route('/')\ndef home():\n    return "Hello from Flask!"\n\nif __name__ == '__main__':\n    app.run(debug=True)\n`
                }
              },
              {
                tool: "run_terminal",
                description: `Install Python dependencies`,
                parameters: { command: `cd ${dirName} && pip install -r requirements.txt` }
              },
              {
                tool: "run_terminal",
                description: `Start the Flask application`,
                parameters: { command: `cd ${dirName} && python app.py` }
              }
            ],
            context: `Creating a complete Python Flask application in ${dirName} directory`
          };
        }

        // Ruby on Rails app creation fallback
        if (lowerContent.includes('ruby') || lowerContent.includes('rails')) {
          let dirName = this._extractFolderName(content);
          if (!dirName) {
            dirName = 'railsApp';
          }

          return {
            description: `Create a complete Ruby on Rails application in ${dirName} directory`,
            tools: [
              {
                tool: "create_directory",
                description: `Create ${dirName} directory`,
                parameters: { path: dirName }
              },
              {
                tool: "create_file",
                description: `Create Gemfile with dependencies`,
                parameters: {
                  path: `${dirName}/Gemfile`,
                  content: `source 'https://rubygems.org'\n\ngem 'rails', '~> 7.0.0'\ngem 'sqlite3'\ngem 'puma'\ngem 'bootsnap'\n`
                }
              },
              {
                tool: "run_terminal",
                description: `Install Ruby gems`,
                parameters: { command: `cd ${dirName} && bundle install` }
              },
              {
                tool: "run_terminal",
                description: `Start the Rails server`,
                parameters: { command: `cd ${dirName} && rails server` }
              }
            ],
            context: `Creating a complete Ruby on Rails application in ${dirName} directory`
          };
        }

        // Perl script creation fallback
        if (lowerContent.includes('perl')) {
          let dirName = this._extractFolderName(content);
          if (!dirName) {
            dirName = 'perlScript';
          }

          return {
            description: `Create a complete Perl script in ${dirName} directory`,
            tools: [
              {
                tool: "create_directory",
                description: `Create ${dirName} directory`,
                parameters: { path: dirName }
              },
              {
                tool: "create_file",
                description: `Create main Perl script`,
                parameters: {
                  path: `${dirName}/script.pl`,
                  content: `#!/usr/bin/env perl\nuse strict;\nuse warnings;\n\nprint "Hello from Perl!\\n";\n\n# Your Perl code goes here\n`
                }
              },
              {
                tool: "run_terminal",
                description: `Make script executable and run`,
                parameters: { command: `cd ${dirName} && chmod +x script.pl && perl script.pl` }
              }
            ],
            context: `Creating a complete Perl script in ${dirName} directory`
          };
        }

        // File creation fallback
        if (lowerContent.includes('file') || lowerContent.includes('create') || lowerContent.includes('make') || lowerContent.includes('new')) {
          // Extract filename from the request
          const filenameMatch = content.match(/(?:called|named?|create|make|new)\s+(?:a\s+)?(?:file\s+)?(?:called\s+)?([a-zA-Z0-9._-]+)/i);
          const filename = filenameMatch ? filenameMatch[1] : 'newfile.txt';

          return {
            description: `Create a new file called ${filename}`,
            tools: [
              {
                tool: "create_file",
                description: `Create a new file called ${filename}`,
                parameters: {
                  name: filename,
                  content: `// File created by OllamaGeek\n// ${filename}\n\n`
                }
              }
            ],
            context: `Creating a new file: ${filename}`
          };
        }

    // Arduino fallback
    if (lowerContent.includes('arduino') || lowerContent.includes('led') || lowerContent.includes('flash')) {
      return {
        description: "Create Arduino project with LED blinking code",
        tools: [
          {
            tool: "create_directory",
            description: "Create project directory",
            parameters: { path: "blinkGeek" }
          },
          {
            tool: "create_file",
            description: "Create Arduino sketch file",
            parameters: { path: "blinkGeek/blink.ino", content: "// Arduino LED Blink Sketch\n\nvoid setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(1000);\n}" }
          },
          {
            tool: "create_file",
            description: "Create README file",
            parameters: { path: "blinkGeek/README.md", content: "# BlinkGeek Arduino Project\n\nSimple LED blinking project for Arduino.\n\n## Setup\n1. Connect Arduino board\n2. Upload blink.ino\n3. Watch onboard LED blink!" }
          }
        ],
        context: "This is an Arduino project that will blink the onboard LED"
      };
    }

    // Default fallback
    return {
      description: "Basic file creation",
      tools: [
        {
          tool: "create_directory",
          description: "Create project directory",
          parameters: { path: "project" }
        }
      ],
      context: "Basic project setup"
    };
  }

  /**
   * Get basic tool suggestions when planning fails
   */
  _getBasicToolSuggestions(content) {
    return {
      description: "Basic tool suggestions",
      tools: [
        {
          tool: "create_file",
          description: "Create a file",
          parameters: { path: "example.txt", content: "Example content" }
        }
      ],
      context: "Basic file creation"
    };
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

  // AI execution methods removed - this is now a planning-only class

  /**
   * Extract folder name from content
   */
  _extractFolderName(content) {
    const lowerContent = content.toLowerCase();

    // Look for "in [name]" pattern (most common)
    const inNameMatch = lowerContent.match(/in\s+([a-zA-Z0-9-_]+)/i);
    if (inNameMatch) {
      return inNameMatch[1];
    }

    // Look for "in a folder named [name]" pattern specifically
    const inFolderNamedMatch = lowerContent.match(/in\s+a\s+folder\s+named\s+([a-zA-Z0-9-_]+)/i);
    if (inFolderNamedMatch) {
      return inFolderNamedMatch[1];
    }

    // Look for "in folder named [name]" pattern
    const inFolderNamedMatch2 = lowerContent.match(/in\s+folder\s+named\s+([a-zA-Z0-9-_]+)/i);
    if (inFolderNamedMatch2) {
      return inFolderNamedMatch2[1];
    }

    // Look for "in a folder called [name]" pattern
    const inFolderCalledMatch = lowerContent.match(/in\s+a\s+folder\s+called\s+([a-zA-Z0-9-_]+)/i);
    if (inFolderCalledMatch) {
      return inFolderCalledMatch[1];
    }

    // Look for "in folder called [name]" pattern
    const inFolderCalledMatch2 = lowerContent.match(/in\s+folder\s+called\s+([a-zA-Z0-9-_]+)/i);
    if (inFolderCalledMatch2) {
      return inFolderCalledMatch2[1];
    }

    // Look for "folder named [name]" pattern
    const folderNamedMatch = lowerContent.match(/folder\s+named\s+([a-zA-Z0-9-_]+)/i);
    if (folderNamedMatch) {
      return folderNamedMatch[1];
    }

    // Look for "folder called [name]" pattern
    const folderCalledMatch = lowerContent.match(/folder\s+called\s+([a-zA-Z0-9-_]+)/i);
    if (folderCalledMatch) {
      return folderCalledMatch[1];
    }

    return null;
  }
}

module.exports = { AgenticWorkflowExecutor };
