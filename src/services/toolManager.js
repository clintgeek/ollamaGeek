const { Logger } = require('../utils/logger');

class ToolManager {
  constructor() {
    this.logger = new Logger();
    this.tools = new Map();
    this.toolRegistry = new Map();

    // Initialize built-in tools
    this._initializeBuiltInTools();
  }

  /**
   * Initialize built-in tools
   */
  _initializeBuiltInTools() {
    // File system tools
    this.registerTool({
      name: 'file_read',
      description: 'Read contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read'
          }
        },
        required: ['path']
      },
      handler: this._handleFileRead.bind(this)
    });

    this.registerTool({
      name: 'file_write',
      description: 'Write content to a file',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to write'
          },
          content: {
            type: 'string',
            description: 'Content to write to the file'
          }
        },
        required: ['path', 'content']
      },
      handler: this._handleFileWrite.bind(this)
    });

    // Code analysis tools
    this.registerTool({
      name: 'code_analyze',
      description: 'Analyze code for issues, patterns, or improvements',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Code to analyze'
          },
          language: {
            type: 'string',
            description: 'Programming language of the code'
          },
          analysis_type: {
            type: 'string',
            enum: ['security', 'performance', 'style', 'complexity', 'all'],
            description: 'Type of analysis to perform'
          }
        },
        required: ['code', 'language']
      },
      handler: this._handleCodeAnalysis.bind(this)
    });

    // Web search tools
    this.registerTool({
      name: 'web_search',
      description: 'Search the web for information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 5
          }
        },
        required: ['query']
      },
      handler: this._handleWebSearch.bind(this)
    });

    // System information tools
    this.registerTool({
      name: 'system_info',
      description: 'Get system information and status',
      parameters: {
        type: 'object',
        properties: {
          info_type: {
            type: 'string',
            enum: ['general', 'performance', 'storage', 'network', 'all'],
            description: 'Type of system information to retrieve'
          }
        }
      },
      handler: this._handleSystemInfo.bind(this)
    });

    // Database tools
    this.registerTool({
      name: 'database_query',
      description: 'Execute a database query',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL or database query to execute'
          },
          database_type: {
            type: 'string',
            enum: ['sqlite', 'postgresql', 'mysql', 'mongodb'],
            description: 'Type of database'
          }
        },
        required: ['query', 'database_type']
      },
      handler: this._handleDatabaseQuery.bind(this)
    });
  }

  /**
   * Register a new tool
   */
  registerTool(toolDefinition) {
    const { name, description, parameters, handler } = toolDefinition;

    if (!name || !description || !parameters || !handler) {
      throw new Error('Tool definition must include name, description, parameters, and handler');
    }

    this.tools.set(name, {
      name,
      description,
      parameters,
      handler,
      registeredAt: new Date()
    });

    this.logger.info('Tool registered', { name, description });
  }

  /**
   * Analyze request for tool usage needs
   */
  async analyzeForTools(requestBody) {
    try {
      const content = this._extractContent(requestBody);
      if (!content) return [];

      const detectedTools = [];

      // Analyze content for tool usage patterns
      for (const [toolName, tool] of this.tools.entries()) {
        const relevance = this._calculateToolRelevance(tool, content);
        if (relevance > 0.3) { // Threshold for relevance
          detectedTools.push({
            name: toolName,
            description: tool.description,
            relevance,
            parameters: tool.parameters
          });
        }
      }

      // Sort by relevance
      return detectedTools.sort((a, b) => b.relevance - a.relevance);

    } catch (error) {
      this.logger.error('Error analyzing for tools', { error: error.message });
      return [];
    }
  }

  /**
   * Get tool recommendations for a request
   */
  async getToolRecommendations(requestBody) {
    try {
      const tools = await this.analyzeForTools(requestBody);

      return {
        recommended: tools.slice(0, 3),
        all_available: Array.from(this.tools.values()).map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        })),
        reasoning: this._generateToolReasoning(tools, requestBody)
      };

    } catch (error) {
      this.logger.error('Error getting tool recommendations', { error: error.message });
      return { error: 'Unable to get tool recommendations' };
    }
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolName, parameters) {
    try {
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      // Validate parameters
      const validationResult = this._validateParameters(tool.parameters, parameters);
      if (!validationResult.valid) {
        throw new Error(`Invalid parameters: ${validationResult.errors.join(', ')}`);
      }

      // Execute tool
      const result = await tool.handler(parameters);

      this.logger.info('Tool executed successfully', {
        tool: toolName,
        parameters,
        result: typeof result === 'string' ? result.substring(0, 100) + '...' : 'Object'
      });

      return {
        success: true,
        tool: toolName,
        result,
        executedAt: new Date()
      };

    } catch (error) {
      this.logger.error('Tool execution failed', {
        tool: toolName,
        parameters,
        error: error.message
      });

      return {
        success: false,
        tool: toolName,
        error: error.message,
        executedAt: new Date()
      };
    }
  }

  /**
   * Execute multiple tool calls
   */
  async executeToolBatch(toolCalls) {
    try {
      const results = [];

      for (const toolCall of toolCalls) {
        const result = await this.executeTool(toolCall.name, toolCall.parameters);
        results.push({
          id: toolCall.id,
          ...result
        });
      }

      return results;

    } catch (error) {
      this.logger.error('Tool batch execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract content from request body
   */
  _extractContent(requestBody) {
    if (requestBody.prompt) return requestBody.prompt;
    if (requestBody.messages) {
      return requestBody.messages
        .map(msg => msg.content)
        .join('\n');
    }
    return null;
  }

  /**
   * Calculate tool relevance for given content
   */
  _calculateToolRelevance(tool, content) {
    let relevance = 0;
    const contentLower = content.toLowerCase();

    // Check for tool-specific keywords
    const toolKeywords = this._getToolKeywords(tool.name);

    for (const keyword of toolKeywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        relevance += 0.2;
      }
    }

    // Check for parameter-related keywords
    if (tool.parameters && tool.parameters.properties) {
      for (const [paramName, paramDef] of Object.entries(tool.parameters.properties)) {
        if (contentLower.includes(paramName.toLowerCase())) {
          relevance += 0.1;
        }
        if (paramDef.description && contentLower.includes(paramDef.description.toLowerCase())) {
          relevance += 0.15;
        }
      }
    }

    // Check for action verbs
    const actionVerbs = ['read', 'write', 'analyze', 'search', 'query', 'get', 'fetch', 'execute'];
    for (const verb of actionVerbs) {
      if (contentLower.includes(verb) && tool.name.includes(verb)) {
        relevance += 0.25;
      }
    }

    return Math.min(relevance, 1.0);
  }

  /**
   * Get keywords for a specific tool
   */
  _getToolKeywords(toolName) {
    const keywordMap = {
      'file_read': ['read', 'file', 'open', 'load', 'content', 'contents'],
      'file_write': ['write', 'file', 'save', 'create', 'update', 'modify'],
      'code_analyze': ['analyze', 'code', 'review', 'inspect', 'check', 'examine'],
      'web_search': ['search', 'web', 'internet', 'find', 'lookup', 'research'],
      'system_info': ['system', 'info', 'status', 'performance', 'hardware'],
      'database_query': ['database', 'query', 'sql', 'data', 'table', 'select']
    };

    return keywordMap[toolName] || [];
  }

  /**
   * Generate tool reasoning
   */
  _generateToolReasoning(tools, requestBody) {
    const reasoning = {
      primary_reasons: [],
      secondary_reasons: [],
      considerations: []
    };

    for (const tool of tools) {
      if (tool.relevance > 0.7) {
        reasoning.primary_reasons.push(`${tool.name}: High relevance (${tool.relevance.toFixed(2)})`);
      } else if (tool.relevance > 0.5) {
        reasoning.secondary_reasons.push(`${tool.name}: Medium relevance (${tool.relevance.toFixed(2)})`);
      } else {
        reasoning.considerations.push(`${tool.name}: Low relevance (${tool.relevance.toFixed(2)})`);
      }
    }

    return reasoning;
  }

  /**
   * Validate tool parameters
   */
  _validateParameters(schema, parameters) {
    const errors = [];

    if (!schema || !parameters) {
      return { valid: false, errors: ['Schema or parameters missing'] };
    }

    // Check required parameters
    if (schema.required) {
      for (const requiredParam of schema.required) {
        if (!(requiredParam in parameters)) {
          errors.push(`Missing required parameter: ${requiredParam}`);
        }
      }
    }

    // Check parameter types
    if (schema.properties) {
      for (const [paramName, paramDef] of Object.entries(schema.properties)) {
        if (parameters[paramName] !== undefined) {
          const paramValue = parameters[paramName];
          const expectedType = paramDef.type;

          if (!this._validateParameterType(paramValue, expectedType)) {
            errors.push(`Invalid type for ${paramName}: expected ${expectedType}, got ${typeof paramValue}`);
          }

          // Check enum values
          if (paramDef.enum && !paramDef.enum.includes(paramValue)) {
            errors.push(`Invalid value for ${paramName}: ${paramValue}. Must be one of: ${paramDef.enum.join(', ')}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate parameter type
   */
  _validateParameterType(value, expectedType) {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true; // Unknown type, assume valid
    }
  }

  /**
   * Built-in tool handlers
   */
  async _handleFileRead(parameters) {
    const { path } = parameters;

    // This is a placeholder - in a real implementation, you'd have proper file system access
    // For security reasons, this would need careful sandboxing and path validation

    return `[File read operation would be performed for: ${path}]
Note: This is a demonstration. In production, implement proper file system access with security measures.`;
  }

  async _handleFileWrite(parameters) {
    const { path, content } = parameters;

    // This is a placeholder - in a real implementation, you'd have proper file system access

    return `[File write operation would be performed for: ${path}]
Content length: ${content.length} characters
Note: This is a demonstration. In production, implement proper file system access with security measures.`;
  }

  async _handleCodeAnalysis(parameters) {
    const { code, language, analysis_type = 'all' } = parameters;

    // Simple code analysis (placeholder)
    const lines = code.split('\n');
    const characters = code.length;
    const words = code.split(/\s+/).length;

    let analysis = `Code Analysis Results:
- Language: ${language}
- Lines: ${lines.length}
- Characters: ${characters}
- Words: ${words}`;

    if (analysis_type === 'complexity' || analysis_type === 'all') {
      const complexity = this._analyzeCodeComplexity(code, language);
      analysis += `\n- Complexity: ${complexity}`;
    }

    if (analysis_type === 'style' || analysis_type === 'all') {
      const styleIssues = this._analyzeCodeStyle(code, language);
      analysis += `\n- Style Issues: ${styleIssues.length}`;
      if (styleIssues.length > 0) {
        analysis += `\n  ${styleIssues.slice(0, 3).join('\n  ')}`;
      }
    }

    return analysis;
  }

  async _handleWebSearch(parameters) {
    const { query, max_results = 5 } = parameters;

    // This is a placeholder - in a real implementation, you'd integrate with a search API

    return `[Web search would be performed for: "${query}"]
Max results: ${max_results}
Note: This is a demonstration. In production, integrate with a search API like Google Custom Search or Bing Search.`;
  }

  async _handleSystemInfo(parameters) {
    const { info_type = 'general' } = parameters;

    // This is a placeholder - in a real implementation, you'd gather actual system information

    return `[System information would be retrieved for type: ${info_type}]
Note: This is a demonstration. In production, implement proper system information gathering.`;
  }

  async _handleDatabaseQuery(parameters) {
    const { query, database_type } = parameters;

    // This is a placeholder - in a real implementation, you'd execute actual database queries

    return `[Database query would be executed]
Type: ${database_type}
Query: ${query}
Note: This is a demonstration. In production, implement proper database connectivity and query execution.`;
  }

  /**
   * Analyze code complexity
   */
  _analyzeCodeComplexity(code, language) {
    const lines = code.split('\n');
    let complexity = 0;

    // Simple complexity heuristics
    for (const line of lines) {
      if (line.includes('if') || line.includes('for') || line.includes('while')) complexity++;
      if (line.includes('switch') || line.includes('case')) complexity += 2;
      if (line.includes('try') || line.includes('catch')) complexity++;
      if (line.includes('function') || line.includes('def') || line.includes('class')) complexity++;
    }

    if (complexity <= 5) return 'Low';
    if (complexity <= 15) return 'Medium';
    if (complexity <= 30) return 'High';
    return 'Very High';
  }

  /**
   * Analyze code style
   */
  _analyzeCodeStyle(code, language) {
    const issues = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for long lines
      if (line.length > 100) {
        issues.push(`Line ${lineNum}: Line too long (${line.length} characters)`);
      }

      // Check for trailing whitespace
      if (line.endsWith(' ') || line.endsWith('\t')) {
        issues.push(`Line ${lineNum}: Trailing whitespace`);
      }

      // Check for mixed tabs and spaces
      if (line.includes('\t') && line.includes(' ')) {
        issues.push(`Line ${lineNum}: Mixed tabs and spaces`);
      }
    }

    return issues;
  }

  /**
   * List all available tools
   */
  listTools() {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      registeredAt: tool.registeredAt
    }));
  }

  /**
   * Get tool information
   */
  getToolInfo(toolName) {
    const tool = this.tools.get(toolName);
    if (!tool) return null;

    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      registeredAt: tool.registeredAt
    };
  }

  /**
   * Remove a tool
   */
  removeTool(toolName) {
    const removed = this.tools.delete(toolName);
    if (removed) {
      this.logger.info('Tool removed', { toolName });
    }
    return { success: removed, toolName };
  }
}

module.exports = { ToolManager };
