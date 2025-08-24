const { Logger } = require('../utils/logger');

class ResponseProcessor {
  constructor() {
    this.logger = new Logger();
    this.responseCache = new Map();
    this.processingHistory = new Map();

    // Response enhancement strategies
    this.enhancementStrategies = {
      'code_formatting': this._enhanceCodeFormatting,
      'content_structure': this._enhanceContentStructure,
      'readability': this._enhanceReadability,
      'completeness': this._enhanceCompleteness,
      'consistency': this._enhanceConsistency
    };
  }

  /**
   * Process and enhance generate responses
   */
  async processGenerateResponse(ollamaResponse, originalRequest, selectedModel) {
    try {
      const processedResponse = { ...ollamaResponse };

      // Add processing metadata
      processedResponse._processing = {
        enhanced: true,
        enhancedAt: new Date().toISOString(),
        originalModel: selectedModel,
        enhancements: []
      };

      // Apply enhancements based on content analysis
      const contentAnalysis = originalRequest._contentAnalysis || {};
      const enhancements = await this._determineEnhancements(contentAnalysis, ollamaResponse);

      for (const enhancement of enhancements) {
        try {
          const enhanced = await this.enhancementStrategies[enhancement](
            processedResponse,
            originalRequest,
            selectedModel
          );

          if (enhanced) {
            processedResponse._processing.enhancements.push(enhancement);
          }
        } catch (error) {
          this.logger.warn('Enhancement failed', {
            enhancement,
            error: error.message
          });
        }
      }

      // Cache the processed response
      this._cacheResponse(originalRequest, processedResponse);

      this.logger.info('Generate response processed', {
        model: selectedModel,
        enhancements: processedResponse._processing.enhancements,
        responseLength: processedResponse.response?.length || 0
      });

      return processedResponse;

    } catch (error) {
      this.logger.error('Error processing generate response', { error: error.message });
      // Return original response if processing fails
      return ollamaResponse;
    }
  }

  /**
   * Process and enhance chat responses
   */
  async processChatResponse(ollamaResponse, originalRequest, selectedModel) {
    try {
      const processedResponse = { ...ollamaResponse };

      // Add processing metadata
      processedResponse._processing = {
        enhanced: true,
        enhancedAt: new Date().toISOString(),
        originalModel: selectedModel,
        enhancements: []
      };

      // Apply enhancements based on content analysis
      const contentAnalysis = originalRequest._contentAnalysis || {};
      const enhancements = await this._determineEnhancements(contentAnalysis, ollamaResponse);

      for (const enhancement of enhancements) {
        try {
          const enhanced = await this.enhancementStrategies[enhancement](
            processedResponse,
            originalRequest,
            selectedModel
          );

          if (enhanced) {
            processedResponse._processing.enhancements.push(enhancement);
          }
        } catch (error) {
          this.logger.warn('Enhancement failed', {
            enhancement,
            error: error.message
          });
        }
      }

      // Cache the processed response
      this._cacheResponse(originalRequest, processedResponse);

      this.logger.info('Chat response processed', {
        model: selectedModel,
        enhancements: processedResponse._processing.enhancements,
        responseLength: processedResponse.message?.content?.length || 0
      });

      return processedResponse;

    } catch (error) {
      this.logger.error('Error processing chat response', { error: error.message });
      // Return original response if processing fails
      return ollamaResponse;
    }
  }

  /**
   * Determine which enhancements to apply
   */
  async _determineEnhancements(contentAnalysis, response) {
    const enhancements = [];

    // Always apply content structure enhancement
    enhancements.push('content_structure');

    // Apply code formatting if code is detected
    if (contentAnalysis.isCode || this._containsCode(response)) {
      enhancements.push('code_formatting');
    }

    // Apply readability enhancement for long responses
    const responseLength = this._getResponseLength(response);
    if (responseLength > 500) {
      enhancements.push('readability');
    }

    // Apply completeness enhancement for technical content
    if (contentAnalysis.isTechnical) {
      enhancements.push('completeness');
    }

    // Apply consistency enhancement for multi-part responses
    if (this._isMultiPartResponse(response)) {
      enhancements.push('consistency');
    }

    return enhancements;
  }

  /**
   * Check if response contains code
   */
  _containsCode(response) {
    const content = this._extractResponseContent(response);
    if (!content) return false;

    const codePatterns = [
      /```[\s\S]*```/,
      /function\s+\w+\s*\(/,
      /class\s+\w+/,
      /import\s+.*from/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /if\s*\(/,
      /for\s*\(/,
      /while\s*\(/
    ];

    return codePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Get response length
   */
  _getResponseLength(response) {
    const content = this._extractResponseContent(response);
    return content ? content.length : 0;
  }

  /**
   * Check if response is multi-part
   */
  _isMultiPartResponse(response) {
    const content = this._extractResponseContent(response);
    if (!content) return false;

    const multiPartPatterns = [
      /^\d+\.\s/, // Numbered lists
      /^-\s/, // Bullet points
      /^##\s/, // Markdown headers
      /^Step\s+\d+:/i, // Step instructions
      /^First,|Then,|Finally,/i // Sequential instructions
    ];

    const lines = content.split('\n');
    let multiPartCount = 0;

    for (const line of lines) {
      if (multiPartPatterns.some(pattern => pattern.test(line.trim()))) {
        multiPartCount++;
      }
    }

    return multiPartCount >= 3; // At least 3 multi-part indicators
  }

  /**
   * Extract content from response
   */
  _extractResponseContent(response) {
    if (response.response) return response.response;
    if (response.message?.content) return response.message.content;
    if (response.content) return response.content;
    return null;
  }

  /**
   * Enhance code formatting
   */
  async _enhanceCodeFormatting(response, originalRequest, selectedModel) {
    const content = this._extractResponseContent(response);
    if (!content) return false;

    let enhanced = false;
    let enhancedContent = content;

    // Ensure proper code block formatting
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    enhancedContent = enhancedContent.replace(codeBlockPattern, (match, lang, code) => {
      const language = lang || this._detectLanguage(code);
      enhanced = true;
      return `\`\`\`${language}\n${code.trim()}\n\`\`\``;
    });

    // Format inline code
    const inlineCodePattern = /`([^`]+)`/g;
    enhancedContent = enhancedContent.replace(inlineCodePattern, (match, code) => {
      if (code.includes(' ') || code.length > 20) {
        enhanced = true;
        return `\`\`\`\n${code}\n\`\`\``;
      }
      return match;
    });

    // Add syntax highlighting hints for common languages
    if (enhanced) {
      enhancedContent = this._addSyntaxHints(enhancedContent);
    }

    // Update response
    if (response.response) {
      response.response = enhancedContent;
    } else if (response.message?.content) {
      response.message.content = enhancedContent;
    } else if (response.content) {
      response.content = enhancedContent;
    }

    return enhanced;
  }

  /**
   * Enhance content structure
   */
  async _enhanceContentStructure(response, originalRequest, selectedModel) {
    const content = this._extractResponseContent(response);
    if (!content) return false;

    let enhanced = false;
    let enhancedContent = content;

    // Add section headers for long responses
    if (content.length > 1000) {
      enhancedContent = this._addSectionHeaders(enhancedContent);
      enhanced = true;
    }

    // Improve list formatting
    enhancedContent = this._improveListFormatting(enhancedContent);

    // Add summary for very long responses
    if (content.length > 2000) {
      enhancedContent = this._addSummary(enhancedContent);
      enhanced = true;
    }

    // Update response
    if (response.response) {
      response.response = enhancedContent;
    } else if (response.message?.content) {
      response.message.content = enhancedContent;
    } else if (response.content) {
      response.content = enhancedContent;
    }

    return enhanced;
  }

  /**
   * Enhance readability
   */
  async _enhanceReadability(response, originalRequest, selectedModel) {
    const content = this._extractResponseContent(response);
    if (!content) return false;

    let enhanced = false;
    let enhancedContent = content;

    // Break up long paragraphs
    enhancedContent = this._breakLongParagraphs(enhancedContent);

    // Add visual separators
    enhancedContent = this._addVisualSeparators(enhancedContent);

    // Improve spacing
    enhancedContent = this._improveSpacing(enhancedContent);

    // Update response
    if (response.response) {
      response.response = enhancedContent;
    } else if (response.message?.content) {
      response.message.content = enhancedContent;
    } else if (response.content) {
      response.content = enhancedContent;
    }

    return enhanced;
  }

  /**
   * Enhance completeness
   */
  async _enhanceCompleteness(response, originalRequest, selectedModel) {
    const content = this._extractResponseContent(response);
    if (!content) return false;

    let enhanced = false;
    let enhancedContent = content;

    // Check for incomplete code blocks
    if (this._hasIncompleteCode(content)) {
      enhancedContent = this._completeCodeBlocks(enhancedContent);
      enhanced = true;
    }

    // Add missing explanations for technical terms
    if (originalRequest._contentAnalysis?.isTechnical) {
      enhancedContent = this._addTechnicalExplanations(enhancedContent);
      enhanced = true;
    }

    // Update response
    if (response.response) {
      response.response = enhancedContent;
    } else if (response.message?.content) {
      response.message.content = enhancedContent;
    } else if (response.content) {
      response.content = enhancedContent;
    }

    return enhanced;
  }

  /**
   * Enhance consistency
   */
  async _enhanceConsistency(response, originalRequest, selectedModel) {
    const content = this._extractResponseContent(response);
    if (!content) return false;

    let enhanced = false;
    let enhancedContent = content;

    // Standardize formatting
    enhancedContent = this._standardizeFormatting(enhancedContent);

    // Ensure consistent terminology
    enhancedContent = this._standardizeTerminology(enhancedContent);

    // Update response
    if (response.response) {
      response.response = enhancedContent;
    } else if (response.message?.content) {
      response.message.content = enhancedContent;
    } else if (response.content) {
      response.content = enhancedContent;
    }

    return enhanced;
  }

  /**
   * Detect programming language from code
   */
  _detectLanguage(code) {
    const languagePatterns = {
      javascript: /function|const|let|var|=>|import|export|console\.log/,
      python: /def\s+\w+|import\s+\w+|from\s+\w+|class\s+\w+|print\(/,
      java: /public\s+class|public\s+static|import\s+java|System\.out/,
      cpp: /#include|std::|namespace|class\s+\w+|cout\s*<</,
      go: /func\s+\w+|package\s+\w+|import\s*\(|fmt\.Print/,
      rust: /fn\s+\w+|use\s+\w+|struct\s+\w+|println!/
    };

    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(code)) return lang;
    }

    return 'text';
  }

  /**
   * Add syntax highlighting hints
   */
  _addSyntaxHints(content) {
    // This would add language-specific syntax hints
    // For now, just return the content as-is
    return content;
  }

  /**
   * Add section headers
   */
  _addSectionHeaders(content) {
    const lines = content.split('\n');
    const enhancedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      enhancedLines.push(line);

      // Add section headers at logical break points
      if (line.trim().length > 0 &&
          line.trim().length < 100 &&
          !line.startsWith('#') &&
          !line.startsWith('-') &&
          !line.match(/^\d+\./)) {

        // Check if next few lines form a logical section
        const nextLines = lines.slice(i + 1, i + 5);
        const hasContent = nextLines.some(l => l.trim().length > 0);

        if (hasContent && i > 0) {
          enhancedLines.splice(enhancedLines.length - 1, 0, `\n## ${line.trim()}\n`);
        }
      }
    }

    return enhancedLines.join('\n');
  }

  /**
   * Improve list formatting
   */
  _improveListFormatting(content) {
    // Standardize list markers
    let enhanced = content;

    // Convert various list formats to consistent markdown
    enhanced = enhanced.replace(/^(\s*)[•·▪▫]\s+/gm, '$1- ');
    enhanced = enhanced.replace(/^(\s*)\d+\)\s+/gm, '$1$1. ');

    return enhanced;
  }

  /**
   * Add summary
   */
  _addSummary(content) {
    const lines = content.split('\n');
    const summary = `## Summary\n\nThis response provides comprehensive information on the requested topic. Key points include:\n\n`;

    // Extract key points (simplified)
    const keyPoints = [];
    for (const line of lines) {
      if (line.startsWith('##') || line.startsWith('###') || line.match(/^\d+\./)) {
        keyPoints.push(line.replace(/^[#\d\.\s]+/, '').trim());
      }
    }

    if (keyPoints.length > 0) {
      const summaryContent = keyPoints.slice(0, 5).map(point => `- ${point}`).join('\n');
      return summary + summaryContent + '\n\n---\n\n' + content;
    }

    return content;
  }

  /**
   * Break long paragraphs
   */
  _breakLongParagraphs(content) {
    const paragraphs = content.split('\n\n');
    const enhancedParagraphs = [];

    for (const paragraph of paragraphs) {
      if (paragraph.length > 300) {
        // Break long paragraphs at sentence boundaries
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        enhancedParagraphs.push(sentences.join('\n\n'));
      } else {
        enhancedParagraphs.push(paragraph);
      }
    }

    return enhancedParagraphs.join('\n\n');
  }

  /**
   * Add visual separators
   */
  _addVisualSeparators(content) {
    // Add horizontal rules at logical break points
    let enhanced = content;

    // Add separators before major sections
    enhanced = enhanced.replace(/(\n##\s+)/g, '\n\n---\n$1');

    // Add separators between code blocks and text
    enhanced = enhanced.replace(/(```\n[\s\S]*?```\n)/g, '$1\n---\n\n');

    return enhanced;
  }

  /**
   * Improve spacing
   */
  _improveSpacing(content) {
    // Ensure consistent spacing around headers and lists
    let enhanced = content;

    // Add space before headers
    enhanced = enhanced.replace(/(\n)(#{1,6}\s+)/g, '$1\n$2');

    // Add space after headers
    enhanced = enhanced.replace(/(#{1,6}\s+.*?)(\n)/g, '$1\n$2');

    // Ensure consistent list spacing
    enhanced = enhanced.replace(/(\n- .*?)(\n- )/g, '$1\n$2');

    return enhanced;
  }

  /**
   * Check for incomplete code blocks
   */
  _hasIncompleteCode(content) {
    const codeBlocks = content.match(/```/g);
    return codeBlocks && codeBlocks.length % 2 !== 0;
  }

  /**
   * Complete code blocks
   */
  _completeCodeBlocks(content) {
    // Add missing closing code block if needed
    if (content.includes('```') && !content.endsWith('```')) {
      const lastCodeBlock = content.lastIndexOf('```');
      const afterLastBlock = content.substring(lastCodeBlock + 3);

      if (afterLastBlock.trim().length > 0) {
        return content + '\n```';
      }
    }

    return content;
  }

  /**
   * Add technical explanations
   */
  _addTechnicalExplanations(content) {
    // This would add explanations for technical terms
    // For now, just return the content as-is
    return content;
  }

  /**
   * Standardize formatting
   */
  _standardizeFormatting(content) {
    // Ensure consistent formatting throughout
    let enhanced = content;

    // Standardize line endings
    enhanced = enhanced.replace(/\r\n/g, '\n');

    // Remove excessive blank lines
    enhanced = enhanced.replace(/\n{3,}/g, '\n\n');

    // Ensure consistent indentation
    enhanced = enhanced.replace(/^(\s*)(-|\*|\d+\.)\s+/gm, (match, spaces, marker) => {
      const indentLevel = Math.floor(spaces.length / 2);
      return '  '.repeat(indentLevel) + marker + ' ';
    });

    return enhanced;
  }

  /**
   * Standardize terminology
   */
  _standardizeTerminology(content) {
    // This would standardize technical terminology
    // For now, just return the content as-is
    return content;
  }

  /**
   * Cache response for future reference
   */
  _cacheResponse(request, response) {
    const cacheKey = this._generateCacheKey(request);
    this.responseCache.set(cacheKey, {
      response,
      timestamp: new Date(),
      requestHash: this._hashRequest(request)
    });

    // Limit cache size
    if (this.responseCache.size > 100) {
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }
  }

  /**
   * Generate cache key
   */
  _generateCacheKey(request) {
    const content = this._extractContent(request);
    const model = request.model;
    return `${model}:${this._hashContent(content)}`;
  }

  /**
   * Extract content from request
   */
  _extractContent(request) {
    if (request.prompt) return request.prompt;
    if (request.messages) {
      return request.messages
        .map(msg => msg.content)
        .join('\n');
    }
    return '';
  }

  /**
   * Hash content for caching
   */
  _hashContent(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Hash request for validation
   */
  _hashRequest(request) {
    return this._hashContent(JSON.stringify(request));
  }

  /**
   * Get cached response if available
   */
  getCachedResponse(request) {
    const cacheKey = this._generateCacheKey(request);
    const cached = this.responseCache.get(cacheKey);

    if (cached && cached.requestHash === this._hashRequest(request)) {
      return cached.response;
    }

    return null;
  }

  /**
   * Clear response cache
   */
  clearCache() {
    const clearedCount = this.responseCache.size;
    this.responseCache.clear();
    this.logger.info('Response cache cleared', { clearedCount });
    return { clearedCount };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.responseCache.size,
      maxSize: 100,
      hitRate: this._calculateHitRate()
    };
  }

  /**
   * Calculate cache hit rate
   */
  _calculateHitRate() {
    // This would track actual cache hits vs misses
    // For now, return a placeholder
    return 0.0;
  }
}

module.exports = { ResponseProcessor };
