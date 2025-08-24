const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { OllamaOrchestrator } = require('./services/orchestrator');
const { EmbeddingClassifier } = require('./services/embeddingClassifier');
const { RequestLogger } = require('./middleware/requestLogger');
const { ErrorHandler } = require('./middleware/errorHandler');
const { SessionManager } = require('./services/sessionManager');
const { SmartContextManager } = require('./services/smartContextManager');

const app = express();
const PORT = process.env.PORT || 3003;

// Initialize services
const orchestrator = new OllamaOrchestrator();
const embeddingClassifier = new EmbeddingClassifier();
const sessionManager = new SessionManager();
const contextManager = new SmartContextManager();

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

// Session management endpoint (for debugging)
app.get('/api/sessions', (req, res) => {
  res.json(sessionManager.getStats());
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
    // Session management: Create or get session ID
    const userAgent = req.get('User-Agent') || 'unknown';
    const sessionId = sessionManager.getSessionId(req.body, userAgent);
    const sessionHistory = sessionManager.getSessionHistory(sessionId);

    // Log session information
    console.log(`🆔 Session: ${sessionId} | History: ${sessionHistory.length} messages | User-Agent: ${userAgent.substring(0, 50)}...`);

    // Use embedding-based classification for intelligent model selection
    const analysis = await embeddingClassifier.classifyRequest(req.body);
    const recommendedModel = analysis.recommendedModel;

    // Log the embedding classification decision
    console.log(`🧠 Embedding Classification: "${req.body.model}" -> "${recommendedModel}"`);
    console.log(`📊 Analysis: ${analysis.taskType} | ${analysis.complexity} | ${analysis.language} | ${analysis.reasoning}`);

    // Get smart context for the request (fast heuristics + AI when needed)
    const context = await contextManager.getSmartContext(req.body, analysis.taskType, analysis.complexity);
    if (context.files.length > 0 || context.gitStatus || context.reasoning) {
      console.log(`📁 Smart Context: ${contextManager.formatContext(context)}`);
    }

    // Check if planning is needed
    if (analysis.needsPlanning) {
      const planningSteps = analysis.planningSteps;
      console.log(`📋 Planning Required: ${planningSteps.join(' → ')}`);
    }

        // Forward to Ollama with the intelligently selected model
    const axios = require('axios');

        // Debug: Log what we're sending to Ollama
    const ollamaRequest = {
      ...req.body,
      model: recommendedModel,
      stream: req.body.stream !== false // Default to true for Continue compatibility
    };

    // Clean the request to remove any potentially problematic fields
    const cleanRequest = {
      model: ollamaRequest.model,
      messages: ollamaRequest.messages,
      stream: ollamaRequest.stream
    };

    // Add options if they exist and are valid
    if (ollamaRequest.options && typeof ollamaRequest.options === 'object') {
      cleanRequest.options = ollamaRequest.options;
    }

    // Add any other valid Ollama parameters
    if (ollamaRequest.template) cleanRequest.template = ollamaRequest.template;
    if (ollamaRequest.context) cleanRequest.context = ollamaRequest.context;
    if (ollamaRequest.keep_alive) cleanRequest.keep_alive = ollamaRequest.keep_alive;

    console.log(`📤 Sending to Ollama:`, JSON.stringify(cleanRequest, null, 2));
    console.log(`🔍 Original request body:`, JSON.stringify(req.body, null, 2));
    console.log(`🎯 Recommended model:`, recommendedModel);
    console.log(`🧹 Cleaned request:`, JSON.stringify(cleanRequest, null, 2));

    // Check if streaming is requested
    const isStreaming = ollamaRequest.stream;

    if (isStreaming) {
      // Handle streaming response
      try {
        const ollamaResponse = await axios.post(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`, cleanRequest, {
          responseType: 'stream',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Set streaming headers
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Transfer-Encoding', 'chunked');

                // Intercept the stream to inject model information
        let firstChunk = true;
        ollamaResponse.data.on('data', (chunk) => {
          if (firstChunk) {
            // Inject model info into the first chunk
            const chunkStr = chunk.toString();
            if (chunkStr.includes('"model"')) {
              // Replace the model name with our enhanced version
              const enhancedChunk = chunkStr.replace(
                `"model":"${recommendedModel}"`,
                `"model":"${recommendedModel} (OllamaGeek enhanced)"`
              );
              res.write(enhancedChunk);
            } else {
              res.write(chunk);
            }
            firstChunk = false;
          } else {
            res.write(chunk);
          }
        });

        ollamaResponse.data.on('end', () => {
          res.end();
        });

        // Update session after successful streaming response
        sessionManager.updateSession(sessionId, req.body.messages || []);
      } catch (ollamaError) {
        console.error('❌ Ollama streaming error:', {
          status: ollamaError.response?.status,
          data: ollamaError.response?.data,
          message: ollamaError.message,
          request: ollamaRequest
        });
        throw ollamaError;
      }
    } else {
      // Handle non-streaming response
      try {
        const ollamaResponse = await axios.post(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`, cleanRequest, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

                // Enhance the response with model information
        const enhancedResponse = {
          ...ollamaResponse.data,
          model: `${ollamaResponse.data.model} (OllamaGeek enhanced)`,
          _ollamaGeek: {
            originalModel: req.body.model,
            selectedModel: recommendedModel,
            taskType: analysis.taskType,
            complexity: analysis.complexity,
            reasoning: analysis.reasoning
          }
        };

        // Return the enhanced response
        res.json(enhancedResponse);

        // Update session after successful response
        sessionManager.updateSession(sessionId, req.body.messages || []);
      } catch (ollamaError) {
        console.error('❌ Ollama non-streaming error:', {
          status: ollamaError.response?.status,
          data: ollamaError.response?.data,
          message: ollamaError.message,
          request: ollamaRequest
        });
        throw ollamaError;
      }
    }
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
  console.log(`🆔 Session management enabled with ${sessionManager.maxHistoryLength} message history`);
});

// Clean up expired sessions every 5 minutes
setInterval(() => {
  sessionManager.cleanupExpiredSessions();
}, 5 * 60 * 1000);

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
