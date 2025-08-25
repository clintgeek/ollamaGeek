import axios from 'axios';
import * as vscode from 'vscode';

/**
 * Client for communicating with OllamaGeek server
 */
export class OllamaGeekClient {
    private baseUrl: string;
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('pluginGeek');
        this.baseUrl = this.config.get('ollamaGeekUrl', 'http://localhost:3003');
    }

    /**
     * Plan a feature using OllamaGeek's enhanced planning
     */
    async planFeature(userInput: string, workspaceContext: any): Promise<any> {
        try {
            console.log(`🧠 Planning feature: ${userInput}`);
            console.log(`📁 Workspace context:`, workspaceContext);

            const response = await axios.post(`${this.baseUrl}/api/plan/enhanced`, {
                messages: [{
                    role: 'user',
                    content: userInput
                }],
                model: 'qwen2.5-coder:7b-instruct-q6_K',
                workspace: workspaceContext
            }, {
                timeout: 30000, // 30 second timeout
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
    async getAvailableTools(): Promise<any> {
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
    async executeToolPlan(plan: any): Promise<any> {
        try {
            console.log(`🔧 Executing tool plan: ${plan.description}`);
            
            const results = [];
            
            for (const tool of plan.tools) {
                console.log(`🔧 Executing tool: ${tool.name}`);
                
                try {
                    const result = await this.executeTool(tool);
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
    private async executeTool(tool: any): Promise<any> {
        switch (tool.name) {
            case 'create_file':
                return await this.createFile(tool.parameters);
            
            case 'edit_file':
                return await this.editFile(tool.parameters);
            
            case 'create_directory':
                return await this.createDirectory(tool.parameters);
            
            case 'run_terminal':
                return await this.runTerminal(tool.parameters);
            
            case 'git_operation':
                return await this.gitOperation(tool.parameters);
            
            default:
                throw new Error(`Unknown tool: ${tool.name}`);
        }
    }

    /**
     * Create a new file
     */
    private async createFile(parameters: any): Promise<any> {
        const { path, content, language } = parameters;
        
        if (!path) {
            throw new Error('File path is required');
        }

        // Get workspace folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const filePath = vscode.Uri.joinPath(workspaceFolder.uri, path);
        
        // Create file with content
        const writeData = new Uint8Array(Buffer.from(content || ''));
        await vscode.workspace.fs.writeFile(filePath, writeData);

        return {
            success: true,
            path: filePath.fsPath,
            message: `File created: ${path}`
        };
    }

    /**
     * Edit an existing file
     */
    private async editFile(parameters: any): Promise<any> {
        const { path, content } = parameters;
        
        if (!path) {
            throw new Error('File path is required');
        }

        // Get workspace folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const filePath = vscode.Uri.joinPath(workspaceFolder.uri, path);
        
        // Check if file exists
        try {
            await vscode.workspace.fs.stat(filePath);
        } catch {
            throw new Error(`File not found: ${path}`);
        }

        // Update file content
        const writeData = new Uint8Array(Buffer.from(content || ''));
        await vscode.workspace.fs.writeFile(filePath, writeData);

        return {
            success: true,
            path: filePath.fsPath,
            message: `File updated: ${path}`
        };
    }

    /**
     * Create a directory
     */
    private async createDirectory(parameters: any): Promise<any> {
        const { path } = parameters;
        
        if (!path) {
            throw new Error('Directory path is required');
        }

        // Get workspace folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const dirPath = vscode.Uri.joinPath(workspaceFolder.uri, path);
        
        // Create directory
        await vscode.workspace.fs.createDirectory(dirPath);

        return {
            success: true,
            path: dirPath.fsPath,
            message: `Directory created: ${path}`
        };
    }

    /**
     * Run a terminal command
     */
    private async runTerminal(parameters: any): Promise<any> {
        const { command, cwd } = parameters;
        
        if (!command) {
            throw new Error('Command is required');
        }

        // Create terminal
        const terminal = vscode.window.createTerminal('PluginGeek');
        terminal.show();

        // Execute command
        terminal.sendText(command);

        return {
            success: true,
            command,
            message: `Command executed: ${command}`
        };
    }

    /**
     * Perform git operation
     */
    private async gitOperation(parameters: any): Promise<any> {
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
     * Test connection to OllamaGeek
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseUrl}/health`, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'VS-Code-PluginGeek'
                }
            });

            return response.data.status === 'healthy';
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            return false;
        }
    }
}
