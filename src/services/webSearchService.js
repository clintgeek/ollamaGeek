const axios = require('axios');
const { Logger } = require('../utils/logger');

class WebSearchService {
  constructor() {
    this.logger = new Logger();
    this.searchProviders = {
      duckduckgo: {
        baseUrl: 'https://duckduckgo.com/html/',
        searchParam: 'q',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      bing: {
        baseUrl: 'https://www.bing.com/search',
        searchParam: 'q',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };

    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    this.maxResults = 5;
    this.requestTimeout = 10000; // 10 seconds
  }

  /**
   * Perform web search and return relevant results
   */
  async searchWeb(query, options = {}) {
    const {
      provider = 'duckduckgo',
      maxResults = this.maxResults,
      includeContent = true,
      useCache = true
    } = options;

    try {
      // Check cache first
      const cacheKey = `search_${provider}_${query}_${maxResults}`;
      if (useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          this.logger.info(`Using cached search results for: ${query}`);
          return cached.data;
        }
      }

      this.logger.info(`Performing web search for: ${query}`);

      let results;
      switch (provider) {
        case 'duckduckgo':
          results = await this.searchDuckDuckGo(query, maxResults, includeContent);
          break;
        case 'bing':
          results = await this.searchBing(query, maxResults, includeContent);
          break;
        default:
          throw new Error(`Unsupported search provider: ${provider}`);
      }

      // Cache the results
      if (useCache) {
        this.cache.set(cacheKey, {
          data: results,
          timestamp: Date.now()
        });
      }

      return results;
    } catch (error) {
      this.logger.error('Web search failed:', error);
      throw new Error(`Web search failed: ${error.message}`);
    }
  }

  /**
   * Search using DuckDuckGo
   */
  async searchDuckDuckGo(query, maxResults, includeContent) {
    try {
      const response = await axios.get(this.searchProviders.duckduckgo.baseUrl, {
        params: {
          [this.searchProviders.duckduckgo.searchParam]: query
        },
        headers: {
          'User-Agent': this.searchProviders.duckduckgo.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: this.requestTimeout
      });

      return this.parseDuckDuckGoResults(response.data, maxResults, includeContent);
    } catch (error) {
      this.logger.error('DuckDuckGo search failed:', error);
      throw new Error(`DuckDuckGo search failed: ${error.message}`);
    }
  }

  /**
   * Search using Bing
   */
  async searchBing(query, maxResults, includeContent) {
    try {
      const response = await axios.get(this.searchProviders.bing.baseUrl, {
        params: {
          [this.searchProviders.bing.searchParam]: query
        },
        headers: {
          'User-Agent': this.searchProviders.bing.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: this.requestTimeout
      });

      return this.parseBingResults(response.data, maxResults, includeContent);
    } catch (error) {
      this.logger.error('Bing search failed:', error);
      throw new Error(`Bing search failed: ${error.message}`);
    }
  }

  /**
   * Parse DuckDuckGo HTML results
   */
  parseDuckDuckGoResults(html, maxResults, includeContent) {
    const results = [];

    try {
      // Simple regex-based parsing for DuckDuckGo results
      const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
      let match;
      let count = 0;

      while ((match = resultRegex.exec(html)) && count < maxResults) {
        const url = match[1];
        const title = this.cleanHtml(match[2]);

        if (url && title && !url.startsWith('javascript:') && !url.startsWith('#')) {
          results.push({
            title,
            url,
            snippet: this.extractSnippet(html, match.index),
            source: 'DuckDuckGo'
          });
          count++;
        }
      }
    } catch (error) {
      this.logger.error('Failed to parse DuckDuckGo results:', error);
    }

    return results;
  }

  /**
   * Parse Bing HTML results
   */
  parseBingResults(html, maxResults, includeContent) {
    const results = [];

    try {
      // Simple regex-based parsing for Bing results
      const resultRegex = /<h2[^>]*><a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a><\/h2>/g;
      let match;
      let count = 0;

      while ((match = resultRegex.exec(html)) && count < maxResults) {
        const url = match[1];
        const title = this.cleanHtml(match[2]);

        if (url && title && !url.startsWith('javascript:') && !url.startsWith('#')) {
          results.push({
            title,
            url,
            snippet: this.extractSnippet(html, match.index),
            source: 'Bing'
          });
          count++;
        }
      }
    } catch (error) {
      this.logger.error('Failed to parse Bing results:', error);
    }

    return results;
  }

  /**
   * Extract snippet text around a result
   */
  extractSnippet(html, index, snippetLength = 200) {
    try {
      const start = Math.max(0, index - snippetLength / 2);
      const end = Math.min(html.length, index + snippetLength / 2);
      let snippet = html.substring(start, end);

      // Clean up the snippet
      snippet = this.cleanHtml(snippet);
      snippet = snippet.replace(/\s+/g, ' ').trim();

      return snippet.length > snippetLength ? snippet.substring(0, snippetLength) + '...' : snippet;
    } catch (error) {
      return '';
    }
  }

  /**
   * Clean HTML tags from text
   */
  cleanHtml(text) {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Clear the search cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.info('Web search cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp < this.cacheTimeout) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      cacheTimeout: this.cacheTimeout
    };
  }
}

module.exports = WebSearchService;
