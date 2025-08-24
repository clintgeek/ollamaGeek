# OllamaGeek - Intelligent API Wrapper

A sophisticated API wrapper for Ollama that provides Cursor-like agentic orchestration while maintaining complete compatibility with the Ollama API. This wrapper acts as an intelligent intermediary that can:

- Automatically select the best model for each request
- Handle context management and optimization
- Provide tool calling capabilities
- Execute multi-step planning and scaffolding
- Maintain invisibility to Continue and other clients

## Features

### 🧠 Intelligent Model Selection
- **Automatic Model Routing**: Routes requests to the most appropriate model based on content type
- **Context-Aware Selection**: Chooses models based on task complexity and context length
- **Performance Optimization**: Loads and unloads models strategically

### 🔧 Tool Integration
- **Native Tool Calling**: Supports function calling and tool execution
- **Context Management**: Intelligent context window management and optimization
- **Multi-Step Planning**: Breaks complex tasks into manageable steps

### 🚀 Performance Features
- **Request Batching**: Groups related requests for efficiency
- **Model Preloading**: Preloads frequently used models
- **Response Caching**: Caches common responses to reduce latency

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp env.example .env
   ```
4. Configure your `.env` file with your Ollama instance details
5. Start the server:
   ```bash
   npm run dev
   ```

## Configuration

The wrapper runs on port 11434 by default (same as Ollama) and forwards requests to your local Ollama instance. Key configuration options:

- **Model Selection**: Configure which models to use for different types of tasks
- **Orchestration**: Enable/disable agentic features
- **Performance**: Tune request timeouts and concurrency limits
- **Logging**: Control what gets logged for debugging

## API Compatibility

This wrapper implements the complete Ollama API specification:

- `POST /api/generate` - Text generation
- `POST /api/chat` - Chat completions
- `POST /api/embeddings` - Text embeddings
- `GET /api/tags` - List available models
- `POST /api/pull` - Pull models from registry
- `POST /api/push` - Push models to registry

## Model Strategy

The wrapper automatically selects models based on:

- **Coding Tasks**: Uses `codellama:13b-instruct-q4_K_M` or `deepseek-coder:6.7b-instruct-q6_K`
- **General Tasks**: Uses `qwen2.5:7b-instruct-q6_K` or `llama3.1:8b-instruct-q4_K_M`
- **Embeddings**: Uses `nomic-embed-text:latest`
- **Specialized Tasks**: Routes to appropriate specialized models

## Architecture

```
Client Request → API Wrapper → Orchestration Engine → Model Selection → Ollama → Response Processing → Client
```

The orchestration engine:
1. Analyzes the request content and context
2. Selects the optimal model
3. Manages context windows
4. Handles tool calls if needed
5. Processes and optimizes responses
6. Maintains conversation state

## Development

- **Development Mode**: `npm run dev` (with hot reload)
- **Production**: `npm start`
- **Testing**: `npm test`
- **Linting**: `npm run lint`

## License

MIT License - see LICENSE file for details.
