const axios = require('axios');
const { Logger } = require('../utils/logger');

class OllamaClient {
  constructor() {
    this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.timeout = parseInt(process.env.REQUEST_TIMEOUT) || 30000;
    this.logger = new Logger();

    // Configure axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OllamaGeek/1.0.0'
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        if (process.env.LOG_REQUESTS === 'true') {
          this.logger.debug('Ollama request', {
            method: config.method?.toUpperCase(),
            url: config.url,
            model: config.data?.model
          });
        }
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        if (process.env.LOG_RESPONSES === 'true') {
          this.logger.debug('Ollama response', {
            status: response.status,
            url: response.config.url,
            model: response.config.data?.model
          });
        }
        return response;
      },
      (error) => {
        this.logger.error('Response interceptor error', {
          error: error.message,
          status: error.response?.status,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate text using Ollama
   */
  async generate(requestBody) {
    try {
      const response = await this.client.post('/api/generate', requestBody);
      return response.data;
    } catch (error) {
      this.logger.error('Generate request failed', {
        error: error.message,
        model: requestBody.model,
        prompt: requestBody.prompt?.substring(0, 100) + '...'
      });
      throw this._handleOllamaError(error, 'generate');
    }
  }

  /**
   * Chat completion using Ollama
   */
  async chat(requestBody) {
    try {
      const response = await this.client.post('/api/chat', requestBody);
      return response.data;
    } catch (error) {
      this.logger.error('Chat request failed', {
        error: error.message,
        model: requestBody.model,
        messageCount: requestBody.messages?.length
      });
      throw this._handleOllamaError(error, 'chat');
    }
  }

  /**
   * Generate embeddings using Ollama
   */
  async embeddings(requestBody) {
    try {
      const response = await this.client.post('/api/embeddings', requestBody);
      return response.data;
    } catch (error) {
      this.logger.error('Embeddings request failed', {
        error: error.message,
        model: requestBody.model
      });
      throw this._handleOllamaError(error, 'embeddings');
    }
  }

  /**
   * List available models
   */
  async tags() {
    try {
      const response = await this.client.get('/api/tags');
      return response.data;
    } catch (error) {
      this.logger.error('Tags request failed', { error: error.message });
      throw this._handleOllamaError(error, 'tags');
    }
  }

  /**
   * Pull a model from registry
   */
  async pull(requestBody) {
    try {
      const response = await this.client.post('/api/pull', requestBody);
      return response.data;
    } catch (error) {
      this.logger.error('Pull request failed', {
        error: error.message,
        model: requestBody.name
      });
      throw this._handleOllamaError(error, 'pull');
    }
  }

  /**
   * Push a model to registry
   */
  async push(requestBody) {
    try {
      const response = await this.client.post('/api/push', requestBody);
      return response.data;
    } catch (error) {
      this.logger.error('Push request failed', {
        error: error.message,
        model: requestBody.name
      });
      throw this._handleOllamaError(error, 'push');
    }
  }

  /**
   * Check if Ollama is running and accessible
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/api/tags', { timeout: 5000 });
      return {
        status: 'healthy',
        ollamaVersion: response.headers['ollama-version'] || 'unknown',
        modelsAvailable: response.data.models?.length || 0
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        code: error.code
      };
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName) {
    try {
      const response = await this.client.post('/api/show', { name: modelName });
      return response.data;
    } catch (error) {
      this.logger.error('Model info request failed', {
        error: error.message,
        model: modelName
      });
      throw this._handleOllamaError(error, 'show');
    }
  }

  /**
   * Copy a model
   */
  async copyModel(requestBody) {
    try {
      const response = await this.client.post('/api/copy', requestBody);
      return response.data;
    } catch (error) {
      this.logger.error('Copy model request failed', {
        error: error.message,
        source: requestBody.source,
        destination: requestBody.destination
      });
      throw this._handleOllamaError(error, 'copy');
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(requestBody) {
    try {
      const response = await this.client.delete('/api/delete', { data: requestBody });
      return response.data;
    } catch (error) {
      this.logger.error('Delete model request failed', {
        error: error.message,
        model: requestBody.name
      });
      throw this._handleOllamaError(error, 'delete');
    }
  }

  /**
   * Stream generate response
   */
  async generateStream(requestBody, onChunk) {
    try {
      const response = await this.client.post('/api/generate', requestBody, {
        responseType: 'stream',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.event.target.response) {
            const lines = progressEvent.event.target.response.split('\n');
            lines.forEach(line => {
              if (line.trim()) {
                try {
                  const chunk = JSON.parse(line);
                  onChunk(chunk);
                } catch (parseError) {
                  // Skip malformed JSON lines
                }
              }
            });
          }
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error('Generate stream request failed', {
        error: error.message,
        model: requestBody.model
      });
      throw this._handleOllamaError(error, 'generate_stream');
    }
  }

  /**
   * Stream chat response
   */
  async chatStream(requestBody, onChunk) {
    try {
      const response = await this.client.post('/api/chat', requestBody, {
        responseType: 'stream',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.event.target.response) {
            const lines = progressEvent.event.target.response.split('\n');
            lines.forEach(line => {
              if (line.trim()) {
                try {
                  const chunk = JSON.parse(line);
                  onChunk(chunk);
                } catch (parseError) {
                  // Skip malformed JSON lines
                }
              }
            });
          }
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error('Chat stream request failed', {
        error: error.message,
        model: requestBody.model
      });
      throw this._handleOllamaError(error, 'chat_stream');
    }
  }

  /**
   * Batch multiple requests for efficiency
   */
  async batchRequests(requests) {
    try {
      const promises = requests.map(request => {
        switch (request.type) {
          case 'generate':
            return this.generate(request.data);
          case 'chat':
            return this.chat(request.data);
          case 'embeddings':
            return this.embeddings(request.data);
          default:
            throw new Error(`Unknown request type: ${request.type}`);
        }
      });

      const results = await Promise.allSettled(promises);

      return results.map((result, index) => ({
        requestId: requests[index].id,
        type: requests[index].type,
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null
      }));
    } catch (error) {
      this.logger.error('Batch requests failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle Ollama-specific errors
   */
  _handleOllamaError(error, operation) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          return new Error(`Bad request for ${operation}: ${data.error || 'Invalid parameters'}`);
        case 404:
          return new Error(`Model not found for ${operation}: ${data.error || 'Model does not exist'}`);
        case 500:
          return new Error(`Ollama server error for ${operation}: ${data.error || 'Internal server error'}`);
        default:
          return new Error(`Ollama error for ${operation}: ${data.error || error.message}`);
      }
    } else if (error.request) {
      // Request was made but no response received
      if (error.code === 'ECONNREFUSED') {
        return new Error(`Cannot connect to Ollama at ${this.baseURL}. Is Ollama running?`);
      } else if (error.code === 'ETIMEDOUT') {
        return new Error(`Request to Ollama timed out after ${this.timeout}ms`);
      } else {
        return new Error(`Network error for ${operation}: ${error.message}`);
      }
    } else {
      // Something else happened
      return new Error(`Unexpected error for ${operation}: ${error.message}`);
    }
  }

  /**
   * Update base URL (useful for dynamic configuration)
   */
  updateBaseURL(newURL) {
    this.baseURL = newURL;
    this.client.defaults.baseURL = newURL;
    this.logger.info('Ollama base URL updated', { newURL });
  }

  /**
   * Update timeout (useful for dynamic configuration)
   */
  updateTimeout(newTimeout) {
    this.timeout = newTimeout;
    this.client.defaults.timeout = newTimeout;
    this.logger.info('Ollama timeout updated', { newTimeout });
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout,
      userAgent: this.client.defaults.headers['User-Agent']
    };
  }
}

module.exports = { OllamaClient };
