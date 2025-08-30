const axios = require('axios');
const vscode = require('vscode');

/**
 * Client for communicating with OllamaGeek server
 */
class OllamaGeekClient {
    constructor() {
        this.config = vscode.workspace.getConfiguration('pluginGeek');
        this.baseUrl = this.config.get('ollamaGeekUrl', 'http://localhost:3003');
    }

    /**
     * Chat with OllamaGeek - unified endpoint for all interactions
     */
    async chat(prompt, context = {}) {
        try {
            console.log(`💬 Chat request: ${prompt}`);
            console.log(`📁 Context:`, context);

            const response = await axios.post(`${this.baseUrl}/api/chat/unified`, {
                prompt: prompt,
                context: context
            }, {
                timeout: 120000, // 2 minute timeout
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'VS-Code-PluginGeek'
                }
            });

            console.log(`✅ Chat response received:`, response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error in chat:', error);
            throw new Error(`Chat failed: ${error}`);
        }
    }

    /**
     * Plan a feature using OllamaGeek's enhanced planning
     */
    async planFeature(userInput, workspaceContext) {
        try {
            console.log(`🧠 Planning feature: ${userInput}`);
            console.log(`📁 Workspace context:`, workspaceContext);

            const response = await axios.post(`${this.baseUrl}/api/plan/enhanced`, {
                prompt: userInput,
                context: workspaceContext
            }, {
                timeout: 120000, // 2 minute timeout
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'VS-Code-PluginGeek'
                }
            });

            if (response.data.success) {
                console.log(`✅ Feature plan generated: ${response.data.plan.description}`);
                return response.data.plan;
            } else {
                throw new Error('Failed to generate feature plan');
            }

        } catch (error) {
            console.error('❌ Error planning feature:', error);
            throw new Error(`Feature planning failed: ${error}`);
        }
    }

    /**
     * Get available tools from OllamaGeek
     */
    async getAvailableTools() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tools`, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'VS-Code-PluginGeek'
                }
            });

            return response.data;
        } catch (error) {
            console.error('❌ Error getting tools:', error);
            throw new Error(`Failed to get tools: ${error}`);
        }
    }

    /**
     * Execute a tool plan
     */
    async executeToolPlan(plan) {
        try {
            console.log(`🔧 Executing tool plan: ${plan.description}`);

            const results = [];

            for (const tool of plan.tools) {
                console.log(`🔧 Executing tool: ${tool.name}`);

                try {
                    const result = await this.executeTool(tool.name, tool.parameters);
                    results.push({
                        tool: tool.name,
                        success: true,
                        result
                    });
                } catch (error) {
                    console.error(`❌ Tool execution failed: ${tool.name}`, error);
                    results.push({
                        tool: tool.name,
                        success: false,
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                results,
                plan: plan.description
            };

        } catch (error) {
            console.error('❌ Error executing tool plan:', error);
            throw new Error(`Tool plan execution failed: ${error}`);
        }
    }

    /**
     * Execute a single tool
     */
    async executeTool(toolName, parameters) {
        try {
            console.log(`🔧 Executing tool: ${toolName} with parameters:`, JSON.stringify(parameters, null, 2));

            // Validate parameters based on tool type
            if (toolName === 'create_file' && !parameters.path && !parameters.name) {
                console.error(`❌ Missing path or name parameter for create_file tool`);
                console.error(`❌ Parameters received:`, parameters);
                throw new Error('File path or name is required for create_file tool');
            }

            if (toolName === 'create_directory' && !parameters.path) {
                console.error(`❌ Missing path parameter for create_directory tool`);
                console.error(`❌ Parameters received:`, parameters);
                throw new Error('Directory path is required for create_directory tool');
            }

            switch (toolName) {
                case 'create_file':
                    return await this.createFile(parameters);

                case 'edit_file':
                    return await this.editFile(parameters);

                case 'create_directory':
                    return await this.createDirectory(parameters);

                case 'run_terminal':
                    return await this.runTerminal(parameters);

                case 'git_operation':
                    return await this.gitOperation(parameters);

                default:
                    throw new Error(`Unknown tool: ${toolName}`);
            }
        } catch (error) {
            console.error(`❌ Tool execution failed: ${toolName}`, error);
            throw error;
        }
    }

    /**
     * Create a new file
     */
    async createFile(parameters) {
        // Handle both 'name' and 'path' parameters for flexibility
        const { path, name, content, language, targetDirectory, directory } = parameters;

        // Get workspace folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        let finalPath;
        let fileName;

        // Handle different parameter combinations
        if (path) {
            // Full path provided
            finalPath = path;
            fileName = require('path').basename(path);
        } else if (name) {
            // Just filename provided, check if we have a target directory
            fileName = name;

            if (targetDirectory || directory) {
                // Create file in specified directory
                const targetDir = targetDirectory || directory;
                finalPath = `${targetDir}/${fileName}`;
                console.log(`📁 Creating file in target directory: ${targetDir}`);
                console.log(`📁 Full path: ${finalPath}`);
            } else {
                // Create file in root workspace
                finalPath = fileName;
                console.log(`📁 Creating file in workspace root: ${fileName}`);
            }
        } else {
            throw new Error('File path or name is required');
        }

        // Normalize the path - handle both absolute and relative paths
        let normalizedPath;

        if (finalPath.startsWith('/')) {
            // Absolute path - extract just the file path relative to workspace
            const pathParts = finalPath.split('/');
            const workspaceName = workspaceFolder.name;

            // Find the workspace folder in the path and get everything after it
            const workspaceIndex = pathParts.indexOf(workspaceName);
            if (workspaceIndex !== -1) {
                normalizedPath = pathParts.slice(workspaceIndex + 1).join('/');
            } else {
                // Fallback: just use the last part as filename
                normalizedPath = pathParts[pathParts.length - 1];
            }
        } else {
            // Relative path - use as is
            normalizedPath = finalPath;
        }

        // If no content provided, generate a default filename
        if (!normalizedPath.includes('/') && !normalizedPath.includes('.')) {
            // Just a folder name, create a default file
            normalizedPath = `${normalizedPath}/index.js`;
        } else if (!normalizedPath.includes('.')) {
            // Path without extension, add default extension
            normalizedPath = `${normalizedPath}.js`;
        }

        const fullFilePath = vscode.Uri.joinPath(workspaceFolder.uri, normalizedPath);

        // Ensure the directory exists
        const dirPath = vscode.Uri.joinPath(workspaceFolder.uri, require('path').dirname(normalizedPath));
        try {
            await vscode.workspace.fs.createDirectory(dirPath);
            console.log(`✅ Directory ensured: ${dirPath.fsPath}`);
        } catch (error) {
            // Directory might already exist, that's fine
            console.log(`ℹ️ Directory already exists: ${dirPath.fsPath}`);
        }

        // Create file with content
        const writeData = new Uint8Array(Buffer.from(content || '// File created by PluginGeek\n'));
        await vscode.workspace.fs.writeFile(fullFilePath, writeData);
        console.log(`✅ File created: ${fullFilePath.fsPath}`);

        return {
            success: true,
            path: fullFilePath.fsPath,
            message: `File created: ${normalizedPath}`,
            targetDirectory: targetDirectory || directory,
            fileName: fileName
        };
    }

    /**
     * Edit an existing file
     */
    async editFile(parameters) {
        const { path, content } = parameters;

        if (!path) {
            throw new Error('File path is required');
        }

        // Get workspace folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        // Normalize the path - remove leading slash and ensure it's relative to project root
        let normalizedPath = path.replace(/^\/+/, ''); // Remove leading slashes

        const filePath = vscode.Uri.joinPath(workspaceFolder.uri, normalizedPath);

        // Check if file exists
        try {
            await vscode.workspace.fs.stat(filePath);
        } catch {
            throw new Error(`File not found: ${normalizedPath}`);
        }

        // Update file content
        const writeData = new Uint8Array(Buffer.from(content || ''));
        await vscode.workspace.fs.writeFile(filePath, writeData);

        return {
            success: true,
            path: filePath.fsPath,
            message: `File updated: ${normalizedPath}`
        };
    }

    /**
     * Create a directory
     */
    async createDirectory(parameters) {
        const { path } = parameters;

        if (!path) {
            throw new Error('Directory path is required');
        }

        // Get workspace folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        // Handle both absolute and relative paths
        let normalizedPath;

        if (path.startsWith('/')) {
            // Absolute path - extract just the directory name relative to workspace
            const pathParts = path.split('/');
            const workspaceName = workspaceFolder.name;

            // Find the workspace folder in the path and get everything after it
            const workspaceIndex = pathParts.indexOf(workspaceName);
            if (workspaceIndex !== -1) {
                normalizedPath = pathParts.slice(workspaceIndex + 1).join('/');
            } else {
                // Fallback: just use the last part as directory name
                normalizedPath = pathParts[pathParts.length - 1];
            }
        } else {
            // Relative path - use as is
            normalizedPath = path;
        }

        // If it's just a name without path separators, assume it's a top-level directory
        if (!normalizedPath.includes('/')) {
            normalizedPath = normalizedPath;
        }

        const dirPath = vscode.Uri.joinPath(workspaceFolder.uri, normalizedPath);

        // Create directory (and parent directories if needed)
        try {
            await vscode.workspace.fs.createDirectory(dirPath);
        } catch (error) {
            // Try to create parent directories first
            const pathParts = normalizedPath.split('/');
            let currentPath = '';

            for (const part of pathParts) {
                if (part) {
                    currentPath = currentPath ? `${currentPath}/${part}` : part;
                    const currentDirPath = vscode.Uri.joinPath(workspaceFolder.uri, currentPath);
                    try {
                        await vscode.workspace.fs.createDirectory(currentDirPath);
                    } catch (dirError) {
                        // Directory might already exist, that's fine
                    }
                }
            }
        }

        return {
            success: true,
            path: dirPath.fsPath,
            message: `Directory created: ${normalizedPath}`
        };
    }

    /**
     * Run a terminal command
     */
    async runTerminal(parameters) {
        const { command, cwd } = parameters;

        if (!command) {
            throw new Error('Command is required');
        }

        // Create terminal
        const terminal = vscode.window.createTerminal('PluginGeek');
        terminal.show();

        // If working directory is specified, change to it first
        if (cwd) {
            terminal.sendText(`cd "${cwd}"`);
        }

        // Execute command
        terminal.sendText(command);

        return {
            success: true,
            command,
            message: `Command executed: ${command}`,
            workingDirectory: cwd || 'workspace root'
        };
    }

    /**
     * Perform git operation
     */
    async gitOperation(parameters) {
        const { operation, commit_message } = parameters;

        if (!operation) {
            throw new Error('Git operation is required');
        }

        // Create terminal for git operations
        const terminal = vscode.window.createTerminal('PluginGeek Git');
        terminal.show();

        let command = '';
        switch (operation) {
            case 'init':
                command = 'git init';
                break;
            case 'add':
                command = 'git add .';
                break;
            case 'commit':
                if (!commit_message) {
                    throw new Error('Commit message is required');
                }
                command = `git commit -m "${commit_message}"`;
                break;
            case 'push':
                command = 'git push';
                break;
            default:
                command = `git ${operation}`;
        }

        terminal.sendText(command);

        return {
            success: true,
            operation,
            command,
            message: `Git operation executed: ${operation}`
        };
    }

    /**
     * Test connection to OllamaGeek server
     */
    async testConnection() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tools`, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'VS-Code-PluginGeek'
                }
            });

            console.log(`✅ Connected to OllamaGeek at ${this.baseUrl}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to connect to OllamaGeek at ${this.baseUrl}:`, error.message);
            return false;
        }
    }
}

module.exports = { OllamaGeekClient };
