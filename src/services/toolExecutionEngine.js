const { Logger } = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * 🛠️ Tool Execution Engine
 *
 * Actually executes the tools that were planned by the workflow system.
 * This is the bridge between workflow planning and actual tool execution.
 */
class ToolExecutionEngine {
  constructor() {
    this.logger = new Logger();
    this.supportedTools = new Set([
      'create_file',
      'create_directory',
      'run_terminal',
      'install_dependency',
      'configure_linter',
      'run_tests',
      'copy_file',
      'move_file',
      'delete_file',
      'rename_file',
      'list_files'
    ]);
  }

  /**
   * Execute a tool with the given parameters
   */
  async executeTool(toolName, params, context = {}) {
    try {
      this.logger.info(`🔧 Executing tool: ${toolName}`, { params, context });

      if (!this.supportedTools.has(toolName)) {
        throw new Error(`Unsupported tool: ${toolName}`);
      }

      const methodName = `execute${this.capitalizeFirst(toolName)}`;
      if (typeof this[methodName] !== 'function') {
        throw new Error(`Tool execution method not found: ${methodName}`);
      }
      const result = await this[methodName](params, context);

      this.logger.info(`✅ Tool ${toolName} executed successfully`, { result });
      return {
        success: true,
        tool: toolName,
        result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`❌ Tool ${toolName} execution failed`, { error: error.message, params });
      return {
        success: false,
        tool: toolName,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute multiple tools in sequence
   */
  async executeTools(tools, context = {}) {
    const results = [];

    for (const tool of tools) {
      const result = await this.executeTool(tool.tool, tool.params, context);
      results.push(result);

      // If a tool fails, we can choose to continue or stop
      if (!result.success && tool.critical !== false) {
        this.logger.warn(`⚠️ Critical tool ${tool.tool} failed, stopping execution`);
        break;
      }
    }

    return results;
  }

  /**
   * Execute tools in parallel (for independent operations)
   */
  async executeToolsParallel(tools, context = {}) {
    const promises = tools.map(tool => this.executeTool(tool.tool, tool.params, context));
    return await Promise.all(promises);
  }

  // ===== Individual Tool Implementations =====

  /**
   * Create a new file with content
   */
  async executeCreateFile(params, context) {
    const { path: filePath, content } = params;
    const fullPath = this.resolvePath(filePath, context);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // Create the file
    await fs.writeFile(fullPath, content, 'utf8');

    return {
      path: fullPath,
      size: content.length,
      created: true
    };
  }

  /**
   * Create a new directory
   */
  async executeCreateDirectory(params, context) {
    const { path: dirPath } = params;
    const fullPath = this.resolvePath(dirPath, context);

    await fs.mkdir(fullPath, { recursive: true });

    return {
      path: fullPath,
      created: true
    };
  }

  /**
   * Run a terminal command
   */
  async executeRunTerminal(params, context) {
    const { command, cwd } = params;
    const workingDir = cwd ? this.resolvePath(cwd, context) : process.cwd();

    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      timeout: 30000 // 30 second timeout
    });

    return {
      command,
      cwd: workingDir,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0
    };
  }

  /**
   * Install a dependency (npm/yarn)
   */
  async executeInstallDependency(params, context) {
    const { package: packageName, cwd, packageManager = 'npm' } = params;
    const workingDir = cwd ? this.resolvePath(cwd, context) : process.cwd();

    let command;
    if (packageManager === 'yarn') {
      command = `yarn add ${packageName}`;
    } else {
      command = `npm install ${packageName}`;
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      timeout: 60000 // 1 minute timeout for package installation
    });

    return {
      package: packageName,
      packageManager,
      cwd: workingDir,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      installed: true
    };
  }

  /**
   * Configure a linter
   */
  async executeConfigureLinter(params, context) {
    const { configPath, configContent, cwd } = params;
    const workingDir = cwd ? this.resolvePath(cwd, context) : process.cwd();
    const fullConfigPath = path.join(workingDir, configPath);

    // Ensure directory exists
    const dir = path.dirname(fullConfigPath);
    await fs.mkdir(dir, { recursive: true });

    // Write linter config
    await fs.writeFile(fullConfigPath, configContent, 'utf8');

    return {
      configPath: fullConfigPath,
      configured: true
    };
  }

  /**
   * Run tests
   */
  async executeRunTests(params, context) {
    const { cwd, testScript = 'test' } = params;
    const workingDir = cwd ? this.resolvePath(cwd, context) : process.cwd();

    const command = `npm run ${testScript}`;
    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      timeout: 120000 // 2 minute timeout for tests
    });

    return {
      testScript,
      cwd: workingDir,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      testsRun: true
    };
  }

  /**
   * Copy a file
   */
  async executeCopyFile(params, context) {
    const { source, destination } = params;
    const sourcePath = this.resolvePath(source, context);
    const destPath = this.resolvePath(destination, context);

    // Ensure destination directory exists
    const dir = path.dirname(destPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.copyFile(sourcePath, destPath);

    return {
      source: sourcePath,
      destination: destPath,
      copied: true
    };
  }

  /**
   * Move a file
   */
  async executeMoveFile(params, context) {
    const { source, destination } = params;
    const sourcePath = this.resolvePath(source, context);
    const destPath = this.resolvePath(destination, context);

    // Ensure destination directory exists
    const dir = path.dirname(destPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.rename(sourcePath, destPath);

    return {
      source: sourcePath,
      destination: destPath,
      moved: true
    };
  }

  /**
   * Delete a file
   */
  async executeDeleteFile(params, context) {
    const { path: filePath } = params;
    const fullPath = this.resolvePath(filePath, context);

    await fs.unlink(fullPath);

    return {
      path: fullPath,
      deleted: true
    };
  }

  /**
   * Rename a file
   */
  async executeRenameFile(params, context) {
    const { oldPath, newPath } = params;
    const oldFullPath = this.resolvePath(oldPath, context);
    const newFullPath = this.resolvePath(newPath, context);

    await fs.rename(oldFullPath, newFullPath);

    return {
      oldPath: oldFullPath,
      newPath: newFullPath,
      renamed: true
    };
  }

  /**
   * List files in a directory
   */
  async executeListFiles(params, context) {
    const { path: dirPath } = params;
    const fullPath = this.resolvePath(dirPath, context);

    const files = await fs.readdir(fullPath, { withFileTypes: true });

    return {
      path: fullPath,
      files: files.map(file => ({
        name: file.name,
        isDirectory: file.isDirectory(),
        isFile: file.isFile()
      }))
    };
  }

  // ===== Utility Methods =====

  /**
   * Resolve a path relative to the project context
   */
  resolvePath(filePath, context) {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }

    // If we have a target directory in context, use it
    if (context.targetDir) {
      return path.resolve(context.targetDir, filePath);
    }

    // Otherwise resolve relative to current working directory
    return path.resolve(process.cwd(), filePath);
  }

  /**
   * Convert tool name to method name format
   * e.g., "create_directory" -> "CreateDirectory"
   */
  capitalizeFirst(str) {
    return str.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Validate tool parameters
   */
  validateToolParams(toolName, params) {
    const requiredParams = this.getRequiredParams(toolName);

    for (const param of requiredParams) {
      if (!(param in params)) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
  }

  /**
   * Get required parameters for a tool
   */
  getRequiredParams(toolName) {
    const paramMap = {
      create_file: ['path', 'content'],
      create_directory: ['path'],
      run_terminal: ['command'],
      install_dependency: ['package'],
      configure_linter: ['configPath', 'configContent'],
      run_tests: [],
      copy_file: ['source', 'destination'],
      move_file: ['source', 'destination'],
      delete_file: ['path'],
      rename_file: ['oldPath', 'newPath'],
      list_files: ['path']
    };

    return paramMap[toolName] || [];
  }

  /**
   * Get tool execution statistics
   */
  getStats() {
    return {
      supportedTools: Array.from(this.supportedTools),
      totalTools: this.supportedTools.size
    };
  }
}

module.exports = ToolExecutionEngine;
