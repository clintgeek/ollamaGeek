const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class ToolExecutor {
  constructor() {
    this.safePaths = [
      process.cwd(), // Current working directory
      path.resolve(process.cwd(), 'src'),
      path.resolve(process.cwd(), 'components'),
      path.resolve(process.cwd(), 'pages'),
      path.resolve(process.cwd(), 'utils'),
      path.resolve(process.cwd(), 'services'),
      path.resolve(process.cwd(), '..'), // Allow parent directory access
      path.resolve(process.cwd(), '../..'), // Allow grandparent directory access
      path.resolve(process.cwd(), '../../..') // Allow great-grandparent directory access
    ];

    this.unsafePatterns = [
      /\.\.\//, // Path traversal
      /\/etc\//, // System directories
      /\/usr\//,
      /\/var\//,
      /\/tmp\//,
      /\/home\//,
      /\/root\//
    ];
  }

  /**
   * Execute a tool based on the request
   */
  async executeTool(toolName, parameters, context) {
    try {
      switch (toolName) {
        case 'create_file':
          return await this.createFile(parameters.path, parameters.content, parameters.language);

        case 'edit_file':
          return await this.editFile(parameters.path, parameters.changes, parameters.language);

        case 'delete_file':
          return await this.deleteFile(parameters.path);

        case 'run_terminal':
          return await this.runTerminal(parameters.command, parameters.cwd);

        case 'git_operation':
          return await this.gitOperation(parameters.operation, parameters.args);

        case 'search_files':
          return await this.searchFiles(parameters.query, parameters.pattern);

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        tool: toolName,
        parameters
      };
    }
  }

  /**
   * Create a new file
   */
  async createFile(filePath, content, language = 'text') {
    // For project creation, create files in the parent directory
    let targetPath = filePath;
    if (filePath.includes('/') && !path.isAbsolute(filePath)) {
      // This is a relative path like "projectName/filename" - create in parent directory
      const parentDir = path.resolve(process.cwd(), '..');
      targetPath = path.join(parentDir, filePath);
    }

    const safePath = this._validatePath(targetPath);

    // Ensure directory exists
    const dir = path.dirname(safePath);
    await fs.mkdir(dir, { recursive: true });

    // Add language-specific formatting
    const formattedContent = this._formatContent(content, language);

    // Write the file
    await fs.writeFile(safePath, formattedContent, 'utf8');

    return {
      success: true,
      action: 'created',
      path: safePath,
      size: formattedContent.length,
      language
    };
  }

  /**
   * Edit an existing file
   */
  async editFile(filePath, changes, language = 'text') {
    const safePath = this._validatePath(filePath);

    // Read existing content
    const existingContent = await fs.readFile(safePath, 'utf8');

    // Apply changes
    let newContent = existingContent;

    if (changes.replace) {
      newContent = existingContent.replace(changes.replace.pattern, changes.replace.replacement);
    }

    if (changes.insert) {
      const { position, content: insertContent } = changes.insert;
      if (position === 'start') {
        newContent = insertContent + '\n' + existingContent;
      } else if (position === 'end') {
        newContent = existingContent + '\n' + insertContent;
      } else if (position === 'after') {
        const lines = existingContent.split('\n');
        const targetLine = changes.insert.targetLine || 0;
        lines.splice(targetLine + 1, 0, insertContent);
        newContent = lines.join('\n');
      }
    }

    if (changes.append) {
      newContent += '\n' + changes.append;
    }

    // Write the updated file
    await fs.writeFile(safePath, newContent, 'utf8');

    return {
      success: true,
      action: 'edited',
      path: safePath,
      originalSize: existingContent.length,
      newSize: newContent.length,
      changes: Object.keys(changes)
    };
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath) {
    const safePath = this._validatePath(filePath);

    // Check if file exists
    try {
      await fs.access(safePath);
    } catch {
      throw new Error(`File does not exist: ${safePath}`);
    }

    // Delete the file
    await fs.unlink(safePath);

    return {
      success: true,
      action: 'deleted',
      path: safePath
    };
  }

  /**
   * Run a terminal command
   */
  async runTerminal(command, cwd = process.cwd()) {
    const safeCwd = this._validatePath(cwd);

    try {
      const result = execSync(command, {
        cwd: safeCwd,
        encoding: 'utf8',
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      return {
        success: true,
        command,
        cwd: safeCwd,
        output: result,
        exitCode: 0
      };
    } catch (error) {
      return {
        success: false,
        command,
        cwd: safeCwd,
        error: error.message,
        exitCode: error.status || 1
      };
    }
  }

  /**
   * Perform git operations
   */
  async gitOperation(operation, args = []) {
    const safeCwd = process.cwd();

    try {
      let command = `git ${operation}`;
      if (args.length > 0) {
        command += ' ' + args.join(' ');
      }

      const result = execSync(command, {
        cwd: safeCwd,
        encoding: 'utf8',
        timeout: 30000
      });

      return {
        success: true,
        operation,
        args,
        output: result,
        exitCode: 0
      };
    } catch (error) {
      return {
        success: false,
        operation,
        args,
        error: error.message,
        exitCode: error.status || 1
      };
    }
  }

  /**
   * Search files for content
   */
  async searchFiles(query, pattern = '**/*') {
    try {
      // Use ripgrep if available, fallback to grep
      let command = `rg "${query}" --glob "${pattern}" --no-heading --line-number`;

      try {
        const result = execSync(command, {
          encoding: 'utf8',
          timeout: 10000
        });

        return {
          success: true,
          query,
          pattern,
          results: result.split('\n').filter(line => line.trim())
        };
      } catch {
        // Fallback to grep
        command = `grep -r "${query}" . --include="${pattern}" -n`;
        const result = execSync(command, {
          encoding: 'utf8',
          timeout: 10000
        });

        return {
          success: true,
          query,
          pattern,
          results: result.split('\n').filter(line => line.trim()),
          method: 'grep_fallback'
        };
      }
    } catch (error) {
      return {
        success: false,
        query,
        pattern,
        error: error.message
      };
    }
  }

  /**
   * Validate file path for security
   */
  _validatePath(filePath) {
    const resolvedPath = path.resolve(filePath);

    // Check for unsafe patterns
    for (const pattern of this.unsafePatterns) {
      if (pattern.test(resolvedPath)) {
        throw new Error(`Unsafe path: ${filePath}`);
      }
    }

    // Check if path is within safe directories
    const isSafe = this.safePaths.some(safePath =>
      resolvedPath.startsWith(safePath)
    );

    if (!isSafe) {
      throw new Error(`Path outside safe directories: ${filePath}`);
    }

    return resolvedPath;
  }

  /**
   * Format content based on language
   */
  _formatContent(content, language) {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        // Don't add comments for JavaScript files to preserve shebang lines
        return content;

      case 'typescript':
      case 'ts':
        return `// ${language} file\n${content}`;

      case 'python':
      case 'py':
        return `# ${language} file\n${content}`;

      case 'html':
        return `<!DOCTYPE html>\n<html>\n<head>\n  <title>Generated File</title>\n</head>\n<body>\n${content}\n</body>\n</html>`;

      case 'css':
        return `/* ${language} file */\n${content}`;

      case 'markdown':
      case 'md':
        return `# Generated File\n\n${content}`;

      default:
        return content;
    }
  }

  /**
   * Get available tools
   */
  getAvailableTools() {
    return [
      {
        name: 'create_file',
        description: 'Create a new file with specified content',
        parameters: {
          path: 'string (file path)',
          content: 'string (file content)',
          language: 'string (optional, for formatting)'
        }
      },
      {
        name: 'edit_file',
        description: 'Edit an existing file',
        parameters: {
          path: 'string (file path)',
          changes: 'object (replace, insert, append operations)',
          language: 'string (optional)'
        }
      },
      {
        name: 'delete_file',
        description: 'Delete a file',
        parameters: {
          path: 'string (file path)'
        }
      },
      {
        name: 'run_terminal',
        description: 'Execute a terminal command',
        parameters: {
          command: 'string (command to run)',
          cwd: 'string (optional, working directory)'
        }
      },
      {
        name: 'git_operation',
        description: 'Perform git operations',
        parameters: {
          operation: 'string (git command)',
          args: 'array (optional arguments)'
        }
      },
      {
        name: 'search_files',
        description: 'Search files for content',
        parameters: {
          query: 'string (search term)',
          pattern: 'string (optional, file pattern)'
        }
      }
    ];
  }
}

module.exports = { ToolExecutor };
