const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { OllamaOrchestrator } = require('./services/orchestrator');
const { RequestLogger } = require('./middleware/requestLogger');
const { ErrorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3003;

// Initialize the orchestrator
const orchestrator = new OllamaOrchestrator();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
if (process.env.LOG_REQUESTS === 'true') {
  app.use(morgan('combined'));
  app.use(RequestLogger.middleware);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ollama-geek',
    timestamp: new Date().toISOString()
  });
});

// Ollama API endpoints - these maintain complete compatibility
app.post('/api/generate', async (req, res, next) => {
  try {
    const result = await orchestrator.handleGenerate(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/chat', async (req, res, next) => {
  try {
    const axios = require('axios');

    // Get available models to resolve model names
    const modelsResponse = await axios.get(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/tags`);
    const availableModels = modelsResponse.data.models || [];

    // Extract the requested model name
    const requestedModel = req.body.model;

    // Find exact match or best fallback
    let resolvedModel = requestedModel;
    if (!availableModels.find(m => m.name === requestedModel)) {
      // Try to find a model that starts with the requested name
      const fallbackModel = availableModels.find(m => m.name.startsWith(requestedModel.split(':')[0]));
      if (fallbackModel) {
        resolvedModel = fallbackModel.name;
        console.log(`Model resolution: ${requestedModel} -> ${resolvedModel}`);
      }
    }

    // Forward request with resolved model name
    const ollamaResponse = await axios.post(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`, {
      ...req.body,
      model: resolvedModel
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

        // Stream the response directly to maintain Ollama's exact format
    // This preserves the original headers and streaming behavior
    res.write(ollamaResponse.data);
    res.end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/embeddings', async (req, res, next) => {
  try {
    const result = await orchestrator.handleEmbeddings(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/tags', async (req, res, next) => {
  try {
    const result = await orchestrator.handleTags();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/pull', async (req, res, next) => {
  try {
    const result = await orchestrator.handlePull(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/push', async (req, res, next) => {
  try {
    const result = await orchestrator.handlePush(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Additional orchestration endpoints (invisible to standard Ollama clients)
app.post('/api/orchestrate', async (req, res, next) => {
  try {
    const result = await orchestrator.handleOrchestration(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use(ErrorHandler.middleware);

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'This endpoint is not supported by the Ollama API wrapper'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 OllamaGeek API wrapper running on port ${PORT}`);
  console.log(`📡 Forwarding requests to: ${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}`);
  console.log(`🧠 Orchestration enabled: ${process.env.ENABLE_AGENTIC_ORCHESTRATION === 'true' ? 'Yes' : 'No'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
