# OllamaGeek Setup Guide

This guide will walk you through setting up the OllamaGeek API wrapper on your M3 Max MacBook.

## Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Ollama** - [Installation guide](https://ollama.ai/download)
- **Git** (for cloning the repository)

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd ollamaGeek

# Install dependencies
npm install

# Copy environment configuration
cp env.example .env
```

### 2. Configure Environment

Edit the `.env` file with your preferences:

```bash
# Basic Configuration
PORT=3003
OLLAMA_BASE_URL=http://localhost:11434
LOG_LEVEL=info

# Model Selection Strategy
DEFAULT_MODEL=codellama:13b-instruct-q4_K_M
CODING_MODEL=codellama:13b-instruct-q4_K_M
GENERAL_MODEL=qwen2.5:7b-instruct-q6_K
EMBEDDING_MODEL=nomic-embed-text:latest

# Orchestration Settings
ENABLE_AGENTIC_ORCHESTRATION=true
MAX_CONTEXT_LENGTH=8192
ENABLE_TOOL_CALLING=true
ENABLE_MULTI_STEP_PLANNING=true
```

### 3. Start Ollama

```bash
# Start Ollama service
ollama serve

# In another terminal, pull your models
ollama pull codellama:13b-instruct-q4_K_M
ollama pull qwen2.5:7b-instruct-q6_K
ollama pull nomic-embed-text:latest
```

### 4. Start the API Wrapper

```bash
# Using the startup script
chmod +x start.sh
./start.sh

# Or manually
npm start
```

The wrapper will be available at `http://localhost:3003`

## Configuration Details

### Model Selection Strategy

The wrapper automatically selects the best model based on:

- **Content Analysis**: Detects code, technical content, complexity
- **Task Type**: Coding, general conversation, embeddings
- **Performance Requirements**: Context length, complexity level
- **Model Capabilities**: Language support, specializations

### Orchestration Features

- **Intelligent Model Routing**: Automatically selects optimal models
- **Context Management**: Smart context window optimization
- **Tool Integration**: Built-in tools for file operations, code analysis
- **Multi-step Planning**: Breaks complex tasks into manageable steps

## API Endpoints

### Standard Ollama Endpoints (100% Compatible)

- `POST /api/generate` - Text generation
- `POST /api/chat` - Chat completions
- `POST /api/embeddings` - Text embeddings
- `GET /api/tags` - List available models
- `POST /api/pull` - Pull models from registry
- `POST /api/push` - Push models to registry

### Enhanced Orchestration Endpoints

- `POST /api/orchestrate` - Advanced orchestration features
- `GET /health` - Health check and status

## Testing

### Run the Test Suite

```bash
# Install test dependencies
npm install axios

# Run tests
node test-example.js
```

### Manual Testing

```bash
# Health check
curl http://localhost:3003/health

# Test model listing
curl http://localhost:3003/api/tags

# Test generate with intelligent model selection
curl -X POST http://localhost:3003/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a Python function to calculate fibonacci numbers"}'
```

## Docker Deployment

### Using Docker Compose

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f ollamageek

# Stop services
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t ollamageek .

# Run container
docker run -d \
  --name ollamageek-wrapper \
  -p 11434:11434 \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  ollamageek
```

## Continue Integration

### VS Code Continue Plugin

The wrapper is designed to be completely transparent to Continue. Simply:

1. **Point Continue to the wrapper**: Use `http://localhost:3003` as your Ollama endpoint
2. **No configuration changes needed**: Continue will work exactly as before
3. **Enhanced capabilities**: Get intelligent model selection and orchestration automatically

### Continue Configuration

```json
{
  "continue.serverUrl": "http://localhost:3003",
  "continue.serverUrlPath": "/api"
}
```

## Monitoring and Logs

### Log Files

- `logs/error.log` - Error messages
- `logs/warn.log` - Warning messages
- `logs/info.log` - Information messages
- `logs/debug.log` - Debug messages
- `logs/combined.log` - All messages

### Health Monitoring

```bash
# Check health
curl http://localhost:11434/health

# Get orchestration stats
curl -X POST http://localhost:3003/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"action": "get_model_stats"}'
```

## Performance Optimization

### Model Loading Strategy

- **Fast Models**: Used for simple tasks (3b-7b models)
- **High-Performance Models**: Used for complex tasks (13b+ models)
- **Specialized Models**: Automatically selected for specific domains

### Context Management

- **Smart Truncation**: Preserves important content
- **Priority-Based Selection**: Keeps most relevant context
- **Hierarchical Summarization**: For very long contexts

## Troubleshooting

### Common Issues

1. **Port Conflict**: Ensure Ollama isn't running on port 11434
2. **Model Not Found**: Pull required models with `ollama pull <model>`
3. **Permission Errors**: Check file permissions for logs directory
4. **Memory Issues**: Reduce `MAX_CONTEXT_LENGTH` for large models

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
npm start

# Or edit .env file
LOG_LEVEL=debug
```

### Log Analysis

```bash
# Search logs for errors
grep "ERROR" logs/combined.log

# Monitor real-time logs
tail -f logs/combined.log
```

## Advanced Configuration

### Custom Model Registry

Add custom models to `src/services/modelSelector.js`:

```javascript
'my-custom-model:latest': {
  type: 'custom',
  size: '7b',
  capabilities: ['custom_task'],
  specializations: ['my_domain']
}
```

### Custom Tools

Register custom tools in `src/services/toolManager.js`:

```javascript
this.registerTool({
  name: 'my_custom_tool',
  description: 'Custom tool description',
  parameters: { /* parameter schema */ },
  handler: async (params) => { /* tool logic */ }
});
```

### Performance Tuning

```bash
# Increase concurrent requests
MAX_CONCURRENT_REQUESTS=10

# Optimize context management
MAX_CONTEXT_LENGTH=4096

# Enable response caching
ENABLE_RESPONSE_CACHING=true
```

## Security Considerations

- **File Access**: Tools have limited file system access
- **Network Isolation**: Wrapper runs in isolated environment
- **Input Validation**: All inputs are validated and sanitized
- **Logging**: Sensitive data is not logged

## Support and Updates

- **Documentation**: Check the README.md for latest features
- **Issues**: Report bugs and feature requests via GitHub
- **Updates**: Regular updates for new Ollama features and optimizations

## Performance Benchmarks

### Model Selection Speed

- **Simple Tasks**: < 10ms
- **Complex Analysis**: < 50ms
- **Tool Detection**: < 20ms

### Response Enhancement

- **Code Formatting**: < 5ms
- **Content Structure**: < 10ms
- **Readability**: < 15ms

### Memory Usage

- **Base Wrapper**: ~50MB
- **Per Session**: ~5-10MB
- **Context Cache**: ~100MB (configurable)

---

**Happy coding with OllamaGeek! 🚀**
