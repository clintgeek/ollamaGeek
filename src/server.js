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
const { AgenticWorkflowExecutor } = require('./services/agenticWorkflowExecutor');
const { SimpleToolAnalyzer } = require('./services/simpleToolAnalyzer');
const { AICodeAnalyzer } = require('./services/aiCodeAnalyzer');

// Helper function to generate workflow summary
function generateWorkflowSummary(workflowResults) {
  const { workflow, steps, success } = workflowResults;

  if (!success) {
    return `Workflow '${workflow}' failed to execute`;
  }

  return `Workflow '${workflow}' completed successfully with ${steps} steps. Project created and ready to use!`;
}

const app = express();
const PORT = process.env.PORT || 3003;

// Initialize services
const orchestrator = new OllamaOrchestrator();
const embeddingClassifier = new EmbeddingClassifier();
const sessionManager = new SessionManager();
const contextManager = new SmartContextManager();
const agenticExecutor = new AgenticWorkflowExecutor();
const toolAnalyzer = new SimpleToolAnalyzer();
const aiCodeAnalyzer = new AICodeAnalyzer();

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

// Tool execution endpoint
app.post('/api/tools/execute', async (req, res, next) => {
  try {
    const { toolName, parameters, context } = req.body;

    if (!toolName) {
      return res.status(400).json({ error: 'Tool name is required' });
    }

    const result = await agenticExecutor.executeTool(toolName, parameters, context);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Tool analysis endpoint
app.post('/api/tools/analyze', async (req, res, next) => {
  try {
    const { content, taskType, complexity } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const analysis = await toolAnalyzer.analyzeForTools(content, taskType, complexity);
    const suggestions = toolAnalyzer.getToolSuggestions(content);

    res.json({
      analysis,
      suggestions
    });
  } catch (error) {
    next(error);
  }
});

// AI Code Analysis endpoint
app.post('/api/ai/analyze', async (req, res, next) => {
  try {
    const { filePath, options } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const analysis = await aiCodeAnalyzer.analyzeCode(filePath, options);
    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

// AI Code Refactoring endpoint
app.post('/api/ai/refactor', async (req, res, next) => {
  try {
    const { filePath, refactoringType, options } = req.body;

    if (!filePath || !refactoringType) {
      return res.status(400).json({ error: 'File path and refactoring type are required' });
    }

    const refactoring = await aiCodeAnalyzer.refactorCode(filePath, refactoringType, options);
    res.json(refactoring);
  } catch (error) {
    next(error);
  }
});

// AI Test Generation endpoint
app.post('/api/ai/tests', async (req, res, next) => {
  try {
    const { filePath, testFramework, options } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const tests = await aiCodeAnalyzer.generateTests(filePath, testFramework, options);
    res.json(tests);
  } catch (error) {
    next(error);
  }
});

// AI Debugging endpoint
app.post('/api/ai/debug', async (req, res, next) => {
  try {
    const { filePath, errorContext, options } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const debugging = await aiCodeAnalyzer.debugCode(filePath, errorContext, options);
    res.json(debugging);
  } catch (error) {
    next(error);
  }
});

// AI Code Review endpoint
app.post('/api/ai/review', async (req, res, next) => {
  try {
    const { filePath, reviewType, options } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const review = await aiCodeAnalyzer.reviewCode(filePath, reviewType, options);
    res.json(review);
  } catch (error) {
    next(error);
  }
});

// AI Documentation Generation endpoint
app.post('/api/ai/documentation', async (req, res, next) => {
  try {
    const { filePath, docType, options } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const documentation = await aiCodeAnalyzer.generateDocumentation(filePath, docType, options);
    res.json(documentation);
  } catch (error) {
    next(error);
  }
});

// AI Code Optimization endpoint
app.post('/api/ai/optimize', async (req, res, next) => {
  try {
    const { filePath, optimizationType, options } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const optimization = await aiCodeAnalyzer.optimizeCode(filePath, optimizationType, options);
    res.json(optimization);
  } catch (error) {
    next(error);
  }
});

// AI Cache management endpoint
app.get('/api/ai/cache', (req, res) => {
  res.json(aiCodeAnalyzer.getCacheStats());
});

app.delete('/api/ai/cache', (req, res) => {
  const result = aiCodeAnalyzer.clearCache();
  res.json(result);
});

// Available tools endpoint
app.get('/api/tools', (req, res) => {
  res.json({
    availableTools: [
      ...agenticExecutor.getAvailableTools(),
      ...aiCodeAnalyzer.getAvailableTools()
    ],
    toolAnalyzer: {
      description: 'AI-powered tool detection and suggestions'
    },
    agenticWorkflows: {
      description: 'AI-powered workflow execution for complete projects',
              supportedTypes: [
          'react-node-fullstack',
          'simple-node',
          'express-backend',
          'react-frontend',
          'python-project',
          'git-setup',
          'package-installation',
          'file-creation',
          'command-execution',
          'ai-code-analysis',
          'ai-code-refactoring',
          'ai-test-generation',
          'ai-debugging'
        ]
    },
    aiCapabilities: {
      description: 'Advanced AI-powered code analysis, refactoring, testing, and debugging',
      features: [
        'Code Quality Analysis',
        'Intelligent Refactoring',
        'Test Generation',
        'Debugging Assistance',
        'Code Review',
        'Documentation Generation',
        'Performance Optimization'
      ]
    }
  });
});

// Tool execution history endpoint
app.get('/api/tools/history', (req, res) => {
  res.json({
    executionHistory: agenticExecutor.getExecutionHistory(),
    totalExecutions: agenticExecutor.getExecutionHistory().length
  });
});

  // Ollama API endpoints - these maintain complete compatibility
  app.post('/api/show', async (req, res, next) => {
  try {
    console.log('🔍 /api/show endpoint called');

    // Get model info from Ollama
    const axios = require('axios');
    const ollamaResponse = await axios.post('http://localhost:11434/api/show', req.body);

    // Add OllamaGeek enhancement info
    const enhancedResponse = {
      ...ollamaResponse.data,
      ollamageek_enhanced: true,
      orchestration: 'OllamaGeek enhanced response'
    };

    res.json(enhancedResponse);
  } catch (error) {
    console.error('❌ Error in /api/show:', error.message);
    res.status(500).json({ error: 'Failed to show model info' });
  }
});

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

        // Analyze if tools are needed
    const content = req.body.prompt || (req.body.messages && req.body.messages.length > 0 ? req.body.messages[req.body.messages.length - 1].content : '');

    // First, try agentic workflow execution (truly agentic!)
    console.log(`🧠 Attempting agentic workflow execution...`);
    const workflowResult = await agenticExecutor.executeWorkflow(req.body, context);

    if (workflowResult) {
      console.log(`🎯 Agentic Workflow Executed: ${workflowResult.workflow} (${workflowResult.steps} steps)`);
      console.log(`✅ Workflow Success: ${workflowResult.success}`);

      // Add workflow results to context
      context.workflowResults = workflowResult;

      // If workflow was successful, we don't need individual tool analysis
      if (workflowResult.success) {
        console.log(`🚀 Workflow completed successfully!`);
      }
    } else {
      // Fallback to individual tool analysis
      console.log(`🔄 No workflow detected, falling back to individual tools...`);
      const toolAnalysis = await toolAnalyzer.analyzeForTools(
        content,
        analysis.taskType,
        analysis.complexity
      );

      if (toolAnalysis.needsTools) {
        console.log(`🛠️ Tools Detected: ${toolAnalysis.tools.map(t => t.name).join(', ')} (${toolAnalysis.method})`);
        console.log(`💡 Tool Suggestions: ${toolAnalysis.tools.map(t => t.reasoning).join('; ')}`);

        // AUTO-EXECUTE TOOLS! 🚀
        console.log(`🚀 Auto-executing individual tools...`);
        const toolResults = await agenticExecutor.autoExecuteTools(req.body, toolAnalysis, context);

        // Log the results
        toolResults.forEach(result => {
          if (result.success) {
            console.log(`✅ ${result.tool} executed successfully:`, result.result);
          } else {
            console.log(`❌ ${result.tool} failed:`, result.error);
          }
        });

        // Add tool results to the context for the model
        context.toolResults = toolResults;
      }
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

    // If we executed a workflow, inject the results into the request
    if (context.workflowResults && context.workflowResults.success) {
      const workflowSummary = generateWorkflowSummary(context.workflowResults);

      // Add workflow results to the last user message
      if (ollamaRequest.messages && ollamaRequest.messages.length > 0) {
        const lastMessage = ollamaRequest.messages[ollamaRequest.messages.length - 1];
        if (lastMessage.role === 'user') {
          lastMessage.content += `\n\n[WORKFLOW EXECUTED: ${workflowSummary}]`;
        }
      }
    }

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
