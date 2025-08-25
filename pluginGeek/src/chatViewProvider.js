const vscode = require('vscode');
const { OllamaGeekClient } = require('./ollamaGeekClient');
const path = require('path');

/**
 * Chat view provider for PluginGeek sidebar
 * Provides the chat interface in a sidebar view like Cursor and Zencoder
 */
class ChatViewProvider {
    constructor() {
        this._disposables = [];
        this.chatSessions = new Map();
        this.currentChatId = null;
        this.yoloMode = false;
        this.autoExecute = true; // Auto-execute simple tasks
        this.connectionStatus = 'disconnected';
        this.connectionRetryCount = 0;
        this.maxRetries = 3;

        this.ollamaGeekClient = null;
        this.contextManager = null;

        this.startConnectionMonitoring();
    }

    /**
     * Start connection monitoring
     */
    async startConnectionMonitoring() {
        // Check connection immediately
        await this.checkConnectionStatus();

        // Set up periodic connection checking
        setInterval(async () => {
            await this.checkConnectionStatus();
        }, 10000); // Check every 10 seconds
    }

    /**
     * Check connection status
     */
    async checkConnectionStatus() {
        try {
            const isConnected = await this.ollamaGeekClient.testConnection();
            const newStatus = isConnected ? 'connected' : 'disconnected';

            if (this.connectionStatus !== newStatus) {
                this.connectionStatus = newStatus;
                this.updateConnectionStatusUI();

                if (newStatus === 'connected') {
                    this.connectionRetryCount = 0;
                    console.log('✅ OllamaGeek connection restored');
                } else {
                    console.log('❌ OllamaGeek connection lost');
                }
            }
        } catch (error) {
            if (this.connectionStatus !== 'disconnected') {
                this.connectionStatus = 'disconnected';
                this.updateConnectionStatusUI();
                console.log('❌ OllamaGeek connection check failed:', error.message);
            }
        }
    }

    /**
     * Update connection status UI
     */
    updateConnectionStatusUI() {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateConnectionStatus',
                status: this.connectionStatus
            });
        }
    }

    /**
     * Attempt to reconnect to OllamaGeek
     */
    async attemptReconnect() {
        if (this.connectionStatus === 'connecting') return;

        this.connectionStatus = 'connecting';
        this.updateConnectionStatusUI();

        try {
            const isConnected = await this.ollamaGeekClient.testConnection();
            if (isConnected) {
                this.connectionStatus = 'connected';
                this.connectionRetryCount = 0;
                this.updateConnectionStatusUI();

                // Show success message
                if (this._view) {
                    this._view.webview.postMessage({
                        command: 'showReconnectSuccess'
                    });
                }
            } else {
                throw new Error('Connection test failed');
            }
        } catch (error) {
            this.connectionStatus = 'disconnected';
            this.connectionRetryCount++;
            this.updateConnectionStatusUI();

            // Show retry message
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'showReconnectFailed',
                    retryCount: this.connectionRetryCount,
                    maxRetries: this.maxRetries
                });
            }
        }
    }

    /**
     * Create a new chat session
     */
    createNewChat() {
        const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newChat = {
            id: chatId,
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString()
        };

        this.chatSessions.set(chatId, newChat);
        this.currentChatId = chatId;

        // Update the view if available
        if (this._view) {
            this._view.webview.postMessage({
                command: 'chatSessionChanged',
                chatId: chatId,
                chat: newChat
            });
        }

        return chatId;
    }

    /**
     * Switch to a different chat session
     */
    switchToChat(chatId) {
        if (this.chatSessions.has(chatId)) {
            this.currentChatId = chatId;
            const chat = this.chatSessions.get(chatId);

            if (this._view) {
                this._view.webview.postMessage({
                    command: 'chatSessionChanged',
                    chatId: chatId,
                    chat: chat
                });
            }
        }
    }

    /**
     * Delete a chat session
     */
    deleteChat(chatId) {
        if (this.chatSessions.has(chatId)) {
            this.chatSessions.delete(chatId);

            // If we deleted the current chat, create a new one
            if (this.currentChatId === chatId) {
                this.createNewChat();
            }

            // Update the view
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'chatDeleted',
                    chatId: chatId
                });
            }
        }
    }



    /**
     * Toggle YOLO mode for immediate execution
     */
    toggleYoloMode() {
        this.yoloMode = !this.yoloMode;

        // Update the view
        if (this._view) {
            this._view.webview.postMessage({
                command: 'yoloModeChanged',
                yoloMode: this.yoloMode
            });
        }

        console.log(`🔥 YOLO Mode: ${this.yoloMode ? 'ENABLED' : 'disabled'}`);
    }

    /**
     * Toggle auto-execute mode for simple tasks
     */
    toggleAutoExecute() {
        this.autoExecute = !this.autoExecute;
        console.log(`⚡ Auto-Execute: ${this.autoExecute ? 'enabled' : 'disabled'}`);

        // Update the view
        if (this._view) {
            this._view.webview.postMessage({
                command: 'autoExecuteChanged',
                autoExecute: this.autoExecute
            });
        }
    }

    /**
     * Get all chat sessions for display
     */
    getChatSessions() {
        return Array.from(this.chatSessions.values()).map(chat => ({
            id: chat.id,
            title: chat.title,
            createdAt: chat.createdAt,
            messageCount: chat.messages.length,
            mode: chat.mode
        }));
    }

    /**
     * Resolve the webview view
     */
    resolveWebviewView(webviewView, context, token) {
        this._view = webviewView;

        // Set webview options
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        // Set the HTML content
        webviewView.webview.html = this.getWebviewContent(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'sendMessage':
                        this.handleMessage(message.text);
                        return;
                    case 'executeTool':
                        this.handleToolExecution(message.toolName, message.parameters);
                        return;
                    case 'createNewChat':
                        this.createNewChat();
                        return;
                    case 'switchToChat':
                        this.switchToChat(message.chatId);
                        return;
                    case 'deleteChat':
                        this.deleteChat(message.chatId);
                        return;
                    case 'toggleMode':
                        this.toggleMode();
                        return;
                    case 'getChatSessions':
                        this.sendChatSessions();
                        return;
                    case 'reconnect':
                        this.attemptReconnect();
                        return;
                    case 'toggleYoloMode':
                        this.toggleYoloMode();
                        return;
                    case 'toggleAutoExecute':
                        this.toggleAutoExecute();
                        return;
                }
            }
        );

        // Send initial data
        this.sendChatSessions();
        this.sendCurrentChat();
    }

    /**
     * Send chat sessions to webview
     */
    sendChatSessions() {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'chatSessionsUpdated',
                sessions: this.getChatSessions(),
                currentChatId: this.currentChatId
            });
        }
    }

    /**
     * Send current chat to webview
     */
    sendCurrentChat() {
        if (this._view && this.currentChatId && this.chatSessions.has(this.currentChatId)) {
            const chat = this.chatSessions.get(this.currentChatId);
            this._view.webview.postMessage({
                command: 'chatSessionChanged',
                chatId: this.currentChatId,
                chat: chat
            });
        }
    }

    /**
     * Get webview HTML content
     */
    getWebviewContent(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PluginGeek Chat</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: var(--vscode-sideBar-background);
            color: var(--vscode-sideBar-foreground);
            height: 100vh;
            overflow: hidden;
        }
        .chat-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .chat-header {
            padding: 16px;
            border-bottom: 1px solid var(--vscode-sideBar-border);
            background: var(--vscode-sideBar-background);
            flex-shrink: 0;
        }
        .chat-header h2 {
            margin: 0 0 8px 0;
            font-size: 16px;
            color: var(--vscode-sideBarTitle-foreground);
        }
        .chat-header p {
            margin: 0;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .chat-controls {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }
        .control-button {
            padding: 6px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            white-space: nowrap;
        }
        .control-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .control-button.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .mode-toggle {
            padding: 6px 12px;
            background: var(--vscode-button-prominentBackground);
            color: var(--vscode-button-prominentForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            white-space: nowrap;
        }
        .mode-toggle:hover {
            background: var(--vscode-button-prominentHoverBackground);
        }
        .chat-sessions {
            max-height: 120px;
            overflow-y: auto;
            border-bottom: 1px solid var(--vscode-sideBar-border);
            background: var(--vscode-sideBar-background);
            flex-shrink: 0;
        }
        .chat-session {
            padding: 8px 16px;
            border-bottom: 1px solid var(--vscode-sideBar-border);
            cursor: pointer;
            font-size: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .chat-session:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .chat-session.active {
            background: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
        }
        .chat-session-title {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .chat-session-delete {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            padding: 2px 6px;
            font-size: 10px;
            margin-left: 8px;
        }
        .chat-session-delete:hover {
            background: var(--vscode-errorBackground);
            color: var(--vscode-errorForeground);
        }
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            background: var(--vscode-sideBar-background);
        }
        .message {
            margin-bottom: 12px;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 13px;
            line-height: 1.4;
        }
        .message.user {
            background: var(--vscode-textLink-background);
            margin-left: 20%;
            color: var(--vscode-textLink-foreground);
        }
        .message.assistant {
            background: var(--vscode-editor-background);
            margin-right: 20%;
            border: 1px solid var(--vscode-panel-border);
        }
        .message.thinking {
            background: var(--vscode-textPreformat-background);
            margin-right: 20%;
            border: 1px solid var(--vscode-panel-border);
            font-style: italic;
            color: var(--vscode-descriptionForeground);
        }
        .message-input-container {
            padding: 16px;
            border-top: 1px solid var(--vscode-sideBar-border);
            background: var(--vscode-sideBar-background);
            flex-shrink: 0;
        }
        .message-input {
            display: flex;
            gap: 8px;
        }
        .message-input input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-size: 13px;
        }
        .message-input input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        .message-input button {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            white-space: nowrap;
        }
        .message-input button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .message-input button:disabled {
            background: var(--vscode-button-secondaryBackground);
            cursor: not-allowed;
        }
        .ai-plan {
            background: var(--vscode-textPreformat-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 12px;
            margin: 8px 0;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 11px;
            max-height: 200px;
            overflow-y: auto;
        }
        .tool-item {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 8px;
            margin: 5px 0;
        }
        .tool-name {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            font-size: 12px;
        }
        .tool-description {
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
            font-size: 11px;
        }
        .execute-button {
            background: var(--vscode-button-prominentBackground);
            color: var(--vscode-button-prominentForeground);
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 10px;
            cursor: pointer;
            margin-top: 5px;
        }
        .execute-button:hover {
            background: var(--vscode-button-prominentHoverBackground);
        }
        .status {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
            padding: 8px 16px;
            border-top: 1px solid var(--vscode-sideBar-border);
            background: var(--vscode-sideBar-background);
        }
        .scrollbar {
            scrollbar-width: thin;
            scrollbar-color: var(--vscode-scrollbarSlider-background) transparent;
        }
        .scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .scrollbar::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-background);
            border-radius: 3px;
        }
        .scrollbar::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-hoverBackground);
        }
        .context-hint {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
            font-style: italic;
        }
        .connection-status {
            text-align: center;
            font-size: 10px;
            padding: 4px 16px;
            border-top: 1px solid var(--vscode-sideBar-border);
            background: var(--vscode-sideBar-background);
            color: var(--vscode-descriptionForeground);
        }
        .status-indicator {
            font-weight: bold;
        }
        .status-indicator.connected {
            color: var(--vscode-debugIcon-startForeground);
        }
        .status-indicator.disconnected {
            color: var(--vscode-errorForeground);
        }
        .reconnect-button {
            padding: 4px 8px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
            white-space: nowrap;
        }
        .reconnect-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .error-banner {
            background-color: var(--vscode-errorBackground);
            color: var(--vscode-errorForeground);
            padding: 8px 12px;
            border-radius: 4px;
            margin: 8px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .error-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .error-icon {
            font-size: 16px;
        }
        .error-message {
            flex: 1;
            font-size: 12px;
        }
        .error-action {
            padding: 4px 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
            white-space: nowrap;
        }
        .error-action:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h2>🚀 PluginGeek AI</h2>
            <p>Powered by OllamaGeek</p>
            <div class="chat-controls">
                <button class="control-button" onclick="createNewChat()">New Chat</button>
                <button class="control-button" onclick="toggleYoloMode()" id="yoloModeToggle">🔥 YOLO Mode: disabled</button>
                <button class="control-button" onclick="toggleAutoExecute()" id="autoExecuteToggle">⚡ Auto-Execute: enabled</button>
            </div>
        </div>

        <div class="chat-sessions scrollbar" id="chatSessions">
            <!-- Chat sessions will be populated here -->
        </div>

        <div class="chat-messages scrollbar" id="chatMessages">
            <div class="message assistant">
                <strong>PluginGeek:</strong> Hello! I'm your AI development assistant. I can analyze your workspace, plan features, and execute tools directly in VS Code. What would you like to work on today?
            </div>

            <div class="message assistant" id="connectionHelpMessage" style="display: none;">
                <strong>PluginGeek:</strong> <em>🔗 Connection Status - I'm currently unable to connect to OllamaGeek. Please ensure the server is running on http://localhost:3003, then try reconnecting.</em>
            </div>
        </div>

        <div class="message-input-container">
            <div class="message-input">
                <input type="text" id="messageInput" placeholder="Ask me to create files, plan features... Use @file:path for context" />
                <button id="sendButton" onclick="sendMessage()">Send</button>
            </div>
            <div class="context-hint">
                💡 Use @file:src/App.js, @folder:components, @git, or @workspace for context
            </div>
        </div>

        <div class="status" id="status">
            🎬 AI Director Mode • Connected to OllamaGeek • Ready to assist
        </div>

        <div class="connection-status" id="connectionStatus">
            🔗 OllamaGeek: <span class="status-indicator connected">Connected</span>
            <button class="reconnect-button" onclick="attemptReconnect()" id="reconnectButton" style="display: none;">Reconnect</button>
        </div>

        <div class="error-banner" id="errorBanner" style="display: none;">
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-message" id="errorMessage">Connection to OllamaGeek failed</span>
                <button class="error-action" onclick="attemptReconnect()">Retry</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentChatId = null;
        let chatSessions = [];

        function createNewChat() {
            vscode.postMessage({
                command: 'createNewChat'
            });
        }

        function toggleAutoExecute() {
            vscode.postMessage({
                command: 'toggleAutoExecute'
            });
        }

        function toggleYoloMode() {
            vscode.postMessage({
                command: 'toggleYoloMode'
            });
        }

        function switchToChat(chatId) {
            vscode.postMessage({
                command: 'switchToChat',
                chatId: chatId
            });
        }

        function deleteChat(chatId) {
            vscode.postMessage({
                command: 'deleteChat',
                chatId: chatId
            });
        }

        function updateChatSessions(sessions, activeChatId) {
            chatSessions = sessions;
            currentChatId = activeChatId;

            const container = document.getElementById('chatSessions');
            container.innerHTML = '';

            sessions.forEach(session => {
                const sessionDiv = document.createElement('div');
                sessionDiv.className = \`chat-session \${session.id === activeChatId ? 'active' : ''}\`;
                sessionDiv.onclick = () => switchToChat(session.id);

                const modeIcon = session.mode === 'plan' ? '🧠' : '🔧';

                sessionDiv.innerHTML = \`
                    <div class="chat-session-title">\${modeIcon} \${session.title}</div>
                    <button class="chat-session-delete" onclick="deleteChat('\${session.id}')">×</button>
                \`;

                container.appendChild(sessionDiv);
            });
        }

        function updateMode(mode) {
            currentMode = mode;
            const modeToggle = document.getElementById('modeToggle');
            const modeIcons = { 'plan': '🧠', 'execute': '🔧' };
            const modeNames = { 'plan': 'Plan', 'execute': 'Execute' };

            modeToggle.textContent = \`\${modeIcons[mode]} \${modeNames[mode]} Mode\`;
            modeToggle.className = \`control-button \${mode === 'execute' ? 'active' : ''}\`;
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const button = document.getElementById('sendButton');
            const message = input.value.trim();

            if (message) {
                // Disable input while processing
                input.disabled = true;
                button.disabled = true;
                button.textContent = 'Thinking...';

                // Add user message to chat
                addMessage(message, 'user');

                // Add thinking indicator
                addThinkingIndicator();

                // Send to extension
                vscode.postMessage({
                    command: 'sendMessage',
                    text: message
                });

                // Clear input
                input.value = '';

                // Maintain focus on input for smooth conversation flow
                setTimeout(() => {
                    if (input) {
                        input.focus();
                    }
                }, 100); // Small delay to ensure DOM updates complete
            }
        }

        function addMessage(text, sender) {
            const messagesDiv = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${sender}\`;
            messageDiv.innerHTML = \`<strong>\${sender === 'user' ? 'You' : 'PluginGeek'}:</strong> \${text}\`;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function addThinkingIndicator() {
            const messagesDiv = document.getElementById('chatMessages');
            const thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'message thinking';
            thinkingDiv.id = 'thinkingIndicator';
            thinkingDiv.innerHTML = '<strong>PluginGeek:</strong> <em>🧠 Analyzing your request with OllamaGeek AI...</em>';
            messagesDiv.appendChild(thinkingDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function removeThinkingIndicator() {
            const thinkingDiv = document.getElementById('thinkingIndicator');
            if (thinkingDiv) {
                thinkingDiv.remove();
            }
        }

        function addAIResponse(response) {
            removeThinkingIndicator();

            const messagesDiv = document.getElementById('chatMessages');
            const responseDiv = document.createElement('div');
            responseDiv.className = 'message assistant';

            let content = \`<strong>PluginGeek:</strong> \${response.message}\`;

            // Add AI plan if available
            if (response.plan) {
                content += \`<div class="ai-plan">
                    <strong>🤖 AI Plan Generated:</strong><br>
                    <strong>Description:</strong> \${response.plan.description}<br>
                    <strong>Tools Required:</strong> \${response.plan.tools.length}<br><br>
                    <strong>Tool Details:</strong><br>
                    \${response.plan.tools.map((tool, index) => \`
                        <div class="tool-item">
                            <div class="tool-name">\${index + 1}. \${tool.name}</div>
                            <div class="tool-description">\${tool.description}</div>
                            <button class="execute-button" data-tool-name="\${tool.name}" data-tool-params="\${JSON.stringify(tool.parameters).replace(/"/g, '&quot;')}">
                                Execute Tool
                            </button>
                        </div>
                    \`).join('')}
                </div>\`;
            }

            responseDiv.innerHTML = content;
            messagesDiv.appendChild(responseDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            // Re-enable input
            document.getElementById('messageInput').disabled = false;
            document.getElementById('sendButton').disabled = false;
            document.getElementById('sendButton').textContent = 'Send';

            // Maintain focus on input box for smooth conversation flow
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.focus();
            }
        }

        function executeTool(toolName, parameters) {
            vscode.postMessage({
                command: 'executeTool',
                toolName: toolName,
                parameters: parameters
            });
        }

        function updateStatus(status, isError = false) {
            const statusDiv = document.getElementById('status');
            statusDiv.textContent = status;
            statusDiv.style.color = isError ? 'var(--vscode-errorForeground)' : 'var(--vscode-descriptionForeground)';
        }

        function showToolExecutionResult(toolName, result) {
            const messagesDiv = document.getElementById('chatMessages');
            const toolResultDiv = document.createElement('div');
            toolResultDiv.className = 'message assistant';
            toolResultDiv.innerHTML = \`<strong>PluginGeek:</strong> <em>Tool "\${toolName}" executed successfully.</em>\`;
            if (result && result.output) {
                toolResultDiv.innerHTML += \`<div class="ai-plan">
                    <strong>Output:</strong><br>
                    <pre>\${result.output}</pre>
                </div>\`;
            }
            if (result && result.error) {
                toolResultDiv.innerHTML += \`<div class="ai-plan" style="color: var(--vscode-errorForeground);">
                    <strong>Error:</strong><br>
                    <pre>\${result.error}</pre>
                </div>\`;
            }
            messagesDiv.appendChild(toolResultDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            // Maintain focus on input box for smooth conversation flow
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.focus();
            }
        }

        function attemptReconnect() {
            vscode.postMessage({
                command: 'reconnect'
            });

            // Show connecting state
            updateStatus('🔄 Attempting to reconnect to OllamaGeek...', false);
            updateConnectionStatus(false);
        }

        function showErrorBanner(message, showRetry = true) {
            const errorBanner = document.getElementById('errorBanner');
            const errorMessage = document.getElementById('errorMessage');
            const errorAction = document.querySelector('.error-action');

            errorMessage.textContent = message;
            errorAction.style.display = showRetry ? 'inline-block' : 'none';
            errorBanner.style.display = 'flex';

            // Maintain focus on input box even when showing errors
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.focus();
            }
        }

        function hideErrorBanner() {
            const errorBanner = document.getElementById('errorBanner');
            errorBanner.style.display = 'none';
        }

        function updateConnectionStatus(isConnected) {
            const statusDiv = document.getElementById('connectionStatus');
            const reconnectButton = document.getElementById('reconnectButton');
            const connectionHelpMessage = document.getElementById('connectionHelpMessage');

            // Add null checks to prevent errors
            if (!statusDiv || !reconnectButton || !connectionHelpMessage) {
                console.warn('Connection status elements not found, skipping update');
                return;
            }

            if (isConnected) {
                statusDiv.innerHTML = '🔗 OllamaGeek: <span class="status-indicator connected">Connected</span>';
                reconnectButton.style.display = 'none';
                connectionHelpMessage.style.display = 'none';
                hideErrorBanner();
            } else {
                statusDiv.innerHTML = '🔗 OllamaGeek: <span class="status-indicator disconnected">Disconnected</span>';
                reconnectButton.style.display = 'inline-block';
                connectionHelpMessage.style.display = 'block';
            }
        }

        // Initialize connection status
        updateConnectionStatus(true);

        // Check initial connection and show appropriate message
        setTimeout(async () => {
            try {
                const response = await fetch('http://localhost:3003/api/tools');
                if (!response.ok) {
                    updateConnectionStatus(false);
                }
            } catch (error) {
                updateConnectionStatus(false);
            }
        }, 1000);

        // Handle Enter key
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Add event delegation for execute tool buttons
        document.addEventListener('click', function(event) {
            if (event.target.classList.contains('execute-button')) {
                const toolName = event.target.getAttribute('data-tool-name');
                const toolParams = JSON.parse(event.target.getAttribute('data-tool-params'));
                executeTool(toolName, toolParams);
            }
        });

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'addAIResponse':
                    addAIResponse(message.response);
                    break;
                case 'updateStatus':
                    updateStatus(message.status, message.isError);
                    break;
                case 'showError':
                    removeThinkingIndicator();
                    addMessage(\`Sorry, I encountered an error: \${message.error}\`, 'assistant');
                    document.getElementById('messageInput').disabled = false;
                    document.getElementById('sendButton').disabled = false;
                    document.getElementById('sendButton').textContent = 'Send';

                    // Show error banner if needed
                    if (message.showBanner) {
                        showErrorBanner(message.error, true);
                    }
                    break;
                case 'toolExecutionResult':
                    showToolExecutionResult(message.toolName, message.result);
                    break;
                case 'chatSessionsUpdated':
                    updateChatSessions(message.sessions, message.currentChatId);
                    break;
                case 'modeChanged':
                    updateMode(message.mode);
                    break;
                case 'updateConnectionStatus':
                    updateConnectionStatus(message.status === 'connected');
                    break;
                case 'showReconnectSuccess':
                    updateStatus('✅ OllamaGeek connection restored. Ready to assist!', false);
                    hideErrorBanner();

                    // Maintain focus on input box after successful reconnect
                    const messageInput = document.getElementById('messageInput');
                    if (messageInput) {
                        messageInput.focus();
                    }
                    break;
                case 'showReconnectFailed':
                    const retryMessage = \`Connection failed. Retry \${message.retryCount}/\${message.maxRetries}\`;
                    updateStatus(\`❌ \${retryMessage}\`, true);
                    if (message.retryCount >= message.maxRetries) {
                        showErrorBanner('Maximum reconnection attempts reached. Please check if OllamaGeek is running.', true);
                    } else {
                        showErrorBanner(\`Connection failed. Retrying... (\${message.retryCount}/\${message.maxRetries})\`, true);
                    }

                    // Maintain focus on input box even after failed reconnect
                    const messageInput2 = document.getElementById('messageInput');
                    if (messageInput2) {
                        messageInput2.focus();
                    }
                    break;
                case 'yoloModeChanged':
                    const yoloMode = message.yoloMode;
                    const yoloModeToggle = document.getElementById('yoloModeToggle');
                    if (yoloModeToggle) {
                        yoloModeToggle.textContent = \`🔥 YOLO Mode: \${yoloMode ? 'ENABLED' : 'disabled'}\`;
                        yoloModeToggle.className = \`control-button \${yoloMode ? 'active' : ''}\`;
                    }
                    break;
                case 'autoExecuteChanged':
                    const autoExecute = message.autoExecute;
                    const autoExecuteToggle = document.getElementById('autoExecuteToggle');
                    if (autoExecuteToggle) {
                        autoExecuteToggle.textContent = \`⚡ Auto-Execute: \${autoExecute ? 'enabled' : 'disabled'}\`;
                        autoExecuteToggle.className = \`control-button \${autoExecute ? 'active' : ''}\`;
                    }
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    /**
     * Handle incoming message with real OllamaGeek AI
     */
    async handleMessage(text) {
        try {
            // Parse @ mentions for context injection
            const { parsedText, contextItems } = this.parseContextMentions(text);

            // Add to conversation history
            if (this.currentChatId && this.chatSessions.has(this.currentChatId)) {
                const chat = this.chatSessions.get(this.currentChatId);
                chat.messages.push({ role: 'user', content: text, timestamp: new Date().toISOString() });

                // Update chat title if it's still "New Chat"
                if (chat.title === 'New Chat' && chat.messages.length === 1) {
                    chat.title = this.generateChatTitle(parsedText);
                }
            }

            // Update status
            this.updateStatus(`🔧 AI Director Mode • Testing connection to OllamaGeek...`);

            // Test connection first
            const isConnected = await this.ollamaGeekClient.testConnection();
            if (!isConnected) {
                throw new Error('Cannot connect to OllamaGeek server. Please ensure it is running on http://localhost:3003');
            }

            // Get workspace context for AI planning
            this.updateStatus(`🎬 AI Director Mode • Analyzing workspace context...`);
            const workspaceContext = await this.getWorkspaceContext();

            // Enhance context with @ mentions
            this.updateStatus(`🎬 AI Director Mode • Enhancing context with @ mentions...`);
            const enhancedContext = await this.enhanceContextWithMentions(workspaceContext, contextItems);

            // Use the new unified /chat endpoint
            this.updateStatus(`🎬 AI Director Mode • Processing with OllamaGeek...`);
            const chatResponse = await this.ollamaGeekClient.chat(parsedText, enhancedContext);
            this.updateStatus(`🎬 AI Director Mode • Response received!`);

            // Handle different response types from the unified endpoint
            let response;
            switch (chatResponse.type) {
                case 'simple_chat':
                    response = {
                        message: chatResponse.message,
                        plan: null,
                        requiresApproval: false,
                        isSimpleChat: true
                    };
                    break;

                case 'planning_task':
                    response = {
                        message: chatResponse.message,
                        plan: { description: chatResponse.plan },
                        requiresApproval: false,
                        isPlanningTask: true
                    };
                    break;

                case 'execution_task':
                    response = {
                        message: chatResponse.message,
                        plan: {
                            description: chatResponse.message,
                            tools: chatResponse.tools || []
                        },
                        requiresApproval: chatResponse.requiresApproval,
                        isExecutionTask: true
                    };

                    // Handle execution based on complexity and settings
                    if (chatResponse.actionType === 'execution_simple' && (this.autoExecute || this.yoloMode)) {
                        // Auto-execute simple tasks
                        const executionResult = await this.executeApprovedPlan(response.plan);
                        if (executionResult.success) {
                            response.message += `\n\n⚡ **Auto-executed:** ${executionResult.message}`;
                            response.executionResults = executionResult.results;
                        } else {
                            response.message += `\n\n❌ **Auto-execution failed:** ${executionResult.error}`;
                        }
                    } else if (chatResponse.actionType === 'execution_complex' && this.yoloMode) {
                        // YOLO mode - execute immediately
                        response.message += `\n\n🔥 **YOLO MODE ACTIVE** - Executing immediately!`;
                        const yoloResult = await this.executeApprovedPlan(response.plan);
                        if (yoloResult.success) {
                            response.message += `\n\n⚡ **YOLO Execution Complete:** ${yoloResult.message}`;
                            response.executionResults = yoloResult.results;
                        } else {
                            response.message += `\n\n❌ **YOLO Execution Failed:** ${yoloResult.error}`;
                        }
                    } else if (chatResponse.requiresApproval) {
                        // Ask for approval
                        const approvalResult = await this.handlePlanApproval(response.plan);
                        if (approvalResult.success) {
                            response.message += `\n\n🔒 **Plan Approved & Executed:** ${approvalResult.message}`;
                            response.executionResults = approvalResult.results;
                        } else {
                            response.message += `\n\n❌ **Plan Execution Cancelled:** ${approvalResult.message}`;
                        }
                    }
                    break;

                default:
                    response = {
                        message: chatResponse.message || 'I received your request but couldn\'t determine how to handle it.',
                        plan: null,
                        requiresApproval: false
                    };
                    break;
            }

            // Add assistant message to chat
            if (this.currentChatId && this.chatSessions.has(this.currentChatId)) {
                const chat = this.chatSessions.get(this.currentChatId);
                chat.messages.push({ role: 'assistant', content: response.message, timestamp: new Date().toISOString() });
            }

            // Send response to webview
            this._view.webview.postMessage({
                command: 'addAIResponse',
                response: response
            });

        } catch (error) {
            console.error('Error handling message:', error);

            let errorMessage = error.message;
            let showErrorBanner = false;

            // Provide more helpful error messages and show appropriate UI
            if (error.message.includes('ECONNREFUSED')) {
                errorMessage = 'Cannot connect to OllamaGeek server. Please ensure it is running on http://localhost:3003';
                showErrorBanner = true;
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Request to OllamaGeek timed out. The server may be overloaded.';
                showErrorBanner = true;
            } else if (error.message.includes('Network Error')) {
                errorMessage = 'Network error connecting to OllamaGeek. Check your connection and server status.';
                showErrorBanner = true;
            } else if (error.message.includes('Cannot connect to OllamaGeek server')) {
                errorMessage = 'OllamaGeek server is not responding. Please check if it is running.';
                showErrorBanner = true;
            }

            this.updateStatus(`🎬 AI Director Mode • Error: ${errorMessage}`, true);

            // Send error to webview with banner flag
            this._view.webview.postMessage({
                command: 'showError',
                error: errorMessage,
                showBanner: showErrorBanner
            });
        }
    }







    /**
     * Parse @ mentions for context injection
     */
    parseContextMentions(text) {
        const contextItems = [];
        let parsedText = text;

        // Match @file, @folder, @git, @workspace patterns
        const mentionRegex = /@(\w+)(?::([^\s]+))?/g;
        let match;

        while ((match = mentionRegex.exec(text)) !== null) {
            const type = match[1];
            const path = match[2] || '';

            contextItems.push({
                type: type,
                path: path,
                fullMatch: match[0]
            });
        }

        return { parsedText, contextItems };
    }

    /**
     * Enhance context with @ mentions
     */
    async enhanceContextWithMentions(workspaceContext, contextItems) {
        const enhancedContext = { ...workspaceContext };

        for (const item of contextItems) {
            try {
                switch (item.type) {
                    case 'file':
                        const fileContent = await this.getFileContent(item.path);
                        if (fileContent) {
                            enhancedContext[`file_${item.path}`] = {
                                type: 'file',
                                path: item.path,
                                content: fileContent,
                                size: fileContent.length
                            };
                        }
                        break;

                    case 'folder':
                        const folderContents = await this.getFolderContents(item.path);
                        if (folderContents) {
                            enhancedContext[`folder_${item.path}`] = {
                                type: 'folder',
                                path: item.path,
                                contents: folderContents
                            };
                        }
                        break;

                    case 'git':
                        const gitStatus = await this.getGitStatus();
                        enhancedContext.git = gitStatus;
                        break;

                    case 'workspace':
                        const workspaceInfo = await this.getDetailedWorkspaceInfo();
                        enhancedContext.workspace = { ...enhancedContext.workspace, ...workspaceInfo };
                        break;
                }
            } catch (error) {
                console.error(`Error enhancing context with ${item.type}:`, error);
            }
        }

        return enhancedContext;
    }

    /**
     * Get file content for @file mentions
     */
    async getFileContent(filePath) {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) return null;

            const fullPath = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
            const content = await vscode.workspace.fs.readFile(fullPath);
            return Buffer.from(content).toString('utf-8');
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Get folder contents for @folder mentions
     */
    async getFolderContents(folderPath) {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) return null;

            const fullPath = vscode.Uri.joinPath(workspaceFolder.uri, folderPath);
            const items = await vscode.workspace.fs.readDirectory(fullPath);

            return items.map(([name, type]) => ({
                name,
                type: type === vscode.FileType.Directory ? 'directory' : 'file'
            }));
        } catch (error) {
            console.error(`Error reading folder ${folderPath}:`, error);
            return null;
        }
    }

    /**
     * Get git status for @git mentions
     */
    async getGitStatus() {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) return null;

            const gitPath = vscode.Uri.joinPath(workspaceFolder.uri, '.git');
            const hasGit = await vscode.workspace.fs.stat(gitPath).then(() => true).catch(() => false);

            if (!hasGit) {
                return { hasGit: false, status: 'not_initialized' };
            }

            // For now, just check if git exists
            // In a real implementation, you'd run git commands to get status
            return { hasGit: true, status: 'initialized' };

        } catch (error) {
            return { hasGit: false, status: 'unknown' };
        }
    }

    /**
     * Get detailed workspace info for @workspace mentions
     */
    async getDetailedWorkspaceInfo() {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) return {};

            const workspacePath = workspaceFolder.uri.fsPath;
            const structure = await this.analyzeWorkspaceStructure(workspacePath);

            return {
                structure: structure,
                language: this.detectLanguage(structure),
                framework: this.detectFramework(structure, this.detectLanguage(structure)),
                buildTool: this.detectBuildTool(structure),
                complexity: this.assessWorkspaceComplexity(structure)
            };
        } catch (error) {
            console.error('Error getting detailed workspace info:', error);
            return {};
        }
    }

    /**
     * Analyze workspace structure
     */
    async analyzeWorkspaceStructure(workspacePath) {
        const structure = {
            files: [],
            directories: [],
            rootFiles: []
        };

        try {
            const items = await vscode.workspace.fs.readDirectory(vscode.Uri.file(workspacePath));

            for (const item of items) {
                const itemPath = path.join(workspacePath, item[0]);
                const isDirectory = item[1] === vscode.FileType.Directory;

                if (isDirectory) {
                    structure.directories.push(item[0]);
                    // Recursively analyze subdirectories (limited depth)
                    const subItems = await this.analyzeSubdirectory(itemPath, 2);
                    structure.files.push(...subItems.files);
                    structure.directories.push(...subItems.directories);
                } else {
                    structure.rootFiles.push(item[0]);
                    structure.files.push(item[0]);
                }
            }
        } catch (error) {
            console.error('Error analyzing workspace structure:', error);
        }

        return structure;
    }

    /**
     * Analyze subdirectory with limited depth
     */
    async analyzeSubdirectory(dirPath, depth) {
        if (depth <= 0) return { files: [], directories: [] };

        const result = { files: [], directories: [] };

        try {
            const items = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dirPath));

            for (const item of items) {
                const itemPath = path.join(dirPath, item[0]);
                const isDirectory = item[1] === vscode.FileType.Directory;

                if (isDirectory) {
                    result.directories.push(path.relative(dirPath, itemPath));
                    if (depth > 1) {
                        const subResult = await this.analyzeSubdirectory(itemPath, depth - 1);
                        result.files.push(...subResult.files);
                        result.directories.push(...subResult.directories);
                    }
                } else {
                    result.files.push(path.relative(dirPath, itemPath));
                }
            }
        } catch (error) {
            console.error('Error analyzing subdirectory:', error);
        }

        return result;
    }

    /**
     * Detect programming language
     */
    detectLanguage(structure) {
        const fileExtensions = structure.files.map(file => require('path').extname(file).toLowerCase());

        if (fileExtensions.includes('.js') || fileExtensions.includes('.jsx')) return 'JavaScript';
        if (fileExtensions.includes('.ts') || fileExtensions.includes('.tsx')) return 'TypeScript';
        if (fileExtensions.includes('.py')) return 'Python';
        if (fileExtensions.includes('.java')) return 'Java';
        if (fileExtensions.includes('.cpp') || fileExtensions.includes('.c')) return 'C++';
        if (fileExtensions.includes('.go')) return 'Go';
        if (fileExtensions.includes('.rs')) return 'Rust';
        if (fileExtensions.includes('.php')) return 'PHP';
        if (fileExtensions.includes('.rb')) return 'Ruby';

        return 'Unknown';
    }

    /**
     * Detect framework
     */
    detectFramework(structure, language) {
        const rootFiles = structure.rootFiles.map(file => file.toLowerCase());
        const directories = structure.directories.map(dir => dir.toLowerCase());

        // JavaScript/TypeScript frameworks
        if (language === 'JavaScript' || language === 'TypeScript') {
            if (rootFiles.includes('package.json')) {
                if (rootFiles.includes('next.config.js') || directories.includes('pages')) return 'Next.js';
                if (rootFiles.includes('vite.config.js')) return 'Vite';
                if (rootFiles.includes('webpack.config.js')) return 'Webpack';
                if (rootFiles.includes('angular.json')) return 'Angular';
                if (rootFiles.includes('vue.config.js')) return 'Vue.js';
                return 'Node.js';
            }
        }

        // Python frameworks
        if (language === 'Python') {
            if (rootFiles.includes('requirements.txt')) return 'Flask/Django';
            if (rootFiles.includes('pyproject.toml')) return 'Poetry';
            if (rootFiles.includes('setup.py')) return 'Setuptools';
        }

        // Other frameworks
        if (rootFiles.includes('pom.xml')) return 'Maven';
        if (rootFiles.includes('build.gradle')) return 'Gradle';
        if (rootFiles.includes('cargo.toml')) return 'Cargo';
        if (rootFiles.includes('go.mod')) return 'Go Modules';

        return 'None';
    }

    /**
     * Detect build tool
     */
    detectBuildTool(structure) {
        const rootFiles = structure.rootFiles.map(file => file.toLowerCase());

        if (rootFiles.includes('package.json')) return 'npm/yarn';
        if (rootFiles.includes('requirements.txt')) return 'pip';
        if (rootFiles.includes('pom.xml')) return 'Maven';
        if (rootFiles.includes('build.gradle')) return 'Gradle';
        if (rootFiles.includes('cargo.toml')) return 'Cargo';
        if (rootFiles.includes('go.mod')) return 'Go';

        return 'None';
    }

    /**
     * Assess workspace complexity
     */
    assessWorkspaceComplexity(structure) {
        const fileCount = structure.files.length;
        const dirCount = structure.directories.length;

        if (fileCount > 100 || dirCount > 20) return 'high';
        if (fileCount > 50 || dirCount > 10) return 'medium';
        return 'low';
    }

    /**
     * Generate chat title from first message
     */
    generateChatTitle(message) {
        // Take first 50 characters and clean up
        let title = message.substring(0, 50).trim();
        if (title.length === 50) title += '...';
        return title;
    }

    /**
     * Get mode status for display
     */






    /**
     * Handle tool execution request from webview
     */
    async handleToolExecution(toolName, parameters) {
        try {
            this.updateStatus(`🔧 Executing tool: ${toolName}...`);
            const result = await this.ollamaGeekClient.executeTool(toolName, parameters);
            this.updateStatus(`✅ Tool "${toolName}" executed successfully.`);
            this._view.webview.postMessage({
                command: 'toolExecutionResult',
                toolName: toolName,
                result: result
            });
        } catch (error) {
            console.error('Error executing tool:', error);
            this.updateStatus(`❌ Error executing tool "${toolName}": ${error.message}`, true);
            this._view.webview.postMessage({
                command: 'toolExecutionResult',
                toolName: toolName,
                result: { error: error.message }
            });
        }
    }

    /**
     * Get current workspace context
     */
    async getWorkspaceContext() {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder found');
            }

            const workspacePath = workspaceFolder.uri.fsPath;

            // Basic context for now - in the future this would use ContextManager
            return {
                workspace: {
                    path: workspacePath,
                    name: require('path').basename(workspacePath),
                    language: 'Unknown',
                    framework: 'Unknown'
                },
                files: [],
                directories: []
            };
        } catch (error) {
            console.error('Error getting workspace context:', error);
            return {};
        }
    }

    /**
     * Format AI response for display
     */
    formatAIResponse(userRequest, aiPlan) {
        const toolCount = aiPlan.tools.length;
        const description = aiPlan.description;

        let response = `I've analyzed your request: "${userRequest}"\n\n`;
        response += `🧠 **AI Plan Generated:** ${description}\n\n`;
        response += `🔧 **Tools Required:** ${toolCount} tool${toolCount !== 1 ? 's' : ''}\n\n`;

        if (toolCount > 0) {
            response += `The AI has identified ${toolCount} action${toolCount !== 1 ? 's' : ''} needed to complete your request. `;
            response += `You can execute each tool individually, or I can help you run the entire plan. `;
            response += `Each tool below shows exactly what will be executed.`;
        }

        return response;
    }

    /**
     * Update status in webview
     */
    updateStatus(status, isError = false) {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateStatus',
                status: status,
                isError: isError
            });
        }
    }

    /**
     * Create plan.md file for build tasks in plan mode
     */
    async createPlanFile(userRequest, aiPlan) {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) return null;

            const planContent = this.generatePlanMarkdown(userRequest, aiPlan);
            const planPath = vscode.Uri.joinPath(workspaceFolder.uri, 'plan.md');

            await vscode.workspace.fs.writeFile(planPath, new TextEncoder().encode(planContent));

            return {
                success: true,
                path: planPath.fsPath,
                message: 'Plan.md file created successfully'
            };
        } catch (error) {
            console.error('Error creating plan.md:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate markdown content for plan.md
     */
    generatePlanMarkdown(userRequest, aiPlan) {
        const timestamp = new Date().toISOString();
        const toolCount = aiPlan.tools.length;

        let markdown = `# AI Development Plan\n\n`;
        markdown += `**Generated:** ${timestamp}\n`;
        markdown += `**Request:** ${userRequest}\n`;
        markdown += `**Mode:** Plan Mode\n\n`;

        markdown += `## Overview\n\n`;
        markdown += `${aiPlan.description}\n\n`;

        markdown += `## Tools Required\n\n`;
        markdown += `**Total Tools:** ${toolCount}\n\n`;

        aiPlan.tools.forEach((tool, index) => {
            markdown += `### ${index + 1}. ${tool.name}\n\n`;
            markdown += `**Description:** ${tool.description}\n\n`;
            markdown += `**Parameters:**\n`;
            Object.entries(tool.parameters).forEach(([key, value]) => {
                markdown += `- \`${key}\`: ${value}\n`;
            });
            markdown += `\n`;
        });

        markdown += `## Next Steps\n\n`;
        markdown += `1. Review the plan above\n`;
        markdown += `2. Switch to Execute mode when ready to implement\n`;
        markdown += `3. Execute tools individually or use "Execute All"\n\n`;

        markdown += `---\n`;
        markdown += `*Generated by PluginGeek AI powered by OllamaGeek*\n`;

        return markdown;
    }

    /**
     * Handle plan approval for complex tasks
     */
    async handlePlanApproval(aiPlan) {
        try {
            // Show approval dialog
            const approved = await vscode.window.showInformationMessage(
                'Complex task detected. Do you approve this plan?',
                'Approve & Execute',
                'Cancel'
            );

            if (approved === 'Approve & Execute') {
                // Execute the approved plan
                return await this.executeApprovedPlan(aiPlan);
            } else {
                return {
                    success: false,
                    message: 'Plan execution cancelled by user'
                };
            }
        } catch (error) {
            console.error('Error handling plan approval:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute an approved plan
     */
    async executeApprovedPlan(aiPlan) {
        try {
            this.updateStatus('🔒 Executing approved plan...');
            console.log('🔧 Executing plan with tools:', JSON.stringify(aiPlan.tools, null, 2));

            const results = [];
            for (const tool of aiPlan.tools) {
                try {
                    console.log(`🔧 Executing tool: ${tool.name} with parameters:`, JSON.stringify(tool.parameters, null, 2));
                    const result = await this.ollamaGeekClient.executeTool(tool.name, tool.parameters);
                    results.push({
                        tool: tool.name,
                        success: true,
                        result
                    });
                } catch (error) {
                    console.error(`❌ Tool execution failed: ${tool.name}:`, error);
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
                message: 'Approved plan executed successfully'
            };
        } catch (error) {
            console.error('Error executing approved plan:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Simplified intent classification - no AI calls, just reliable pattern matching
        // Simple, robust approach: we only handle math and greetings directly
    // Everything else goes to OllamaGeek for full AI planning

    // Remove the old AI-powered classification method since we're not using it
    // async classifyIntent(text) { ... } - REMOVED

    // Remove the fallback method since we're not using it
    // fallbackIntentClassification(text) { ... } - REMOVED
}

module.exports = { ChatViewProvider };
