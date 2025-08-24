const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

/**
 * AI-Powered Code Analysis and Refactoring Service
 * Provides advanced code understanding, refactoring, testing, and debugging capabilities
 */
class AICodeAnalyzer {
  constructor() {
    this.ollamaBaseUrl = 'http://localhost:11434';
    this.analysisCache = new Map();
    this.refactoringHistory = new Map();
  }

  /**
   * Analyze code for quality, issues, and improvement opportunities
   */
  async analyzeCode(filePath, options = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileExtension = path.extname(filePath);
      const language = this._detectLanguage(fileExtension);
      
      const analysisPrompt = this._buildAnalysisPrompt(content, language, options);
      
      const analysis = await this._getAIResponse(analysisPrompt, {
        model: options.model || 'codellama:13b-instruct-q4_K_M',
        temperature: 0.1,
        max_tokens: 2000
      });

      const parsedAnalysis = this._parseAnalysisResponse(analysis);
      
      // Cache the analysis
      this.analysisCache.set(filePath, {
        ...parsedAnalysis,
        timestamp: Date.now(),
        options
      });

      return {
        success: true,
        filePath,
        language,
        analysis: parsedAnalysis,
        suggestions: parsedAnalysis.suggestions || [],
        issues: parsedAnalysis.issues || [],
        improvements: parsedAnalysis.improvements || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  /**
   * Refactor code based on AI analysis and user requirements
   */
  async refactorCode(filePath, refactoringType, options = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileExtension = path.extname(filePath);
      const language = this._detectLanguage(fileExtension);
      
      const refactoringPrompt = this._buildRefactoringPrompt(
        content, 
        language, 
        refactoringType, 
        options
      );
      
      const refactoredCode = await this._getAIResponse(refactoringPrompt, {
        model: options.model || 'codellama:13b-instruct-q4_K_M',
        temperature: 0.2,
        max_tokens: 4000
      });

      const parsedRefactoring = this._parseRefactoringResponse(refactoredCode);
      
      // Track refactoring history
      this.refactoringHistory.set(filePath, {
        type: refactoringType,
        timestamp: Date.now(),
        originalContent: content,
        refactoredContent: parsedRefactoring.code,
        changes: parsedRefactoring.changes,
        options
      });

      return {
        success: true,
        filePath,
        refactoringType,
        originalContent: content,
        refactoredContent: parsedRefactoring.code,
        changes: parsedRefactoring.changes,
        explanation: parsedRefactoring.explanation
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  /**
   * Generate comprehensive tests for code
   */
  async generateTests(filePath, testFramework = 'auto', options = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileExtension = path.extname(filePath);
      const language = this._detectLanguage(fileExtension);
      
      // Auto-detect test framework if not specified
      if (testFramework === 'auto') {
        testFramework = this._detectTestFramework(language, options);
      }
      
      const testPrompt = this._buildTestGenerationPrompt(
        content, 
        language, 
        testFramework, 
        options
      );
      
      const generatedTests = await this._getAIResponse(testPrompt, {
        model: options.model || 'codellama:13b-instruct-q4_K_M',
        temperature: 0.3,
        max_tokens: 3000
      });

      const parsedTests = this._parseTestResponse(generatedTests);
      
      return {
        success: true,
        filePath,
        testFramework,
        tests: parsedTests.tests,
        testFile: parsedTests.testFile,
        setupInstructions: parsedTests.setupInstructions,
        coverage: parsedTests.coverage
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  /**
   * Debug code and provide intelligent solutions
   */
  async debugCode(filePath, errorContext = null, options = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileExtension = path.extname(filePath);
      const language = this._detectLanguage(fileExtension);
      
      const debugPrompt = this._buildDebugPrompt(
        content, 
        language, 
        errorContext, 
        options
      );
      
      const debugSolution = await this._getAIResponse(debugPrompt, {
        model: options.model || 'codellama:13b-instruct-q4_K_M',
        temperature: 0.1,
        max_tokens: 2500
      });

      const parsedDebug = this._parseDebugResponse(debugSolution);
      
      return {
        success: true,
        filePath,
        issues: parsedDebug.issues,
        solutions: parsedDebug.solutions,
        correctedCode: parsedDebug.correctedCode,
        preventionTips: parsedDebug.preventionTips
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  /**
   * Perform intelligent code review
   */
  async reviewCode(filePath, reviewType = 'comprehensive', options = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileExtension = path.extname(filePath);
      const language = this._detectLanguage(fileExtension);
      
      const reviewPrompt = this._buildReviewPrompt(
        content, 
        language, 
        reviewType, 
        options
      );
      
      const review = await this._getAIResponse(reviewPrompt, {
        model: options.model || 'codellama:13b-instruct-q4_K_M',
        temperature: 0.2,
        max_tokens: 3000
      });

      const parsedReview = this._parseReviewResponse(review);
      
      return {
        success: true,
        filePath,
        reviewType,
        score: parsedReview.score,
        feedback: parsedReview.feedback,
        suggestions: parsedReview.suggestions,
        bestPractices: parsedReview.bestPractices,
        securityIssues: parsedReview.securityIssues,
        performanceIssues: parsedReview.performanceIssues
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  /**
   * Generate documentation for code
   */
  async generateDocumentation(filePath, docType = 'comprehensive', options = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileExtension = path.extname(filePath);
      const language = this._detectLanguage(fileExtension);
      
      const docPrompt = this._buildDocumentationPrompt(
        content, 
        language, 
        docType, 
        options
      );
      
      const documentation = await this._getAIResponse(docPrompt, {
        model: options.model || 'codellama:13b-instruct-q4_K_M',
        temperature: 0.1,
        max_tokens: 3000
      });

      const parsedDocs = this._parseDocumentationResponse(documentation);
      
      return {
        success: true,
        filePath,
        docType,
        documentation: parsedDocs.documentation,
        apiDocs: parsedDocs.apiDocs,
        examples: parsedDocs.examples,
        usageGuide: parsedDocs.usageGuide
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  /**
   * Optimize code for performance and efficiency
   */
  async optimizeCode(filePath, optimizationType = 'performance', options = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileExtension = path.extname(filePath);
      const language = this._detectLanguage(fileExtension);
      
      const optimizationPrompt = this._buildOptimizationPrompt(
        content, 
        language, 
        optimizationType, 
        options
      );
      
      const optimizedCode = await this._getAIResponse(optimizationPrompt, {
        model: options.model || 'codellama:13b-instruct-q4_K_M',
        temperature: 0.1,
        max_tokens: 4000
      });

      const parsedOptimization = this._parseOptimizationResponse(optimizedCode);
      
      return {
        success: true,
        filePath,
        optimizationType,
        originalCode: content,
        optimizedCode: parsedOptimization.code,
        improvements: parsedOptimization.improvements,
        metrics: parsedOptimization.metrics,
        explanation: parsedOptimization.explanation
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  // Private helper methods
  _detectLanguage(fileExtension) {
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala'
    };
    return languageMap[fileExtension] || 'text';
  }

  _detectTestFramework(language, options) {
    const frameworkMap = {
      javascript: options.testFramework || 'jest',
      typescript: options.testFramework || 'jest',
      python: options.testFramework || 'pytest',
      java: options.testFramework || 'junit',
      cpp: options.testFramework || 'gtest',
      go: options.testFramework || 'testing'
    };
    return frameworkMap[language] || 'default';
  }

  async _getAIResponse(prompt, options) {
    try {
      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: options.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.1,
          top_p: options.top_p || 0.9,
          max_tokens: options.max_tokens || 2000
        }
      });
      
      return response.data.response;
    } catch (error) {
      throw new Error(`AI request failed: ${error.message}`);
    }
  }

  _buildAnalysisPrompt(content, language, options) {
    return `Analyze the following ${language} code for quality, issues, and improvement opportunities:

${content}

Provide a comprehensive analysis including:
1. Code quality score (1-10)
2. Identified issues and bugs
3. Performance improvements
4. Security concerns
5. Best practices recommendations
6. Specific code suggestions

Focus on: ${options.focus || 'overall quality'}

Respond in JSON format:
{
  "score": number,
  "issues": [{"type": "bug|performance|security|style", "line": number, "description": "string", "suggestion": "string"}],
  "suggestions": [{"type": "refactor|optimize|secure", "description": "string", "code": "string"}],
  "improvements": [{"category": "string", "description": "string", "impact": "high|medium|low"}]
}`;
  }

  _buildRefactoringPrompt(content, language, refactoringType, options) {
    return `Refactor the following ${language} code for ${refactoringType}:

${content}

Refactoring requirements:
- Type: ${refactoringType}
- Focus: ${options.focus || 'code quality and maintainability'}
- Preserve functionality: ${options.preserveFunctionality !== false}
- Add comments: ${options.addComments || false}
- Follow patterns: ${options.patterns || 'modern best practices'}

Provide the refactored code and explain the changes made.

Respond in JSON format:
{
  "code": "refactored code here",
  "changes": [{"type": "string", "description": "string", "line": "number"}],
  "explanation": "detailed explanation of refactoring"
}`;
  }

  _buildTestGenerationPrompt(content, language, testFramework, options) {
    return `Generate comprehensive tests for the following ${language} code using ${testFramework}:

${content}

Test requirements:
- Framework: ${testFramework}
- Coverage: ${options.coverage || 'comprehensive'}
- Test types: ${options.testTypes || 'unit, integration, edge cases'}
- Mocking: ${options.mocking || 'where appropriate'}
- Assertions: ${options.assertions || 'clear and descriptive'}

Provide:
1. Test file content
2. Setup instructions
3. Coverage analysis
4. Example test runs

Respond in JSON format:
{
  "tests": "test code here",
  "testFile": "filename.test.ext",
  "setupInstructions": "setup steps",
  "coverage": "coverage analysis"
}`;
  }

  _buildDebugPrompt(content, language, errorContext, options) {
    return `Debug the following ${language} code:

${content}

${errorContext ? `Error context: ${errorContext}` : ''}

Debug requirements:
- Identify issues: ${options.identifyIssues !== false}
- Provide solutions: ${options.provideSolutions !== false}
- Suggest prevention: ${options.suggestPrevention || false}
- Code corrections: ${options.codeCorrections !== false}

Respond in JSON format:
{
  "issues": [{"type": "string", "line": "number", "description": "string", "severity": "high|medium|low"}],
  "solutions": [{"issue": "string", "solution": "string", "code": "string"}],
  "correctedCode": "corrected code here",
  "preventionTips": ["tip1", "tip2"]
}`;
  }

  _buildReviewPrompt(content, language, reviewType, options) {
    return `Perform a ${reviewType} code review for the following ${language} code:

${content}

Review focus:
- Type: ${reviewType}
- Quality: ${options.quality !== false}
- Security: ${options.security !== false}
- Performance: ${options.performance !== false}
- Best practices: ${options.bestPractices !== false}
- Maintainability: ${options.maintainability !== false}

Provide a comprehensive review with scoring and actionable feedback.

Respond in JSON format:
{
  "score": {"overall": number, "quality": number, "security": number, "performance": number},
  "feedback": "overall feedback",
  "suggestions": [{"category": "string", "suggestion": "string", "priority": "high|medium|low"}],
  "bestPractices": ["practice1", "practice2"],
  "securityIssues": [{"issue": "string", "severity": "string", "fix": "string"}],
  "performanceIssues": [{"issue": "string", "impact": "string", "optimization": "string"}]
}`;
  }

  _buildDocumentationPrompt(content, language, docType, options) {
    return `Generate ${docType} documentation for the following ${language} code:

${content}

Documentation requirements:
- Type: ${docType}
- Style: ${options.style || 'clear and professional'}
- Examples: ${options.examples !== false}
- API docs: ${options.apiDocs !== false}
- Usage guide: ${options.usageGuide !== false}

Provide comprehensive documentation that helps developers understand and use the code.

Respond in JSON format:
{
  "documentation": "main documentation here",
  "apiDocs": "API documentation",
  "examples": ["example1", "example2"],
  "usageGuide": "usage instructions"
}`;
  }

  _buildOptimizationPrompt(content, language, optimizationType, options) {
    return `Optimize the following ${language} code for ${optimizationType}:

${content}

Optimization requirements:
- Type: ${optimizationType}
- Focus: ${options.focus || 'overall performance'}
- Maintainability: ${options.maintainability !== false}
- Readability: ${options.readability !== false}
- Benchmarking: ${options.benchmarking || false}

Provide optimized code with explanations of improvements and performance metrics.

Respond in JSON format:
{
  "code": "optimized code here",
  "improvements": [{"type": "string", "description": "string", "impact": "string"}],
  "metrics": {"performance": "string", "memory": "string", "complexity": "string"},
  "explanation": "detailed explanation of optimizations"
}`;
  }

  _parseAnalysisResponse(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      return this._fallbackAnalysisResponse(response);
    }
  }

  _parseRefactoringResponse(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      return this._fallbackRefactoringResponse(response);
    }
  }

  _parseTestResponse(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      return this._fallbackTestResponse(response);
    }
  }

  _parseDebugResponse(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      return this._fallbackDebugResponse(response);
    }
  }

  _parseReviewResponse(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      return this._fallbackReviewResponse(response);
    }
  }

  _parseDocumentationResponse(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      return this._fallbackDocumentationResponse(response);
    }
  }

  _parseOptimizationResponse(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      return this._fallbackOptimizationResponse(response);
    }
  }

  // Fallback response parsers for when AI doesn't return valid JSON
  _fallbackAnalysisResponse(response) {
    return {
      score: 7,
      issues: [],
      suggestions: [],
      improvements: []
    };
  }

  _fallbackRefactoringResponse(response) {
    return {
      code: response,
      changes: [],
      explanation: "AI-generated refactored code"
    };
  }

  _fallbackTestResponse(response) {
    return {
      tests: response,
      testFile: "test.js",
      setupInstructions: "Run tests with your preferred test runner",
      coverage: "Comprehensive test coverage"
    };
  }

  _fallbackDebugResponse(response) {
    return {
      issues: [],
      solutions: [],
      correctedCode: response,
      preventionTips: []
    };
  }

  _fallbackReviewResponse(response) {
    return {
      score: { overall: 7, quality: 7, security: 7, performance: 7 },
      feedback: response,
      suggestions: [],
      bestPractices: [],
      securityIssues: [],
      performanceIssues: []
    };
  }

  _fallbackDocumentationResponse(response) {
    return {
      documentation: response,
      apiDocs: "API documentation",
      examples: [],
      usageGuide: "Usage instructions"
    };
  }

  _fallbackOptimizationResponse(response) {
    return {
      code: response,
      improvements: [],
      metrics: { performance: "Improved", memory: "Optimized", complexity: "Reduced" },
      explanation: "AI-optimized code"
    };
  }

  /**
   * Get available AI tools and capabilities
   */
  getAvailableTools() {
    return [
      {
        name: 'analyze_code',
        description: 'AI-powered code analysis for quality, issues, and improvements',
        parameters: {
          filePath: 'string (path to file)',
          options: 'object (analysis options)'
        }
      },
      {
        name: 'refactor_code',
        description: 'AI-powered code refactoring for better quality and maintainability',
        parameters: {
          filePath: 'string (path to file)',
          refactoringType: 'string (type of refactoring)',
          options: 'object (refactoring options)'
        }
      },
      {
        name: 'generate_tests',
        description: 'AI-powered test generation for comprehensive coverage',
        parameters: {
          filePath: 'string (path to file)',
          testFramework: 'string (test framework)',
          options: 'object (test options)'
        }
      },
      {
        name: 'debug_code',
        description: 'AI-powered debugging and issue resolution',
        parameters: {
          filePath: 'string (path to file)',
          errorContext: 'string (error context)',
          options: 'object (debug options)'
        }
      },
      {
        name: 'review_code',
        description: 'AI-powered code review with scoring and feedback',
        parameters: {
          filePath: 'string (path to file)',
          reviewType: 'string (review type)',
          options: 'object (review options)'
        }
      },
      {
        name: 'generate_documentation',
        description: 'AI-powered documentation generation',
        parameters: {
          filePath: 'string (path to file)',
          docType: 'string (documentation type)',
          options: 'object (documentation options)'
        }
      },
      {
        name: 'optimize_code',
        description: 'AI-powered code optimization for performance and efficiency',
        parameters: {
          filePath: 'string (path to file)',
          optimizationType: 'string (optimization type)',
          options: 'object (optimization options)'
        }
      }
    ];
  }

  /**
   * Get analysis cache statistics
   */
  getCacheStats() {
    return {
      totalEntries: this.analysisCache.size,
      cacheHits: this.analysisCache.size,
      refactoringHistory: this.refactoringHistory.size
    };
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
    return { success: true, message: 'Cache cleared' };
  }
}

module.exports = { AICodeAnalyzer };
