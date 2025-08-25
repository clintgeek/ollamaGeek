# 🚀 PluginGeek - VS Code Extension

**AI-powered development assistant powered by OllamaGeek**

PluginGeek is a VS Code extension that provides intelligent AI-powered development capabilities by integrating with OllamaGeek, your local AI orchestration server.

## ✨ Features

- **🧠 AI-Powered Planning**: Generate intelligent feature plans using OllamaGeek
- **🔍 Context Analysis**: Automatically analyze your workspace structure and context
- **💬 Chat Interface**: Interactive chat with your AI development assistant
- **🔧 Tool Execution**: Execute AI-generated plans directly in VS Code
- **📁 Workspace Intelligence**: Smart detection of languages, frameworks, and project structure

## 🚀 Quick Start

### Prerequisites

1. **OllamaGeek Server**: Make sure OllamaGeek is running on `http://localhost:3003`
2. **VS Code**: Version 1.74.0 or higher

### Installation

1. **Clone or download** this extension folder
2. **Open VS Code** in the extension directory
3. **Press F5** to run the extension in Extension Development Host
4. **Or install manually**:
   - Copy the extension folder to your VS Code extensions directory
   - Restart VS Code

### Configuration

The extension will automatically use the default OllamaGeek URL (`http://localhost:3003`). You can customize this in VS Code settings:

1. Open VS Code Settings (`Cmd/Ctrl + ,`)
2. Search for "PluginGeek"
3. Update the `OllamaGeek URL` setting if needed

## 🎯 Commands

### `PluginGeek: Start AI Chat`
Opens an interactive chat interface with your AI assistant.

### `PluginGeek: Plan Feature`
Generate an intelligent plan for implementing a feature:
1. Enter your feature description
2. PluginGeek analyzes your workspace context
3. OllamaGeek generates a detailed plan with tools and steps
4. View the plan in a formatted markdown document

### `PluginGeek: Analyze Context`
Analyze your current workspace context:
- Programming language detection
- Framework identification
- Project structure analysis
- Git status
- File and directory information

## 🏗️ Architecture

```
VS Code Extension (PluginGeek)
    ↓
OllamaGeek Server (AI Brain)
    ↓
Local Ollama Instance (AI Power)
```

### Components

- **`extension.js`**: Main extension entry point
- **`ollamaGeekClient.js`**: Client for communicating with OllamaGeek
- **`contextManager.js`**: Workspace context analysis and management
- **`chatPanel.js`**: Interactive chat interface

## 🔧 Development

### Project Structure
```
pluginGeek/
├── src/
│   ├── extension.js          # Main extension
│   ├── ollamaGeekClient.js   # OllamaGeek client
│   ├── contextManager.js     # Context management
│   └── chatPanel.js          # Chat interface
├── package.json              # Extension manifest
└── README.md                 # This file
```

### Running in Development Mode

1. **Open the extension folder** in VS Code
2. **Press F5** to launch Extension Development Host
3. **Test commands** in the new VS Code window
4. **Check console output** in the original VS Code window

### Building for Production

1. **Install dependencies**: `npm install`
2. **Package extension**: Use VS Code's extension packaging tools
3. **Install VSIX**: Install the generated `.vsix` file

## 🎨 Customization

### Adding New Commands

1. **Register command** in `extension.js`:
```javascript
const newCommand = vscode.commands.registerCommand('pluginGeek.newCommand', () => {
    // Your command logic here
});
context.subscriptions.push(newCommand);
```

2. **Add to package.json**:
```json
{
    "command": "pluginGeek.newCommand",
    "title": "PluginGeek: New Command",
    "category": "PluginGeek"
}
```

### Extending Context Analysis

Modify `contextManager.js` to add new context detection:
- Language detection
- Framework identification
- Project structure analysis
- Custom patterns

## 🔗 Integration with OllamaGeek

PluginGeek communicates with OllamaGeek through HTTP APIs:

- **`/api/plan/enhanced`**: Generate feature plans
- **`/api/tools`**: Get available tools
- **`/health`**: Check server status

### Context Flow

1. **PluginGeek** analyzes workspace context
2. **Sends context** to OllamaGeek for planning
3. **OllamaGeek** uses AI to generate tool plans
4. **PluginGeek** executes plans in VS Code

## 🐛 Troubleshooting

### Common Issues

1. **"Connection failed"**: Ensure OllamaGeek is running on the correct port
2. **"No workspace found"**: Open a folder in VS Code
3. **"Command not found"**: Check if the extension is properly activated

### Debug Mode

1. **Open Developer Tools** in Extension Development Host (`Help > Toggle Developer Tools`)
2. **Check Console** for error messages
3. **Verify network requests** to OllamaGeek

## 🚧 Roadmap

- [ ] **Real-time context updates** as files change
- [ ] **Advanced tool execution** with progress tracking
- [ ] **Custom AI models** selection
- [ ] **Project templates** and scaffolding
- [ ] **Code review** and analysis
- [ ] **Performance optimization** suggestions

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

## 📄 License

This extension is part of the OllamaGeek project. See the main project for license information.

## 🆘 Support

- **Issues**: Report bugs and feature requests
- **Discussions**: Ask questions and share ideas
- **Documentation**: Check the main OllamaGeek docs

---

**Happy coding with PluginGeek! 🚀**
