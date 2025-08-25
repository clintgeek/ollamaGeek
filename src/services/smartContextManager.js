const fs = require('fs').promises;

class SmartContextManager {
  constructor() {
    this.contextCache = new Map();
    this.maxCacheSize = 100;

    // Fast heuristics for common patterns
    this.fastPatterns = {
      // File references
      filePatterns: [
        /`([^`]+\.(js|jsx|ts|tsx|py|java|cpp|c|go|rs|php|rb))`/g,
        /"([^"]+\.(js|jsx|ts|tsx|py|java|cpp|c|go|rs|php|rb))"/g,
        /'([^']+\.(js|jsx|ts|tsx|py|java|cpp|c|go|rs|php|rb))'/g,
        // Enhanced patterns for better context understanding
        /(?:analyze|refactor|test|debug|review|optimize)\s+(?:the\s+)?(?:file\s+)?["']?([^"'\s]+\.(?:js|jsx|ts|tsx|py|java|cpp|c|go|rs|php|rb))["']?/gi,
        /(?:in|to|from|with)\s+["']?([^"'\s]+\.(?:js|jsx|ts|tsx|py|java|cpp|c|go|rs|php|rb))["']?/gi,
        /(?:create|edit|modify|update)\s+(?:a\s+)?(?:file\s+)?(?:called\s+)?["']?([^"'\s]+\.(?:js|jsx|ts|tsx|py|java|cpp|c|go|rs|php|rb))["']?/gi
      ],

      // Common coding keywords that suggest file needs
      codingKeywords: [
        'function', 'class', 'component', 'import', 'require',
        'export', 'module', 'package', 'dependency', 'config'
      ],

      // Git-related keywords
      gitKeywords: ['commit', 'branch', 'merge', 'conflict', 'stash', 'rebase']
    };
  }

  /**
   * Get context using fast heuristics + AI only when needed
   */
  async getSmartContext(requestBody, taskType, complexity) {
    const content = this._extractContent(requestBody);
    const cacheKey = this._generateCacheKey(content, taskType);

    // Check cache first (fastest path)
    if (this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey);
    }

    try {
      // Use fast heuristics for 90% of cases
      let context = await this._getFastContext(content, taskType, complexity);

      // Only use AI if heuristics are uncertain
      if (this._needsAIAnalysis(content, taskType, complexity)) {
        context = await this._enhanceWithAI(context, content, taskType);
      }

      // Cache the result
      this._cacheContext(cacheKey, context);

      return context;
    } catch (error) {
      console.log(`⚠️ Smart context error: ${error.message}`);
      return this._getFallbackContext();
    }
  }

  /**
   * Fast context gathering using heuristics
   */
  async _getFastContext(content, taskType, complexity) {
    const context = {
      files: [],
      dependencies: null,
      gitStatus: null,
      reasoning: 'Fast heuristic analysis',
      method: 'heuristic'
    };

    // Fast file detection
    if (taskType === 'coding' || this._hasCodingKeywords(content)) {
      context.files = await this._getRelevantFilesFast(content);
      context.dependencies = await this._getDependenciesFast();
    }

    // Fast git detection
    if (this._hasGitKeywords(content) || taskType === 'coding') {
      context.gitStatus = await this._getGitStatusFast();
    }

    return context;
  }

  /**
   * Check if content has coding keywords
   */
  _hasCodingKeywords(content) {
    const lowerContent = content.toLowerCase();
    return this.fastPatterns.codingKeywords.some(keyword =>
      lowerContent.includes(keyword)
    );
  }

  /**
   * Check if content has git keywords
   */
  _hasGitKeywords(content) {
    const lowerContent = content.toLowerCase();
    return this.fastPatterns.gitKeywords.some(keyword =>
      lowerContent.includes(keyword)
    );
  }

  /**
   * Fast file detection using patterns
   */
  async _getRelevantFilesFast(content) {
    const relevantFiles = [];
    const lowerContent = content.toLowerCase();

    // Look for explicit file references (fastest)
    for (const pattern of this.fastPatterns.filePatterns) {
      let match;
      while ((match = pattern.exec(lowerContent)) !== null) {
        const filePath = match[1];
        if (await this._fileExists(filePath)) {
          relevantFiles.push({
            path: filePath,
            method: 'explicit_reference'
          });
        }
      }
    }

    // If no explicit files, get project structure (still fast)
    if (relevantFiles.length === 0) {
      const projectFiles = await this._getProjectStructureFast();
      relevantFiles.push(...projectFiles);
    }

    return relevantFiles.slice(0, 3); // Limit for speed
  }

  /**
   * Fast project structure detection
   */
  async _getProjectStructureFast() {
    try {
      const files = await fs.readdir('.');
      const relevantFiles = files
        .filter(file => file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx'))
        .slice(0, 5) // Increased limit for better context
        .map(file => ({ path: file, method: 'project_structure' }));

      // Also check parent directory for broader context
      try {
        const parentFiles = await fs.readdir('..');
        const parentRelevantFiles = parentFiles
          .filter(file => file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx'))
          .slice(0, 3)
          .map(file => ({ path: `../${file}`, method: 'parent_project_structure' }));

        relevantFiles.push(...parentRelevantFiles);
      } catch {
        // Parent directory access might fail, that's okay
      }

      return relevantFiles;
    } catch {
      return [];
    }
  }

  /**
   * Fast dependencies check
   */
  async _getDependenciesFast() {
    try {
      const packageJson = await fs.readFile('package.json', 'utf8');
      const pkg = JSON.parse(packageJson);
      return {
        dependencies: Object.keys(pkg.dependencies || {}).slice(0, 5), // Limit for speed
        devDependencies: Object.keys(pkg.devDependencies || {}).slice(0, 3)
      };
    } catch {
      return null;
    }
  }

  /**
   * Fast git status check
   */
  async _getGitStatusFast() {
    try {
      const { execSync } = require('child_process');
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      const changes = status.split('\n').filter(line => line.trim());
      return {
        count: changes.length,
        files: changes.slice(0, 3) // Only first 3 for speed
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if file exists
   */
  async _fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Determine if AI analysis is actually needed
   */
  _needsAIAnalysis(content, taskType, complexity) {
    // Use AI only for complex cases where heuristics might miss things
    if (complexity === 'very_high') return true;
    if (taskType === 'coding' && content.length > 200) return true;
    if (content.includes('architecture') || content.includes('design')) return true;

    return false; // Default to fast path
  }

  /**
   * Enhance context with AI (only when needed)
   */
  async _enhanceWithAI(context, content, taskType) {
    // For now, just mark that AI was considered
    // We can add actual AI calls later if needed
    context.method = 'hybrid';
    context.reasoning = 'Fast heuristics + AI consideration';

    return context;
  }

  /**
   * Extract content from request
   */
  _extractContent(requestBody) {
    if (requestBody.prompt) return requestBody.prompt;
    if (requestBody.messages) {
      const userMessages = requestBody.messages.filter(msg => msg.role === 'user');
      return userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
    }
    return '';
  }

  /**
   * Generate cache key
   */
  _generateCacheKey(content, taskType) {
    const hash = require('crypto').createHash('md5');
    return hash.update(`${content.substring(0, 100)}_${taskType}`).digest('hex');
  }

  /**
   * Cache context
   */
  _cacheContext(key, context) {
    if (this.contextCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.contextCache.keys().next().value;
      this.contextCache.delete(firstKey);
    }
    this.contextCache.set(key, context);
  }

  /**
   * Get fallback context
   */
  _getFallbackContext() {
    return {
      files: [],
      dependencies: null,
      gitStatus: null,
      reasoning: 'Fallback: No context available',
      method: 'fallback'
    };
  }

  /**
   * Format context for display
   */
  formatContext(context) {
    let formatted = '';

    formatted += `⚡ ${context.reasoning} (${context.method})\n`;

    if (context.files.length > 0) {
      formatted += `📁 Files: ${context.files.map(f => f.path).join(', ')}\n`;
    }

    if (context.dependencies) {
      formatted += `📦 Dependencies: ${context.dependencies.dependencies.join(', ')}\n`;
    }

    if (context.gitStatus) {
      formatted += `🔄 Git: ${context.gitStatus.count} changes\n`;
    }

    return formatted;
  }
}

module.exports = { SmartContextManager };
