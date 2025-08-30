const { Logger } = require('../utils/logger');
const PerformanceMonitor = require('./performanceMonitor');

class PerformanceDashboard {
  constructor() {
    this.logger = new Logger();
    this.performanceMonitor = new PerformanceMonitor();
    this.logger.info('📊 Performance Dashboard initialized');
  }

  /**
   * Get comprehensive performance overview
   */
  async getPerformanceOverview() {
    try {
      const summary = this.performanceMonitor.getPerformanceSummary();
      const modelRecommendations = await this.getModelRecommendations();
      const optimizationOpportunities = await this.identifyOptimizationOpportunities();

      return {
        summary: summary,
        modelRecommendations: modelRecommendations,
        optimizationOpportunities: optimizationOpportunities,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('❌ Failed to get performance overview:', error);
      throw error;
    }
  }

  /**
   * Get model recommendations for different task types
   */
  async getModelRecommendations() {
    try {
      const taskTypes = ['intent_analysis', 'approach_analysis', 'tool_planning', 'tool_generation'];
      const recommendations = {};

      for (const taskType of taskTypes) {
        const recs = this.performanceMonitor.getModelRecommendations(taskType, 'medium');
        recommendations[taskType] = recs.slice(0, 3);
      }

      return recommendations;
    } catch (error) {
      this.logger.error('❌ Failed to get model recommendations:', error);
      return {};
    }
  }

  /**
   * Identify optimization opportunities
   */
  async identifyOptimizationOpportunities() {
    try {
      const opportunities = [];

      // Check for slow models
      const slowModels = await this.findSlowModels();
      if (slowModels.length > 0) {
        opportunities.push({
          type: 'slow_models',
          priority: 'high',
          description: `${slowModels.length} models are performing slowly`,
          recommendation: 'Consider switching to faster models for these tasks'
        });
      }

      // Check for low success rates
      const lowSuccessModels = await this.findLowSuccessModels();
      if (lowSuccessModels.length > 0) {
        opportunities.push({
          type: 'low_success_rate',
          priority: 'medium',
          description: `${lowSuccessModels.length} models have low success rates`,
          recommendation: 'Investigate why these models are failing'
        });
      }

      return opportunities;
    } catch (error) {
      this.logger.error('❌ Failed to identify optimization opportunities:', error);
      return [];
    }
  }

  /**
   * Find models that are performing slowly
   */
  async findSlowModels() {
    try {
      const stmt = this.performanceMonitor.memoryManager.db.prepare(`
        SELECT model_name, task_type, AVG(response_time_ms) as avg_response_time, COUNT(*) as request_count
        FROM model_performance
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY model_name, task_type
        HAVING avg_response_time > 30000 AND request_count >= 3
        ORDER BY avg_response_time DESC
      `);

      return stmt.all();
    } catch (error) {
      this.logger.error('❌ Failed to find slow models:', error);
      return [];
    }
  }

  /**
   * Find models with low success rates
   */
  async findLowSuccessModels() {
    try {
      const stmt = this.performanceMonitor.memoryManager.db.prepare(`
        SELECT model_name, task_type, COUNT(*) as total_requests,
               SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
        FROM model_performance
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY model_name, task_type
        HAVING success_rate < 0.8 AND total_requests >= 3
        ORDER BY success_rate ASC
      `);

      return stmt.all();
    } catch (error) {
      this.logger.error('❌ Failed to find low success models:', error);
      return [];
    }
  }

  /**
   * Close resources
   */
  close() {
    if (this.performanceMonitor) {
      this.performanceMonitor.close();
    }
  }
}

module.exports = PerformanceDashboard;
