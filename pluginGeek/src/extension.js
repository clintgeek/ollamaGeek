const vscode = require('vscode');
const { OllamaGeekClient } = require('./ollamaGeekClient');
const { ContextManager } = require('./contextManager');
const { ChatViewProvider } = require('./chatViewProvider');

/**
 * PluginGeek - VS Code Extension for OllamaGeek Integration
 * Provides intelligent AI-powered development with context awareness
 */
function activate(context) {
    console.log('🚀 PluginGeek is now active!');

    // Initialize services
    const ollamaGeekClient = new OllamaGeekClient();
    const contextManager = new ContextManager();

    // Register the chat view provider
    const chatViewProvider = new ChatViewProvider();
    chatViewProvider.ollamaGeekClient = ollamaGeekClient;
    chatViewProvider.contextManager = contextManager;

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('pluginGeekChat', chatViewProvider)
    );

    // Register commands
    const planFeatureCommand = vscode.commands.registerCommand('pluginGeek.planFeature', async () => {
        try {
            const userInput = await vscode.window.showInputBox({
                prompt: 'What feature would you like to plan?',
                placeHolder: 'e.g., Create a user authentication system'
            });

            if (userInput) {
                await planFeature(userInput, ollamaGeekClient, contextManager);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Feature planning failed: ${error}`);
        }
    });

    const analyzeContextCommand = vscode.commands.registerCommand('pluginGeek.analyzeContext', async () => {
        try {
            await analyzeWorkspaceContext(contextManager);
        } catch (error) {
            vscode.window.showErrorMessage(`Context analysis failed: ${error}`);
        }
    });

    // Add commands to context
    context.subscriptions.push(planFeatureCommand, analyzeContextCommand);

    // Start context monitoring
    contextManager.startMonitoring();

    // Test connection to OllamaGeek
    testOllamaGeekConnection(ollamaGeekClient);
}

/**
 * Test connection to OllamaGeek server
 */
async function testOllamaGeekConnection(ollamaGeekClient) {
    try {
        console.log('🔌 Testing connection to OllamaGeek...');
        const isConnected = await ollamaGeekClient.testConnection();

        if (isConnected) {
            console.log('✅ Successfully connected to OllamaGeek!');
            vscode.window.showInformationMessage('PluginGeek: Connected to OllamaGeek AI server! 🚀');
        } else {
            console.log('❌ Failed to connect to OllamaGeek');
            vscode.window.showWarningMessage('PluginGeek: Cannot connect to OllamaGeek. Make sure the server is running on http://localhost:3003');
        }
    } catch (error) {
        console.error('❌ Error testing OllamaGeek connection:', error);
        vscode.window.showErrorMessage(`PluginGeek: Connection test failed: ${error.message}`);
    }
}

/**
 * Plan a feature using OllamaGeek's enhanced planning
 */
async function planFeature(userInput, ollamaGeekClient, contextManager) {
    try {
        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Planning feature with OllamaGeek...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });

            // Get current workspace context
            progress.report({ increment: 20, message: "Analyzing workspace context..." });
            const workspaceContext = await contextManager.getWorkspaceContext();

            // Request planning from OllamaGeek
            progress.report({ increment: 40, message: "Requesting AI planning..." });
            const plan = await ollamaGeekClient.planFeature(userInput, workspaceContext);

            // Display the plan
            progress.report({ increment: 80, message: "Displaying plan..." });
            await displayFeaturePlan(plan);

            progress.report({ increment: 100, message: "Planning complete!" });
        });

    } catch (error) {
        vscode.window.showErrorMessage(`Feature planning failed: ${error}`);
    }
}

/**
 * Display the feature plan in a new editor
 */
async function displayFeaturePlan(plan) {
    const document = await vscode.workspace.openTextDocument({
        content: `# Feature Plan: ${plan.description}

## Tools Required (${plan.tools.length})
${plan.tools.map((tool, index) => `
${index + 1}. **${tool.name}**
   - Description: ${tool.description}
   - Parameters: ${JSON.stringify(tool.parameters, null, 2)}
   - Context: ${tool.context || 'None'}
`).join('')}

## Context Analysis
${plan.context.summary}

## Workspace Information
- **Language**: ${plan.context.workspace.language}
- **Framework**: ${plan.context.workspace.framework}
- **Structure**: ${plan.context.workspace.structure.type} (${plan.context.workspace.structure.quality} quality)

## Coding Standards
- **Components**: ${plan.context.rules.codingStyle.components}
- **Architecture**: ${plan.context.rules.architecture.pattern}
- **Testing**: ${plan.context.rules.testing.framework}

## Recommendations
${plan.context.recommendations?.map((rec) => `- ${rec.message} (${rec.priority} priority)`).join('\n') || 'None'}

---
*Generated by OllamaGeek at ${new Date().toLocaleString()}*
*Context ID: ${plan.contextId}*
`,
        language: 'markdown'
    });

    await vscode.window.showTextDocument(document);
}

/**
 * Analyze the current workspace context
 */
async function analyzeWorkspaceContext(contextManager) {
    try {
        const context = await contextManager.getWorkspaceContext();

        vscode.window.showInformationMessage(
            `Workspace analyzed: ${context.language} project with ${context.framework} framework`
        );

        // Show detailed context in output channel
        const outputChannel = vscode.window.createOutputChannel('PluginGeek Context');
        outputChannel.appendLine('=== Workspace Context Analysis ===');
        outputChannel.appendLine(`Language: ${context.language}`);
        outputChannel.appendLine(`Framework: ${context.framework}`);
        outputChannel.appendLine(`Build Tool: ${context.buildTool}`);
        outputChannel.appendLine(`Files: ${context.files.length}`);
        outputChannel.appendLine(`Directories: ${context.directories.length}`);
        outputChannel.appendLine('================================');
        outputChannel.show();

    } catch (error) {
        vscode.window.showErrorMessage(`Context analysis failed: ${error}`);
    }
}

/**
 * Execute a tool from an AI plan
 */
async function executeTool(toolName, parameters) {
    try {
        console.log(`🔧 Executing tool: ${toolName}`, parameters);

        // Get workspace folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        // Normalize parameters to handle both 'name' and 'path' for file operations
        let normalizedParams = { ...parameters };
        if (toolName === 'create_file' && parameters.name && !parameters.path) {
            normalizedParams.path = parameters.name;
        }
        if (toolName === 'create_directory' && parameters.name && !parameters.path) {
            normalizedParams.path = parameters.name;
        }

        let result;

        switch (toolName) {
            case 'create_file':
                result = await createFile(workspaceFolder, normalizedParams);
                break;

            case 'create_directory':
                result = await createDirectory(workspaceFolder, normalizedParams);
                break;

            case 'run_terminal':
                result = await runTerminal(normalizedParams);
                break;

            case 'edit_file':
                result = await editFile(workspaceFolder, normalizedParams);
                break;

            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }

        vscode.window.showInformationMessage(`✅ Tool executed successfully: ${result.message}`);
        return result;

    } catch (error) {
        console.error(`❌ Tool execution failed: ${toolName}`, error);
        vscode.window.showErrorMessage(`Tool execution failed: ${error.message}`);
        throw error;
    }
}

/**
 * Create a new file
 */
async function createFile(workspaceFolder, parameters) {
    const { path, content } = parameters;

    if (!path) {
        throw new Error('File path is required');
    }

    // Normalize the path - remove leading slash and ensure it's relative to project root
    let normalizedPath = path.replace(/^\/+/, ''); // Remove leading slashes

    // If no content provided, generate a default filename
    if (!normalizedPath.includes('/') && !normalizedPath.includes('.')) {
        // Just a folder name, create a default file
        normalizedPath = `${normalizedPath}/index.js`;
    } else if (!normalizedPath.includes('.')) {
        // Path without extension, add default extension
        normalizedPath = `${normalizedPath}.js`;
    }

    const filePath = vscode.Uri.joinPath(workspaceFolder.uri, normalizedPath);

    // Ensure the directory exists
    const dirPath = vscode.Uri.joinPath(workspaceFolder.uri, require('path').dirname(normalizedPath));
    try {
        await vscode.workspace.fs.createDirectory(dirPath);
    } catch (error) {
        // Directory might already exist, that's fine
    }

    // Create file with content
    const writeData = new Uint8Array(Buffer.from(content || '// File created by PluginGeek\n'));
    await vscode.workspace.fs.writeFile(filePath, writeData);

    // Open the file in editor
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);

    return {
        success: true,
        path: filePath.fsPath,
        message: `File created and opened: ${normalizedPath}`
    };
}

/**
 * Create a directory
 */
async function createDirectory(workspaceFolder, parameters) {
    const { path } = parameters;

    if (!path) {
        throw new Error('Directory path is required');
    }

    // Normalize the path - remove leading slash and ensure it's relative to project root
    let normalizedPath = path.replace(/^\/+/, ''); // Remove leading slashes

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
async function runTerminal(parameters) {
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
        message: `Command executed in terminal: ${command}`
    };
}

/**
 * Edit an existing file
 */
async function editFile(workspaceFolder, parameters) {
    const { path, content } = parameters;

    if (!path) {
        throw new Error('File path is required');
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

    // Open the file in editor
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);

    return {
        success: true,
        path: filePath.fsPath,
        message: `File updated and opened: ${path}`
    };
}

function deactivate() {
    console.log('🛑 PluginGeek is now deactivated');
}

module.exports = {
    activate,
    deactivate
};
