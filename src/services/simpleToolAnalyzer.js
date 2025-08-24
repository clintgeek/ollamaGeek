class SimpleToolAnalyzer {
  constructor() {
    this.toolCache = new Map();
  }

  /**
   * Analyze a request to determine if tools are needed
   */
  async analyzeForTools(content, taskType, complexity) {
    // Simple keyword-based detection
    const lowerContent = content.toLowerCase();
    
    const tools = [];

    // File creation - very simple detection
    if (lowerContent.includes('create') || lowerContent.includes('make') || lowerContent.includes('generate') || lowerContent.includes('add')) {
      tools.push({
        name: 'create_file',
        confidence: 'high',
        reasoning: 'Request contains creation keywords'
      });
    }

    // File editing
    if (lowerContent.includes('edit') || lowerContent.includes('modify') || lowerContent.includes('change') || lowerContent.includes('update') || lowerContent.includes('fix')) {
      tools.push({
        name: 'edit_file',
        confidence: 'high',
        reasoning: 'Request contains modification keywords'
      });
    }

    // Terminal commands
    if (lowerContent.includes('run') || lowerContent.includes('execute') || lowerContent.includes('install') || lowerContent.includes('build')) {
      tools.push({
        name: 'run_terminal',
        confidence: 'medium',
        reasoning: 'Request contains command execution keywords'
      });
    }

    // Git operations
    if (lowerContent.includes('commit') || lowerContent.includes('push') || lowerContent.includes('branch') || lowerContent.includes('merge')) {
      tools.push({
        name: 'git_operation',
        confidence: 'high',
        reasoning: 'Request contains git operation keywords'
      });
    }

    return {
      needsTools: tools.length > 0,
      tools,
      method: 'simple_keywords'
    };
  }

  /**
   * Get tool suggestions for a request
   */
  getToolSuggestions(content) {
    const analysis = this.analyzeForTools(content);
    
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

module.exports = { SimpleToolAnalyzer };
