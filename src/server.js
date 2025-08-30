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
const { AICodeAnalyzer } = require('./services/aiCodeAnalyzer');
const { EnhancedContextManager } = require('./services/enhancedContextManager');
const IntentRecognizer = require('./services/intentRecognizer');
const ApproachMapper = require('./services/approachMapper');
const AIToolGenerator = require('./services/aiToolGenerator');
const PerformanceDashboard = require('./services/performanceDashboard');
const workflowRoutes = require('./routes/workflowRoutes');
const WebSearchService = require('./services/webSearchService');

// Helper function to generate tool plan summary
function generateToolPlanSummary(toolPlan) {
  const { description, tools } = toolPlan;
  return `${description} - ${tools.length} tools needed`;
}

// Helper function to extract target path from prompt
function extractTargetPathFromPrompt(prompt) {
  const patterns = [
    /(?:in\s+(?:a\s+)?(?:folder\s+named\s+|directory\s+named\s+|folder\s+called\s+|directory\s+called\s+))([a-zA-Z0-9._-]+)/i,
    /(?:in\s+(?:a\s+)?(?:folder\s+|directory\s+))([a-zA-Z0-9._-]+)/i,
    /(?:folder\s+named\s+|directory\s+named\s+|folder\s+called\s+|directory\s+called\s+)([a-zA-Z0-9._-]+)/i,
    /(?:in\s+)([a-zA-Z0-9._-]+)/i
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// Helper function to parse spatial paths intelligently
function parseSpatialPath(directory, prompt) {
  const lowerPrompt = prompt.toLowerCase();

  // Handle "root" variations
  if (lowerPrompt.includes('root') || lowerPrompt.includes('at root') || lowerPrompt.includes('in root') ||
      lowerPrompt.includes('root directory') || lowerPrompt.includes('root folder')) {
    return '.'; // Current directory
  }

  // Handle "current directory" variations
  if (lowerPrompt.includes('current') || lowerPrompt.includes('here') || lowerPrompt.includes('this directory') ||
      lowerPrompt.includes('current folder') || lowerPrompt.includes('current dir') || lowerPrompt.includes('this folder') ||
      lowerPrompt.includes('this dir') || lowerPrompt.includes('present directory') || lowerPrompt.includes('present folder')) {
    return '.';
  }

  // Handle "parent directory" variations
  if (lowerPrompt.includes('parent') || lowerPrompt.includes('parent directory') || lowerPrompt.includes('parent folder') ||
      lowerPrompt.includes('parent dir') || lowerPrompt.includes('up') || lowerPrompt.includes('one level up') ||
      lowerPrompt.includes('level up') || lowerPrompt.includes('go up')) {
    return '..';
  }

  // Handle "grandparent directory" variations
  if (lowerPrompt.includes('grandparent') || lowerPrompt.includes('grandparent directory') || lowerPrompt.includes('grandparent folder') ||
      lowerPrompt.includes('two levels up') || lowerPrompt.includes('two up') || lowerPrompt.includes('level up twice')) {
    return '../..';
  }

  // Handle "app" variations
  if (lowerPrompt.includes('app') || lowerPrompt.includes('app directory') || lowerPrompt.includes('app folder') ||
      lowerPrompt.includes('app dir') || lowerPrompt.includes('application') || lowerPrompt.includes('application directory')) {
    return 'app';
  }

  // Handle "src" variations
  if (lowerPrompt.includes('src') || lowerPrompt.includes('source') || lowerPrompt.includes('source directory') ||
      lowerPrompt.includes('source folder') || lowerPrompt.includes('source dir') || lowerPrompt.includes('code')) {
    return 'src';
  }

  // Handle "docs" variations
  if (lowerPrompt.includes('docs') || lowerPrompt.includes('documentation') || lowerPrompt.includes('documents') ||
      lowerPrompt.includes('docs directory') || lowerPrompt.includes('docs folder') || lowerPrompt.includes('docs dir')) {
    return 'docs';
  }

  // Handle "config" variations
  if (lowerPrompt.includes('config') || lowerPrompt.includes('configuration') || lowerPrompt.includes('config directory') ||
      lowerPrompt.includes('config folder') || lowerPrompt.includes('config dir') || lowerPrompt.includes('settings')) {
    return 'config';
  }

  // Handle "tests" variations
  if (lowerPrompt.includes('test') || lowerPrompt.includes('tests') || lowerPrompt.includes('testing') ||
      lowerPrompt.includes('test directory') || lowerPrompt.includes('test folder') || lowerPrompt.includes('test dir') ||
      lowerPrompt.includes('tests directory') || lowerPrompt.includes('tests folder') || lowerPrompt.includes('tests dir')) {
    return 'tests';
  }

  // Handle "dist" or "build" variations
  if (lowerPrompt.includes('dist') || lowerPrompt.includes('build') || lowerPrompt.includes('output') ||
      lowerPrompt.includes('dist directory') || lowerPrompt.includes('build directory') || lowerPrompt.includes('output directory')) {
    return 'dist';
  }

  // Default to app directory for file operations
  return directory;
}

// Helper function to execute tools
async function executeTools(tools, prompt) {
  try {
    console.log(`🔧 Executing ${tools.length} tools for: "${prompt}"`);

    const results = [];

    for (const tool of tools) {
      try {
        // Handle different tool types - support both AI-generated and standard formats
        let toolName = tool.name || tool.toolName;
        const toolParams = tool.params || tool.parameters || {};

        console.log(`🔧 Executing tool: ${toolName}`);

        if (toolName === 'createFile' || toolName === 'create_file') {
          const fs = require('fs').promises;
          const path = require('path');

          // Handle different parameter formats - prioritize AI context
          const filePath = toolParams?.name || toolParams?.filename || toolParams?.filePath || 'unknown.txt';
          const content = toolParams?.content || toolParams?.fileContent || '// File created by PluginGeek';
          let directory = tool.context?.targetDir || toolParams?.targetDirectory || '/Users/ccrocker/projects';

          // Debug logging to see what we're getting
          console.log(`🔍 Tool params:`, JSON.stringify(toolParams));
          console.log(`🔍 Tool context:`, JSON.stringify(tool.context));
          console.log(`🔍 Selected directory:`, directory);

          // NO SPATIAL PATH PARSING - USE AI PATHS DIRECTLY

                    // Handle absolute vs relative paths
          let fullPath;
          if (path.isAbsolute(directory) || directory.startsWith('/Users/ccrocker/projects/')) {
            // If it's an absolute path or project path, use it directly
            fullPath = path.join(directory, filePath);
          } else {
            // If it's a relative path, prepend current directory
            fullPath = path.join(process.cwd(), directory, filePath);
          }
          const dir = path.dirname(fullPath);

          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(fullPath, content);

          results.push({
            tool: toolName,
            success: true,
            result: { filePath: fullPath, size: content.length }
          });

          console.log(`✅ File created: ${fullPath}`);

        } else if (toolName === 'createDirectory' || toolName === 'create_directory') {
          const fs = require('fs').promises;
          const path = require('path');

          // Use AI's targetDirectory directly - no more path manipulation
          const fullPath = tool.context?.targetDir || toolParams?.targetDirectory || '/Users/ccrocker/projects';

          await fs.mkdir(fullPath, { recursive: true });

          results.push({
            tool: toolName,
            success: true,
            result: { directory: fullPath }
          });

          console.log(`✅ Directory created: ${fullPath}`);

        } else if (toolName === 'runTerminal' || toolName === 'run_terminal') {
          const { exec } = require('child_process');
          const util = require('util');
          const execAsync = util.promisify(exec);

          // Handle different parameter formats
          const command = toolParams?.command || toolParams?.cmd || 'echo "No command specified"';
          const cwd = toolParams?.cwd || toolParams?.workingDirectory || tool.context?.targetDir || process.cwd();

          console.log(`🔧 Executing terminal command: ${command} in ${cwd}`);

          try {
            const { stdout, stderr } = await execAsync(command, { cwd });
            console.log(`✅ Terminal command executed successfully`);
            if (stdout) console.log(`📤 Output: ${stdout}`);
            if (stderr) console.log(`⚠️ Stderr: ${stderr}`);

            results.push({
              tool: toolName,
              success: true,
              result: { command, cwd, stdout, stderr }
            });
          } catch (error) {
            console.error(`❌ Terminal command failed: ${error.message}`);
            results.push({
              tool: toolName,
              success: false,
              error: error.message
            });
          }

        } else {
          results.push({
            tool: toolName,
            success: false,
            error: `Unknown tool type: ${toolName}`
          });
        }

      } catch (error) {
        console.error(`❌ Tool ${toolName} execution failed:`, error);
        results.push({
          tool: toolName,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: results.every(r => r.success),
      results: results,
      prompt: prompt
    };

  } catch (error) {
    console.error('❌ Tool execution failed:', error);
    throw error;
  }
}

const app = express();
const PORT = process.env.PORT || 3003;

// Initialize services
const orchestrator = new OllamaOrchestrator();
const embeddingClassifier = new EmbeddingClassifier();
const sessionManager = new SessionManager();
const contextManager = new SmartContextManager();
const agenticExecutor = new AgenticWorkflowExecutor();
const aiCodeAnalyzer = new AICodeAnalyzer();
const enhancedContextManager = new EnhancedContextManager();
const intentRecognizer = new IntentRecognizer();
const approachMapper = new ApproachMapper();
const aiToolGenerator = new AIToolGenerator();
const performanceDashboard = new PerformanceDashboard();
const webSearchService = new WebSearchService();

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

// Tool execution endpoints removed - this is now a planning-only API

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

// Old tools endpoint removed - replaced with planning-only version below

// Tool execution history removed - this is now a planning-only API

  // Ollama API endpoints - these maintain complete compatibility
  app.post('/api/show', async (req, res, next) => {
  try {
    console.log('🔍 /api/show endpoint called');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

    // Get model info from Ollama
    const axios = require('axios');
    const ollamaResponse = await axios.post('http://localhost:11434/api/show', req.body);

    // Get available tools from our services
    const availableTools = [
      {
        name: "create_file",
        description: "Create new files with specified content",
        parameters: {
          path: "string - File path to create",
          content: "string - File content",
          language: "string - Programming language (optional)"
        }
      },
      {
        name: "create_directory",
        description: "Create new directories",
        parameters: {
          path: "string - Directory path to create"
        }
      },
      {
        name: "edit_file",
        description: "Modify existing files",
        parameters: {
          path: "string - File path to edit",
          content: "string - New file content"
        }
      },
      {
        name: "delete_file",
        description: "Remove files",
        parameters: {
          path: "string - File path to delete"
        }
      },
      {
        name: "run_terminal",
        description: "Execute terminal commands",
        parameters: {
          command: "string - Command to execute",
          cwd: "string - Working directory (optional)"
        }
      },
      {
        name: "git_operation",
        description: "Perform git operations",
        parameters: {
          operation: "string - Git command (init, add, commit, etc.)",
          path: "string - Repository path (optional)"
        }
      },
      {
        name: "search_files",
        description: "Search file content",
        parameters: {
          query: "string - Search query",
          path: "string - Directory to search (optional)"
        }
      }
    ];

    // Add OllamaGeek enhancement info with tool capabilities
    // Note: Continue expects tools in Ollama's native format
    const enhancedResponse = {
      ...ollamaResponse.data,
      ollamageek_enhanced: true,
      orchestration: 'OllamaGeek enhanced response',
      // Expose tools in Ollama's expected format
      tools: availableTools.map(tool => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object",
            properties: Object.fromEntries(
              Object.entries(tool.parameters).map(([key, value]) => [
                key,
                { type: "string", description: value }
              ])
            ),
            required: Object.keys(tool.parameters)
          }
        }
      })),
      // Add tool capabilities to the existing capabilities
      capabilities: {
        ...ollamaResponse.data.capabilities,
        tool_execution: true,
        file_operations: true,
        terminal_commands: true,
        git_operations: true,
        code_analysis: true,
        project_generation: true,
        function_calling: true,
        tool_use: true
      },
      // Add tools to modelfile so Continue can see them
      modelfile: (ollamaResponse.data.modelfile || '') + '\n\n# OllamaGeek Tools\n' + availableTools.map(tool =>
        `TOOL ${tool.name} "${tool.description}"`
      ).join('\n'),
      system_prompt: "You are OllamaGeek, an intelligent AI assistant with access to powerful tools for file operations, terminal commands, git operations, and code analysis. You can execute tools directly to help users with their coding tasks."
    };

    console.log(`🛠️ Exposed ${availableTools.length} tools to Continue`);
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

    // Get tool plan from Ollama's intelligence
    console.log(`🧠 Getting tool plan from Ollama...`);
    const toolPlan = await agenticExecutor.planTools(req.body, context);

    if (toolPlan && toolPlan.tools.length > 0) {
      // Add tool plan to context for Continue to use
      context.toolPlan = toolPlan;
      console.log(`🎯 Tool plan generated: ${toolPlan.tools.length} tools needed`);
      console.log(`📋 Plan description: ${toolPlan.description}`);
      console.log(`🔧 Tools: ${toolPlan.tools.map(t => t.tool).join(', ')}`);

      // Add tool plan to the user message so Continue knows what to do
      if (req.body.messages && req.body.messages.length > 0) {
        const lastMessage = req.body.messages[req.body.messages.length - 1];
        if (lastMessage.role === 'user') {
          lastMessage.content += `\n\n[TOOL PLAN: ${toolPlan.description}]\n\nContinue should execute these tools:\n${toolPlan.tools.map((t, i) => `${i + 1}. ${t.tool}: ${t.description}`).join('\n')}\n\nContext: ${toolPlan.context}`;
        }
      }
    } else {
      console.log(`❌ No tool plan generated`);
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

    // Add model information to the request for context
    ollamaRequest.ollamageek_context = {
      selectedModel: recommendedModel,
      toolPlanGenerated: context.toolPlan ? true : false,
      timestamp: new Date().toISOString()
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

        // Check if this is a tool execution request from Continue
    if (req.body.tools && req.body.tools.length > 0) {
      console.log(`🛠️ Continue sent tools: ${req.body.tools.map(t => t.function?.name || t.name).join(', ')}`);

      // For now, let's not modify the tools in the request to Ollama
      // as this might be causing the 400 error
      console.log(`🔄 Continue tool execution mode - passing through to Ollama without modification`);

      // We'll handle tool execution differently - by intercepting the response
      // and executing tools when Ollama requests them
    }

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
        let messageBuffer = '';
        let isMessageComplete = false;

        ollamaResponse.data.on('data', (chunk) => {
          const chunkStr = chunk.toString();
          messageBuffer += chunkStr;

          if (firstChunk) {
            // Inject model info into the first chunk
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
            // Check if this chunk completes a message
            if (chunkStr.includes('"done":true')) {
              isMessageComplete = true;
            }

            // If message is complete, inject model note
            if (isMessageComplete && chunkStr.includes('"content"')) {
              const enhancedChunk = chunkStr.replace(
                /"content":"([^"]*)"/,
                `"content":"$1\\n\\n---\\n🤖 **OllamaGeek AI Assistant**\\n🎯 **Model Used:** ${recommendedModel}\\n⏰ **Timestamp:** ${new Date().toLocaleString()}\\n---"`
              );
              res.write(enhancedChunk);
              isMessageComplete = false;
            } else {
              res.write(chunk);
            }
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

// Tool discovery endpoint for Continue
app.get('/api/tools', async (req, res) => {
  try {
    console.log('🔍 /api/tools endpoint called - Continue discovering tools');

    const availableTools = [
      {
        name: "create_file",
        description: "Create new files with specified content",
        parameters: {
          path: "string - File path to create",
          content: "string - File content",
          language: "string - Programming language (optional)"
        }
      },
      {
        name: "create_directory",
        description: "Create new directories",
        parameters: {
          path: "string - Directory path to create"
        }
      },
      {
        name: "edit_file",
        description: "Modify existing files",
        parameters: {
          path: "string - File path to edit",
          content: "string - New file content"
        }
      },
      {
        name: "delete_file",
        description: "Remove files",
        parameters: {
          path: "string - File path to delete"
        }
      },
      {
        name: "run_terminal",
        description: "Execute terminal commands",
        parameters: {
          command: "string - Command to execute",
          cwd: "string - Working directory (optional)"
        }
      },
      {
        name: "git_operation",
        description: "Perform git operations",
        parameters: {
          operation: "string - Git command (init, add, commit, etc.)",
          path: "string - Repository path (optional)"
        }
      },
      {
        name: "search_files",
        description: "Search file content",
        parameters: {
          query: "string - Search query",
          path: "string - Directory to search (optional)"
        }
      }
    ];

    res.json({
      tools: availableTools,
      capabilities: {
        tool_planning: true,
        file_operations: true,
        terminal_commands: true,
        git_operations: true,
        code_analysis: true,
        project_generation: true
      },
      model: "OllamaGeek Orchestrator",
      version: "1.0.0",
      description: "Intelligent AI assistant with powerful tool planning capabilities"
    });
  } catch (error) {
    console.error('❌ Error in /api/tools:', error.message);
    res.status(500).json({ error: 'Failed to get tools' });
  }
});



// Enhanced context-aware planning endpoint
app.post('/api/plan/enhanced', async (req, res, next) => {
  try {
    // Session management: Create or get session ID
    const userAgent = req.get('User-Agent') || 'unknown';
    const sessionId = sessionManager.getSessionId(req.body, userAgent);
    const sessionHistory = sessionManager.getSessionHistory(sessionId);

    console.log(`🆔 Enhanced Planning Session: ${sessionId} | History: ${sessionHistory.length} messages`);

    // Use embedding-based classification for intelligent model selection
    const analysis = await embeddingClassifier.classifyRequest(req.body);
    const recommendedModel = analysis.recommendedModel;

    console.log(`🧠 Enhanced Planning Model: "${req.body.model}" -> "${recommendedModel}"`);
    console.log(`📊 Analysis: ${analysis.taskType} | ${analysis.complexity} | ${analysis.language}`);

    // Get context recommendations based on the request
    console.log(`🧠 Getting context recommendations...`);
    const contextRequest = await enhancedContextManager.getContextRecommendations(req.body.messages?.[0]?.content || req.body.prompt || '');

    // Request context from PluginGeek (simulated for now)
    console.log(`🧠 Requesting context from PluginGeek...`);
    const contextResponse = await enhancedContextManager.requestContext(contextRequest);

    // Analyze context for AI planning
    console.log(`🧠 Analyzing context for AI planning...`);
    const planningContext = await enhancedContextManager.analyzeContextForPlanning(
      req.body.messages?.[0]?.content || req.body.prompt || '',
      contextResponse
    );

    // Get tool plan from Ollama's intelligence with enhanced context
    console.log(`🧠 Generating enhanced tool plan...`);
    const toolPlan = await agenticExecutor.planTools(req.body, planningContext);

    if (toolPlan && toolPlan.tools.length > 0) {
      console.log(`🎯 Enhanced tool plan generated: ${toolPlan.tools.length} tools needed`);
      console.log(`📋 Plan description: ${toolPlan.description}`);

      // Update feature tracking if this is a feature-related request
      if (planningContext.feature.currentFeature) {
        enhancedContextManager.updateFeatureTracking(
          planningContext.feature.currentFeature,
          'planning',
          planningContext.relevantFiles.map(f => f.path)
        );
      }

      // Return enhanced plan with context
      res.json({
        success: true,
        plan: {
          description: toolPlan.description,
          tools: toolPlan.tools.map(tool => ({
            name: tool.tool,
            description: tool.description,
            parameters: tool.parameters || {},
            context: tool.context || ''
          })),
          context: {
            workspace: planningContext.workspace,
            feature: planningContext.feature,
            rules: planningContext.rules,
            summary: planningContext.contextSummary,
            constraints: planningContext.constraints,
            recommendations: planningContext.analysis.recommendations
          },
          model: recommendedModel,
          sessionId: sessionId,
          contextId: contextResponse.contextId
        }
      });
    } else {
      // No tools needed - return enhanced response plan
      res.json({
        success: true,
        plan: {
          description: "No tools required - direct response needed",
          tools: [],
          context: {
            workspace: planningContext.workspace,
            feature: planningContext.feature,
            rules: planningContext.rules,
            summary: planningContext.contextSummary
          },
          model: recommendedModel,
          sessionId: sessionId,
          contextId: contextResponse.contextId
        }
      });
    }
  } catch (error) {
    console.error('❌ Error in enhanced planning:', error.message);
    next(error);
  }
});

// Original planning endpoint - returns tool execution plan without executing
app.post('/api/plan', async (req, res, next) => {
  try {
    // Session management: Create or get session ID
    const userAgent = req.get('User-Agent') || 'unknown';
    const sessionId = sessionManager.getSessionId(req.body, userAgent);
    const sessionHistory = sessionManager.getSessionHistory(sessionId);

    console.log(`🆔 Planning Session: ${sessionId} | History: ${sessionHistory.length} messages`);

    // Use embedding-based classification for intelligent model selection
    const analysis = await embeddingClassifier.classifyRequest(req.body);
    const recommendedModel = analysis.recommendedModel;

    console.log(`🧠 Planning Model: "${req.body.model}" -> "${recommendedModel}"`);
    console.log(`📊 Analysis: ${analysis.taskType} | ${analysis.complexity} | ${analysis.language}`);

    // Get smart context for the request
    const context = await contextManager.getSmartContext(req.body, analysis.taskType, analysis.complexity);
    if (context.files.length > 0 || context.gitStatus || context.reasoning) {
      console.log(`📁 Planning Context: ${contextManager.formatContext(context)}`);
    }

    // Get tool plan from Ollama's intelligence
    console.log(`🧠 Generating tool plan...`);
    const toolPlan = await agenticExecutor.planTools(req.body, context);

    if (toolPlan && toolPlan.tools.length > 0) {
      console.log(`🎯 Tool plan generated: ${toolPlan.tools.length} tools needed`);
      console.log(`📋 Plan description: ${toolPlan.description}`);

      // Return structured plan for VS Code extension to execute
      res.json({
        success: true,
        plan: {
          description: toolPlan.description,
          tools: toolPlan.tools.map(tool => ({
            name: tool.tool,
            description: tool.description,
            parameters: tool.parameters || {},
            context: tool.context || ''
          })),
          context: toolPlan.context,
          model: recommendedModel,
          sessionId: sessionId
        }
      });
    } else {
      // No tools needed - return simple response plan
      res.json({
        success: true,
        plan: {
          description: "No tools required - direct response needed",
          tools: [],
          context: context,
          model: recommendedModel,
          sessionId: sessionId
        }
      });
    }
  } catch (error) {
    console.error('❌ Error in /api/plan:', error.message);
    next(error);
  }
});

// Unified chat endpoint - handles classification and planning internally
app.post('/api/chat/unified', async (req, res, next) => {
  try {
    const { prompt, context } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`💬 Chat endpoint called with: "${prompt}"`);

         // Use intelligent AI-native intent recognition system
     console.log(`🧠 Using AI-native intent recognition for: "${prompt}"`);

     try {
       // Recognize user intent using AI-powered semantic analysis
       const intentResult = await intentRecognizer.recognizeIntent(prompt, context);
       console.log(`🎯 Intent Recognition Result:`, intentResult);

       // Map intent to specific approach using AI reasoning
       const mappedApproach = await approachMapper.mapIntentToApproach(intentResult, context);
       console.log(`🗺️ Mapped Approach:`, mappedApproach);

       // Generate appropriate response based on AI-determined approach
       const response = approachMapper.generateResponse(prompt, intentResult, mappedApproach);

       // If it's a simple chat, return immediately
       if (response.type === 'simple_chat') {
         return res.json(response);
       }

       // For execution tasks, continue with AI-powered tool generation
       const actionType = mappedApproach.actionType;
       console.log(`🎬 Action Type Determined: ${actionType}`);

           // Handle execution tasks that need planning
       if (actionType === 'execution_simple') {
         console.log(`🔧 Simple execution task detected, using AI-powered tool generation...`);

         // Use AI Tool Generator for intelligent tool creation
         const enhancedContext = {
           ...context,
           targetDir: intentResult.targetDir || 'app',
           projectType: intentResult.intent === 'app_creation' ? 'nodejs' : 'file_ops',
           projectName: intentResult.intent === 'app_creation' ? 'app_creation' : 'file_ops'
         };
         const tools = await aiToolGenerator.generateToolsForIntent(prompt, intentResult, enhancedContext);

         // Execute the tools if any were generated
         let executionResult = null;
         if (tools && tools.length > 0) {
           console.log(`🚀 Executing ${tools.length} tools...`);
           try {
             executionResult = await executeTools(tools, prompt);
             console.log(`✅ Tools executed successfully`);
           } catch (error) {
             console.error(`❌ Tool execution failed:`, error);
           }
         }

         return res.json({
           type: 'execution_task',
           message: `I'll execute this task for you: ${prompt}`,
           tools: tools,
           requiresApproval: false,
           modelUsed: 'ai_intent_recognition',
           actionType: 'execution_simple',
           context: {
             intent: intentResult.intent,
             complexity: intentResult.complexity,
             confidence: intentResult.confidence
           },
           executionResult: executionResult
         });

       } else if (actionType === 'execution_complex') {
         console.log(`🔧 Complex execution task detected, using AI-powered tool generation...`);

         // Use AI Tool Generator for complex tasks too - no more old orchestrator!
         const enhancedContext = {
           ...context,
           targetDir: intentResult.targetDir || 'app',
           projectType: intentResult.intent === 'app_creation' ? 'nodejs' : 'file_ops',
           projectName: intentResult.intent === 'app_creation' ? 'app_creation' : 'file_ops'
         };
         const tools = await aiToolGenerator.generateToolsForIntent(prompt, intentResult, enhancedContext);

         return res.json({
           type: 'execution_task',
           message: `I'll execute this complex task for you: ${prompt}`,
           tools: tools,
           requiresApproval: true,
           modelUsed: 'ai_intent_recognition',
           actionType: 'execution_complex',
           context: {
             intent: intentResult.intent,
             complexity: intentResult.complexity,
             confidence: intentResult.confidence
           }
         });
       }

       // For any other action types, return the response from the approach mapper
       return res.json(response);

     } catch (error) {
       console.error('❌ Error in AI-native intent recognition:', error.message);
       // Fallback to simple response
       return res.json({
         type: 'simple_chat',
         message: "I'm here to help! What would you like to work on?",
         tools: [],
         requiresApproval: false,
         modelUsed: 'ai_intent_recognition (fallback)',
         actionType: 'simple_chat'
       });
     }

  } catch (error) {
    console.error('❌ Error in /api/chat:', error.message);
    next(error);
  }
});

// Performance Dashboard endpoint
app.get('/api/performance', async (req, res, next) => {
  try {
    const overview = await performanceDashboard.getPerformanceOverview();
    res.json(overview);
  } catch (error) {
    console.error('❌ Error in performance dashboard:', error.message);
    next(error);
  }
});

// Web Search endpoint
app.post('/api/search', async (req, res, next) => {
  try {
    const { query, provider = 'duckduckgo', maxResults = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log(`🔍 Web search request: "${query}" using ${provider}`);

    const searchResults = await webSearchService.searchWeb(query, {
      provider,
      maxResults,
      includeContent: true,
      useCache: true
    });

    res.json({
      success: true,
      query,
      provider,
      results: searchResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in web search:', error.message);
    next(error);
  }
});

// Web Search cache management
app.get('/api/search/cache/stats', (req, res) => {
  try {
    const stats = webSearchService.getCacheStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting cache stats:', error.message);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

app.delete('/api/search/cache', (req, res) => {
  try {
    webSearchService.clearCache();
    res.json({
      success: true,
      message: 'Search cache cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Workflow Orchestration endpoints
app.use('/api/workflows', workflowRoutes);

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
