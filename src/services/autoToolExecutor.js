const { ToolExecutor } = require('./toolExecutor');

class AutoToolExecutor extends ToolExecutor {
  constructor() {
    super();
    this.executionHistory = [];
  }

  /**
   * Automatically execute tools based on request analysis
   */
  async autoExecuteTools(requestBody, toolAnalysis, context) {
    const results = [];
    
    for (const tool of toolAnalysis.tools) {
      try {
        // Generate parameters based on the request content
        const parameters = await this._generateToolParameters(tool, requestBody, context);
        
        // Execute the tool
        const result = await this.executeTool(tool.name, parameters, context);
        
        results.push({
          tool: tool.name,
          parameters,
          result,
          success: result.success
        });
        
        // Log the execution
        this.executionHistory.push({
          timestamp: new Date(),
          tool: tool.name,
          parameters,
          result,
          request: requestBody
        });
        
      } catch (error) {
        results.push({
          tool: tool.name,
          error: error.message,
          success: false
        });
      }
    }
    
    return results;
  }

  /**
   * Generate tool parameters based on request content
   */
  async _generateToolParameters(tool, requestBody, context) {
    const content = this._extractContent(requestBody);
    
    switch (tool.name) {
      case 'create_file':
        return this._generateCreateFileParams(content, context);
      
      case 'edit_file':
        return this._generateEditFileParams(content, context);
      
      case 'run_terminal':
        return this._generateTerminalParams(content, context);
      
      case 'git_operation':
        return this._generateGitParams(content, context);
      
      default:
        return {};
    }
  }

  /**
   * Generate parameters for file creation
   */
  _generateCreateFileParams(content, context) {
    // Extract file path from content
    const pathMatch = content.match(/(?:create|make|generate|add)\s+(?:a\s+)?(?:new\s+)?(?:file|component|class|function)\s+(?:called\s+)?([^\s]+)/i);
    const filePath = pathMatch ? pathMatch[1] : this._suggestFilePath(content);
    
    // Extract language from file extension or content
    const language = this._detectLanguage(filePath, content);
    
    // Generate content based on the request
    const fileContent = this._generateFileContent(content, language, context);
    
    return {
      path: filePath,
      content: fileContent,
      language: language
    };
  }

  /**
   * Generate parameters for file editing
   */
  _generateEditFileParams(content, context) {
    // Extract file path from content
    const pathMatch = content.match(/(?:edit|modify|change|update|fix)\s+(?:the\s+)?(?:file|code|function|class)\s+([^\s]+)/i);
    const filePath = pathMatch ? pathMatch[1] : this._suggestFilePath(content);
    
    // Determine what changes to make
    const changes = this._determineChanges(content);
    
    return {
      path: filePath,
      changes: changes,
      language: this._detectLanguage(filePath, content)
    };
  }

  /**
   * Generate parameters for terminal commands
   */
  _generateTerminalParams(content, context) {
    // Extract command from content
    const commandMatch = content.match(/(?:run|execute|install|build)\s+(?:the\s+)?(?:command|script|test|package|dependency)\s+([^\s]+)/i);
    const command = commandMatch ? commandMatch[1] : this._suggestCommand(content);
    
    return {
      command: command,
      cwd: process.cwd()
    };
  }

  /**
   * Generate parameters for git operations
   */
  _generateGitParams(content, context) {
    // Extract git operation from content
    const gitMatch = content.match(/(?:commit|push|create|merge)\s+(?:the\s+)?(?:changes|files|branch|tag)\s*([^\s]*)/i);
    const operation = this._determineGitOperation(content);
    const args = this._determineGitArgs(content);
    
    return {
      operation: operation,
      args: args
    };
  }

  /**
   * Suggest a file path based on content
   */
  _suggestFilePath(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('component') || lowerContent.includes('react')) {
      return 'components/NewComponent.jsx';
    }
    
    if (lowerContent.includes('function') || lowerContent.includes('utility')) {
      return 'utils/helper.js';
    }
    
    if (lowerContent.includes('class') || lowerContent.includes('model')) {
      return 'models/NewModel.js';
    }
    
    if (lowerContent.includes('service') || lowerContent.includes('api')) {
      return 'services/NewService.js';
    }
    
    return 'new-file.txt';
  }

  /**
   * Detect language from file path or content
   */
  _detectLanguage(filePath, content) {
    if (filePath) {
      if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) return 'javascript';
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) return 'typescript';
      if (filePath.endsWith('.py')) return 'python';
      if (filePath.endsWith('.html')) return 'html';
      if (filePath.endsWith('.css')) return 'css';
      if (filePath.endsWith('.md')) return 'markdown';
    }
    
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('react') || lowerContent.includes('jsx')) return 'jsx';
    if (lowerContent.includes('typescript') || lowerContent.includes('ts')) return 'typescript';
    if (lowerContent.includes('python')) return 'python';
    
    return 'javascript';
  }

  /**
   * Generate file content based on request
   */
  _generateFileContent(content, language, context) {
    const lowerContent = content.toLowerCase();
    
    switch (language) {
      case 'jsx':
        return this._generateReactComponent(content);
      
      case 'javascript':
        return this._generateJavaScriptFile(content);
      
      case 'typescript':
        return this._generateTypeScriptFile(content);
      
      case 'python':
        return this._generatePythonFile(content);
      
      case 'html':
        return this._generateHTMLFile(content);
      
      case 'css':
        return this._generateCSSFile(content);
      
      case 'markdown':
        return this._generateMarkdownFile(content);
      
      default:
        return `// Generated ${language} file\n// ${content}`;
    }
  }

  /**
   * Generate React component content
   */
  _generateReactComponent(content) {
    const componentName = this._extractComponentName(content) || 'NewComponent';
    
    return `import React from 'react';

const ${componentName} = () => {
  return (
    <div>
      <h1>${componentName}</h1>
      <p>Generated component for: ${content}</p>
    </div>
  );
};

export default ${componentName};`;
  }

  /**
   * Generate JavaScript file content
   */
  _generateJavaScriptFile(content) {
    const functionName = this._extractFunctionName(content) || 'newFunction';
    
    return `// Generated JavaScript file
// ${content}

function ${functionName}() {
  // TODO: Implement function logic
  console.log('${functionName} called');
}

module.exports = {
  ${functionName}
};`;
  }

  /**
   * Generate TypeScript file content
   */
  _generateTypeScriptFile(content) {
    const className = this._extractClassName(content) || 'NewClass';
    
    return `// Generated TypeScript file
// ${content}

export class ${className} {
  constructor() {
    // TODO: Initialize class
  }
  
  // TODO: Add methods
}

export default ${className};`;
  }

  /**
   * Generate Python file content
   */
  _generatePythonFile(content) {
    const functionName = this._extractFunctionName(content) || 'new_function';
    
    return `# Generated Python file
# ${content}

def ${functionName}():
    """
    TODO: Implement function logic
    """
    print("${functionName} called")
    pass

if __name__ == "__main__":
    ${functionName}()`;
  }

  /**
   * Generate HTML file content
   */
  _generateHTMLFile(content) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Page</title>
</head>
<body>
    <h1>Generated HTML Page</h1>
    <p>Generated for: ${content}</p>
    <div id="app">
        <!-- TODO: Add content -->
    </div>
</body>
</html>`;
  }

  /**
   * Generate CSS file content
   */
  _generateCSSFile(content) {
    return `/* Generated CSS file */
/* ${content} */

body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
}

h1 {
    color: #333;
}

/* TODO: Add more styles */`;
  }

  /**
   * Generate Markdown file content
   */
  _generateMarkdownFile(content) {
    return `# Generated Markdown File

Generated for: ${content}

## TODO

- [ ] Add content
- [ ] Format properly
- [ ] Include examples

## Notes

This file was automatically generated by OllamaGeek.`;
  }

  /**
   * Extract component name from content
   */
  _extractComponentName(content) {
    const match = content.match(/(?:component|class)\s+(?:called\s+)?([A-Z][a-zA-Z]*)/i);
    return match ? match[1] : null;
  }

  /**
   * Extract function name from content
   */
  _extractFunctionName(content) {
    const match = content.match(/(?:function|function)\s+(?:called\s+)?([a-z][a-zA-Z]*)/i);
    return match ? match[1] : null;
  }

  /**
   * Extract class name from content
   */
  _extractClassName(content) {
    const match = content.match(/(?:class|class)\s+(?:called\s+)?([A-Z][a-zA-Z]*)/i);
    return match ? match[1] : null;
  }

  /**
   * Determine what changes to make
   */
  _determineChanges(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('add') || lowerContent.includes('append')) {
      return { append: '// TODO: Add new content' };
    }
    
    if (lowerContent.includes('replace') || lowerContent.includes('change')) {
      return { replace: { pattern: 'TODO', replacement: 'DONE' } };
    }
    
    return { append: '// TODO: Implement changes' };
  }

  /**
   * Determine git operation
   */
  _determineGitOperation(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('commit')) return 'commit';
    if (lowerContent.includes('push')) return 'push';
    if (lowerContent.includes('create') && lowerContent.includes('branch')) return 'checkout';
    if (lowerContent.includes('merge')) return 'merge';
    
    return 'status';
  }

  /**
   * Determine git arguments
   */
  _determineGitArgs(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('commit')) return ['-m', 'Auto-commit by OllamaGeek'];
    if (lowerContent.includes('create') && lowerContent.includes('branch')) return ['-b', 'new-branch'];
    
    return [];
  }

  /**
   * Suggest command based on content
   */
  _suggestCommand(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('install') || lowerContent.includes('dependency')) {
      return 'npm install';
    }
    
    if (lowerContent.includes('build')) {
      return 'npm run build';
    }
    
    if (lowerContent.includes('test')) {
      return 'npm test';
    }
    
    if (lowerContent.includes('start')) {
      return 'npm start';
    }
    
    return 'echo "Command executed"';
  }

  /**
   * Extract content from request body
   */
  _extractContent(requestBody) {
    if (requestBody.prompt) return requestBody.prompt;
    if (requestBody.messages) {
      const userMessages = requestBody.messages.filter(msg => msg.role === 'user');
      return userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
    }
    return '';
  }

  /**
   * Get execution history
   */
  getExecutionHistory() {
    return this.executionHistory;
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory() {
    this.executionHistory = [];
  }
}

module.exports = { AutoToolExecutor };
