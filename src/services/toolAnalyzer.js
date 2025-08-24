const axios = require('axios');

class ToolAnalyzer {
  constructor(ollamaBaseUrl) {
    this.ollamaBaseUrl = ollamaBaseUrl;
    this.toolCache = new Map();
  }

  /**
   * Analyze a request to determine if tools are needed
   */
  async analyzeForTools(content, taskType, complexity) {
    // Fast path: Check for obvious tool indicators
    const fastAnalysis = this._fastToolAnalysis(content);

    if (fastAnalysis.needsTools) {
      return fastAnalysis;
    }

    // AI path: Use AI to analyze complex cases
    if (complexity === 'high' || complexity === 'very_high') {
      return await this._aiToolAnalysis(content, taskType);
    }

    return { needsTools: false, tools: [] };
  }

  /**
   * Fast heuristic analysis for common tool patterns
   */
  _fastToolAnalysis(content) {
    const lowerContent = content.toLowerCase();

    // File creation patterns
    const createPatterns = [
      /create\s+(?:a\s+)?(?:new\s+)?(?:file|component|class|function)/i,
      /make\s+(?:a\s+)?(?:new\s+)?(?:file|component|class|function)/i,
      /generate\s+(?:a\s+)?(?:new\s+)?(?:file|component|class|function)/i,
      /add\s+(?:a\s+)?(?:new\s+)?(?:file|component|class|function)/i,
      /create\s+.*\s+(?:file|component|class|function)/i,
      /make\s+.*\s+(?:file|component|class|function)/i
    ];

    // File editing patterns
    const editPatterns = [
      /edit\s+(?:the\s+)?(?:file|code|function|class)/i,
      /modify\s+(?:the\s+)?(?:file|code|function|class)/i,
      /change\s+(?:the\s+)?(?:file|code|function|class)/i,
      /update\s+(?:the\s+)?(?:file|code|function|class)/i,
      /fix\s+(?:the\s+)?(?:bug|error|issue)/i
    ];

    // Terminal command patterns
    const terminalPatterns = [
      /run\s+(?:the\s+)?(?:command|script|test)/i,
      /execute\s+(?:the\s+)?(?:command|script|test)/i,
      /install\s+(?:the\s+)?(?:package|dependency)/i,
      /build\s+(?:the\s+)?(?:project|app)/i
    ];

    // Git operation patterns
    const gitPatterns = [
      /commit\s+(?:the\s+)?(?:changes|files)/i,
      /push\s+(?:the\s+)?(?:changes|files)/i,
      /create\s+(?:a\s+)?(?:new\s+)?(?:branch|tag)/i,
      /merge\s+(?:the\s+)?(?:branch|changes)/i
    ];

    const tools = [];

    // Check for file creation
    if (createPatterns.some(pattern => pattern.test(content))) {
      tools.push({
        name: 'create_file',
        confidence: 'high',
        reasoning: 'Request explicitly asks to create something new'
      });
    }

    // Check for file editing
    if (editPatterns.some(pattern => pattern.test(content))) {
      tools.push({
        name: 'edit_file',
        confidence: 'high',
        reasoning: 'Request explicitly asks to modify existing code'
      });
    }

    // Check for terminal commands
    if (terminalPatterns.some(pattern => pattern.test(content))) {
      tools.push({
        name: 'run_terminal',
        confidence: 'medium',
        reasoning: 'Request asks to run commands or install packages'
      });
    }

    // Check for git operations
    if (gitPatterns.some(pattern => pattern.test(content))) {
      tools.push({
        name: 'git_operation',
        confidence: 'high',
        reasoning: 'Request explicitly asks for git operations'
      });
    }

    return {
      needsTools: tools.length > 0,
      tools,
      method: 'fast_heuristic'
    };
  }

  /**
   * AI-powered tool analysis for complex cases
   */
  async _aiToolAnalysis(content, taskType) {
    const prompt = `Analyze this request and determine what tools would be needed to complete it:

Request: "${content}"
Task Type: ${taskType}

Available tools:
- create_file: Create new files
- edit_file: Modify existing files
- delete_file: Remove files
- run_terminal: Execute commands
- git_operation: Git operations
- search_files: Search for content

Respond with JSON:
{
  "needsTools": true/false,
  "tools": [
    {
      "name": "tool_name",
      "confidence": "high/medium/low",
      "reasoning": "why this tool is needed",
      "suggestedParams": "suggested parameters"
    }
  ]
}

Only include tools that are actually needed. Be conservative.`;

    try {
      const response = await this._callOllama(prompt, 'qwen2.5:1.5b-instruct-q4_K_M');

      try {
        const analysis = JSON.parse(response);
        return {
          ...analysis,
          method: 'ai_analysis'
        };
      } catch (parseError) {
        // Fallback to fast analysis if AI returns invalid JSON
        return this._fastToolAnalysis(content);
      }
    } catch (error) {
      // Fallback to fast analysis if AI call fails
      return this._fastToolAnalysis(content);
    }
  }

  /**
   * Call Ollama for AI analysis
   */
  async _callOllama(prompt, model) {
    try {
      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      });

      return response.data.response;
    } catch (error) {
      throw new Error(`Ollama call failed: ${error.message}`);
    }
  }

  /**
   * Get tool suggestions for a request
   */
  getToolSuggestions(content) {
    const analysis = this._fastToolAnalysis(content);

    if (!analysis.needsTools) {
      return {
        message: 'No tools needed for this request',
        suggestions: []
      };
    }

    const suggestions = analysis.tools.map(tool => {
      switch (tool.name) {
        case 'create_file':
          return `💡 Use the "create_file" tool to create new files. Specify the path and content.`;

        case 'edit_file':
          return `💡 Use the "edit_file" tool to modify existing files. Specify the path and changes.`;

        case 'run_terminal':
          return `💡 Use the "run_terminal" tool to execute commands. Be specific about what command to run.`;

        case 'git_operation':
          return `💡 Use the "git_operation" tool for git commands. Specify the operation and any arguments.`;

        default:
          return `💡 Consider using the "${tool.name}" tool for this task.`;
      }
    });

    return {
      message: 'Tools detected for this request:',
      suggestions
    };
  }
}

module.exports = { ToolAnalyzer };
