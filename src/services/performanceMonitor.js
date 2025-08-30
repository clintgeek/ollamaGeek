const { Logger } = require('../utils/logger');
const MemoryManager = require('./memoryManager');

class PerformanceMonitor {
  constructor() {
    this.logger = new Logger();
    this.memoryManager = new MemoryManager();
    this.startTimes = new Map();
    this.logger.info('📊 Performance Monitor initialized');
  }

  /**
   * Start timing a model operation
   */
  startTiming(operationId, modelName, taskType) {
    this.startTimes.set(operationId, {
      startTime: Date.now(),
      modelName,
      taskType
    });
    this.logger.debug(`⏱️ Started timing: ${operationId} (${modelName} - ${taskType})`);
  }

  /**
   * End timing and record performance
   */
  endTiming(operationId, success = true, errorMessage = null, tokensUsed = null) {
    const timing = this.startTimes.get(operationId);
    if (!timing) {
      this.logger.warn(`⚠️ No timing found for operation: ${operationId}`);
      return;
    }

    const endTime = Date.now();
    const responseTime = endTime - timing.startTime;
    
    // Record performance in memory
    this.memoryManager.trackModelPerformance(
      timing.modelName,
      timing.taskType,
      responseTime,
      success,
      errorMessage,
      tokensUsed
    );

    // Log performance
    const status = success ? '✅' : '❌';
    this.logger.info(`${status} ${timing.modelName} - ${timing.taskType}: ${responseTime}ms`);
    
    // Clean up
    this.startTimes.delete(operationId);
    
    return {
      modelName: timing.modelName,
      taskType: timing.taskType,
      responseTime,
      success
    };
  }

  /**
   * Get performance recommendations for model selection
   */
  getModelRecommendations(taskType, complexity = 'medium') {
    try {
      // Get performance data for all models on this task type
      const models = [
        'granite3.3:8b',
        'qwen2.5-coder:7b-instruct-q6_K',
        'qwen2.5-coder:14b-instruct-q4_K_M',
        'llama3.1:8b-instruct-q4_K_M',
        'llava:7b'
      ];

      const recommendations = [];
      
      for (const model of models) {
        const performance = this.memoryManager.getModelPerformance(model, taskType);
        if (performance) {
          recommendations.push({
            model: model,
            avgResponseTime: performance.avg_response_time,
            successRate: performance.success_rate,
            totalRequests: performance.total_requests,
            score: this.calculateModelScore(performance, complexity)
          });
        }
      }

      // Sort by score (higher is better)
      recommendations.sort((a, b) => b.score - a.score);
      
      this.logger.info(`📊 Model recommendations for ${taskType}: ${recommendations.length} models analyzed`);
      return recommendations;
    } catch (error) {
      this.logger.error('❌ Failed to get model recommendations:', error);
      return [];
    }
  }

  /**
   * Calculate model score based on performance and complexity
   */
  calculateModelScore(performance, complexity) {
    let score = 0;
    
    // Response time score (faster is better)
    if (performance.avg_response_time) {
      if (performance.avg_response_time < 5000) score += 30;        // <5s: excellent
      else if (performance.avg_response_time < 15000) score += 20;  // <15s: good
      else if (performance.avg_response_time < 30000) score += 10;  // <30s: acceptable
      else score += 0;                                             // >30s: poor
    }
    
    // Success rate score
    if (performance.success_rate) {
      score += performance.success_rate * 40; // 0-40 points based on success rate
    }
    
    // Request volume bonus (more data = more reliable)
    if (performance.total_requests > 10) score += 10;
    else if (performance.total_requests > 5) score += 5;
    
    // Complexity adjustment
    if (complexity === 'high' && performance.avg_response_time < 30000) {
      score += 10; // Bonus for handling complex tasks quickly
    }
    
    return Math.round(score);
  }

  /**
   * Get performance summary for dashboard
   */
  getPerformanceSummary() {
    try {
      // Get recent performance data
      const recentModels = this.memoryManager.db.prepare(`
        SELECT 
          model_name,
          task_type,
          COUNT(*) as request_count,
          AVG(response_time_ms) as avg_response_time,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
        FROM model_performance
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY model_name, task_type
        ORDER BY request_count DESC
      `).all();

      // Get top performing models
      const topModels = this.memoryManager.db.prepare(`
        SELECT 
          model_name,
          AVG(response_time_ms) as avg_response_time,
          COUNT(*) as total_requests,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
        FROM model_performance
        GROUP BY model_name
        HAVING total_requests >= 3
        ORDER BY success_rate DESC, avg_response_time ASC
        LIMIT 5
      `).all();

      // Get recent errors
      const recentErrors = this.memoryManager.db.prepare(`
        SELECT 
          model_name,
          task_type,
          error_message,
          created_at
        FROM model_performance
        WHERE success = 0
        ORDER BY created_at DESC
        LIMIT 10
      `).all();

      return {
        recentModels,
        topModels,
        recentErrors,
        summary: {
          totalModels: new Set(recentModels.map(m => m.model_name)).size,
          totalRequests: recentModels.reduce((sum, m) => sum + m.request_count, 0),
          avgSuccessRate: recentModels.reduce((sum, m) => sum + m.success_rate, 0) / recentModels.length || 0
        }
      };
    } catch (error) {
      this.logger.error('❌ Failed to get performance summary:', error);
      return null;
    }
  }

  /**
   * Record project completion for pattern learning
   */
  recordProjectCompletion(userId, projectType, complexity, toolCount, totalResponseTime, success, commonTools) {
    try {
      const avgResponseTime = totalResponseTime / toolCount;
      const successRate = success ? 1.0 : 0.0;
      
      this.memoryManager.storeProjectPattern(
        userId,
        projectType,
        complexity,
        toolCount,
        avgResponseTime,
        successRate,
        commonTools
      );
      
      this.logger.info(`📊 Project pattern recorded: ${projectType} - ${complexity} (${toolCount} tools, ${avgResponseTime}ms avg)`);
    } catch (error) {
      this.logger.error('❌ Failed to record project completion:', error);
    }
  }

  /**
   * Get project recommendations based on patterns
   */
  getProjectRecommendations(userId, projectType, complexity) {
    try {
      const patterns = this.memoryManager.getProjectPatterns(userId, projectType);
      
      // Filter by complexity and find best matches
      const relevantPatterns = patterns
        .filter(p => p.complexity === complexity)
        .sort((a, b) => b.success_rate - a.success_rate);
      
      if (relevantPatterns.length > 0) {
        const bestPattern = relevantPatterns[0];
        this.logger.info(`💡 Project recommendation: ${bestPattern.tool_count} tools, ${bestPattern.avg_response_time_ms}ms avg, ${(bestPattern.success_rate * 100).toFixed(1)}% success`);
        return bestPattern;
      }
      
      return null;
    } catch (error) {
      this.logger.error('❌ Failed to get project recommendations:', error);
      return null;
    }
  }

  /**
   * Clean up old performance data
   */
  cleanupOldData(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const stmt = this.memoryManager.db.prepare(`
        DELETE FROM model_performance 
        WHERE created_at < datetime(?, 'unixepoch')
      `);
      
      const result = stmt.run(Math.floor(cutoffDate.getTime() / 1000));
      this.logger.info(`🧹 Cleaned up ${result.changes} old performance records`);
      
      return result.changes;
    } catch (error) {
      this.logger.error('❌ Failed to cleanup old data:', error);
      return 0;
    }
  }

  /**
   * Close resources
   */
  close() {
    if (this.memoryManager) {
      this.memoryManager.close();
    }
  }
}

module.exports = PerformanceMonitor;
