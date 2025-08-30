const Database = require('better-sqlite3');
const path = require('path');
const { Logger } = require('../utils/logger');

class MemoryManager {
  constructor() {
    this.logger = new Logger();
    this.dbPath = path.join(process.cwd(), 'data', 'sage_memories.db');

    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!require('fs').existsSync(dataDir)) {
      require('fs').mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.initializeDatabase();
    this.logger.info('🧠 Memory Manager initialized');
  }

  /**
   * Initialize database tables
   */
  initializeDatabase() {
    try {
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');

      // Create tables
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS memories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL DEFAULT 'default',
          memory_type TEXT NOT NULL,
          content TEXT NOT NULL,
          embedding_vector TEXT,
          context_tags TEXT,
          relevance_score REAL DEFAULT 1.0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
          access_count INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL DEFAULT 'default',
          session_id TEXT,
          repo_path TEXT,
          prompt TEXT NOT NULL,
          response TEXT,
          intent TEXT,
          complexity TEXT,
          tools_generated INTEGER DEFAULT 0,
          response_time_ms INTEGER,
          success BOOLEAN DEFAULT 1,
          models_used TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL DEFAULT 'default',
          category TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          confidence_score REAL DEFAULT 1.0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, category, key)
        );

        CREATE TABLE IF NOT EXISTS model_performance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          model_name TEXT NOT NULL,
          task_type TEXT NOT NULL,
          response_time_ms INTEGER,
          success BOOLEAN DEFAULT 1,
          error_message TEXT,
          tokens_used INTEGER,
          repo_path TEXT,
          project_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS project_patterns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL DEFAULT 'default',
          repo_path TEXT,
          project_type TEXT NOT NULL,
          complexity TEXT NOT NULL,
          tool_count INTEGER,
          avg_response_time_ms INTEGER,
          success_rate REAL,
          common_tools TEXT,
          workflow_steps TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS repo_info (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL,
          repo_name TEXT,
          languages TEXT,
          dependencies TEXT,
          frameworks TEXT,
          active_branch TEXT,
          file_tree TEXT,
          project_settings TEXT,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(repo_path)
        );

        CREATE TABLE IF NOT EXISTS past_errors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          error_message TEXT NOT NULL,
          error_type TEXT,
          solution TEXT NOT NULL,
          repo_path TEXT,
          project_type TEXT,
          complexity TEXT,
          success_rate REAL DEFAULT 1.0,
          times_applied INTEGER DEFAULT 1,
          last_applied DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS project_model_mappings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL,
          project_type TEXT NOT NULL,
          task_type TEXT NOT NULL,
          preferred_model TEXT NOT NULL,
          fallback_model TEXT,
          success_rate REAL DEFAULT 1.0,
          avg_response_time_ms INTEGER,
          times_used INTEGER DEFAULT 1,
          last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(repo_path, project_type, task_type)
        );

        CREATE INDEX IF NOT EXISTS idx_memories_user_type ON memories(user_id, memory_type);
        CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories(context_tags);
        CREATE INDEX IF NOT EXISTS idx_conversations_user_session ON conversations(user_id, session_id);
        CREATE INDEX IF NOT EXISTS idx_model_performance_model_task ON model_performance(model_name, task_type);
        CREATE INDEX IF NOT EXISTS idx_project_patterns_user_type ON project_patterns(user_id, project_type);
        CREATE INDEX IF NOT EXISTS idx_repo_info_path ON repo_info(repo_path);
        CREATE INDEX IF NOT EXISTS idx_past_errors_error_message ON past_errors(error_message);
        CREATE INDEX IF NOT EXISTS idx_project_model_mappings_repo_task ON project_model_mappings(repo_path, project_type, task_type);
      `);

      this.logger.info('✅ Database tables initialized');
    } catch (error) {
      this.logger.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Store a new memory
   */
  storeMemory(userId, memoryType, content, contextTags = [], relevanceScore = 1.0) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO memories (user_id, memory_type, content, context_tags, relevance_score)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = stmt.run(userId, memoryType, content, JSON.stringify(contextTags), relevanceScore);
      this.logger.info(`💾 Memory stored: ${memoryType} (ID: ${result.lastInsertRowid})`);
      return result.lastInsertRowid;
    } catch (error) {
      this.logger.error('❌ Failed to store memory:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant memories based on context
   */
  retrieveMemories(userId, context, limit = 5) {
    try {
      // Simple keyword-based retrieval for now
      // TODO: Implement semantic search with embeddings
      const keywords = context.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      const keywordPattern = keywords.map(k => `%${k}%`).join(' OR content LIKE ');

      const stmt = this.db.prepare(`
        SELECT * FROM memories
        WHERE user_id = ?
        AND (content LIKE ? OR context_tags LIKE ?)
        ORDER BY relevance_score DESC, last_accessed DESC
        LIMIT ?
      `);

      const memories = stmt.all(userId, `%${keywords[0]}%`, `%${keywords[0]}%`, limit);

      // Update access count and last accessed
      if (memories.length > 0) {
        const updateStmt = this.db.prepare(`
          UPDATE memories
          SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        memories.forEach(memory => updateStmt.run(memory.id));
      }

      this.logger.info(`🔍 Retrieved ${memories.length} relevant memories`);
      return memories;
    } catch (error) {
      this.logger.error('❌ Failed to retrieve memories:', error);
      return [];
    }
  }

  /**
   * Store conversation for learning
   */
  storeConversation(userId, sessionId, prompt, response, intent, complexity, toolsGenerated, responseTime, success = true) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO conversations (user_id, session_id, prompt, response, intent, complexity, tools_generated, response_time_ms, success)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Convert boolean to integer for SQLite
      const successInt = success ? 1 : 0;

      const result = stmt.run(userId, sessionId, prompt, response, intent, complexity, toolsGenerated, responseTime, successInt);
      this.logger.info(`💾 Conversation stored (ID: ${result.lastInsertRowid})`);
      return result.lastInsertRowid;
    } catch (error) {
      this.logger.error('❌ Failed to store conversation:', error);
      throw error;
    }
  }

  /**
   * Track model performance
   */
  trackModelPerformance(modelName, taskType, responseTime, success = true, errorMessage = null, tokensUsed = null) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO model_performance (model_name, task_type, response_time_ms, success, error_message, tokens_used)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      // Convert boolean to integer for SQLite
      const successInt = success ? 1 : 0;

      const result = stmt.run(modelName, taskType, responseTime, successInt, errorMessage, tokensUsed);
      this.logger.info(`📊 Model performance tracked: ${modelName} - ${taskType}`);
      return result.lastInsertRowid;
    } catch (error) {
      this.logger.error('❌ Failed to track model performance:', error);
      throw error;
    }
  }

  /**
   * Get model performance analytics
   */
  getModelPerformance(modelName, taskType, limit = 100) {
    try {
      const stmt = this.db.prepare(`
        SELECT
          model_name,
          task_type,
          AVG(response_time_ms) as avg_response_time,
          COUNT(*) as total_requests,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests,
          (SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as success_rate
        FROM model_performance
        WHERE model_name = ? AND task_type = ?
        GROUP BY model_name, task_type
      `);

      const result = stmt.get(modelName, taskType);
      return result || null;
    } catch (error) {
      this.logger.error('❌ Failed to get model performance:', error);
      return null;
    }
  }

  /**
   * Store user preference
   */
  storeUserPreference(userId, category, key, value, confidenceScore = 1.0) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO user_preferences (user_id, category, key, value, confidence_score, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const result = stmt.run(userId, category, key, value, confidenceScore);
      this.logger.info(`💾 User preference stored: ${category}.${key} = ${value}`);
      return result.lastInsertRowid;
    } catch (error) {
      this.logger.error('❌ Failed to store user preference:', error);
      throw error;
    }
  }

  /**
   * Get user preference
   */
  getUserPreference(userId, category, key) {
    try {
      const stmt = this.db.prepare(`
        SELECT value, confidence_score, updated_at
        FROM user_preferences
        WHERE user_id = ? AND category = ? AND key = ?
      `);

      const result = stmt.get(userId, category, key);
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to get user preference:', error);
      return null;
    }
  }

  /**
   * Store project pattern for learning
   */
  storeProjectPattern(userId, projectType, complexity, toolCount, avgResponseTime, successRate, commonTools) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO project_patterns
        (user_id, project_type, complexity, tool_count, avg_response_time_ms, success_rate, common_tools, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const result = stmt.run(userId, projectType, complexity, toolCount, avgResponseTime, successRate, JSON.stringify(commonTools));
      this.logger.info(`💾 Project pattern stored: ${projectType} - ${complexity}`);
      return result.lastInsertRowid;
    } catch (error) {
      this.logger.error('❌ Failed to store project pattern:', error);
      throw error;
    }
  }

  /**
   * Get project patterns for recommendations
   */
  getProjectPatterns(userId, projectType = null) {
    try {
      let query = `
        SELECT * FROM project_patterns
        WHERE user_id = ?
      `;
      let params = [userId];

      if (projectType) {
        query += ` AND project_type = ?`;
        params.push(projectType);
      }

      query += ` ORDER BY updated_at DESC LIMIT 10`;

      const stmt = this.db.prepare(query);
      const patterns = stmt.all(...params);

      return patterns;
    } catch (error) {
      this.logger.error('❌ Failed to get project patterns:', error);
      return [];
    }
  }

  /**
   * Store repository information and context
   */
  storeRepoInfo(repoPath, repoName, languages, dependencies, frameworks, activeBranch, fileTree, projectSettings) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO repo_info
        (repo_path, repo_name, languages, dependencies, frameworks, active_branch, file_tree, project_settings, last_modified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const result = stmt.run(
        repoPath,
        repoName,
        JSON.stringify(languages),
        JSON.stringify(dependencies),
        JSON.stringify(frameworks),
        activeBranch,
        JSON.stringify(fileTree),
        JSON.stringify(projectSettings)
      );

      this.logger.info(`💾 Repository info stored: ${repoPath} (${repoName})`);
      return result.lastInsertRowid;
    } catch (error) {
      this.logger.error('❌ Failed to store repo info:', error);
      throw error;
    }
  }

  /**
   * Get latest repository context
   */
  getRepoInfo(repoPath) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM repo_info WHERE repo_path = ? ORDER BY last_modified DESC LIMIT 1
      `);

      const result = stmt.get(repoPath);
      if (result) {
        // Parse JSON fields
        result.languages = JSON.parse(result.languages || '[]');
        result.dependencies = JSON.parse(result.dependencies || '{}');
        result.frameworks = JSON.parse(result.frameworks || '[]');
        result.file_tree = JSON.parse(result.file_tree || '{}');
        result.project_settings = JSON.parse(result.project_settings || '{}');
      }

      return result;
    } catch (error) {
      this.logger.error('❌ Failed to get repo info:', error);
      return null;
    }
  }

  /**
   * Store error and solution for future reference
   */
  storeErrorSolution(errorMessage, errorType, solution, repoPath, projectType, complexity) {
    try {
      // Check if we already have a similar error
      const existingStmt = this.db.prepare(`
        SELECT id, times_applied, success_rate FROM past_errors
        WHERE error_message LIKE ? AND repo_path = ?
      `);

      const existing = existingStmt.get(`%${errorMessage.substring(0, 50)}%`, repoPath);

      if (existing) {
        // Update existing error with new success data
        const updateStmt = this.db.prepare(`
          UPDATE past_errors
          SET times_applied = times_applied + 1,
              last_applied = CURRENT_TIMESTAMP,
              success_rate = (success_rate + 1.0) / 2.0
          WHERE id = ?
        `);
        updateStmt.run(existing.id);
        this.logger.info(`🔄 Updated existing error solution (ID: ${existing.id})`);
        return existing.id;
      } else {
        // Store new error solution
        const stmt = this.db.prepare(`
          INSERT INTO past_errors
          (error_message, error_type, solution, repo_path, project_type, complexity)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(errorMessage, errorType, solution, repoPath, projectType, complexity);
        this.logger.info(`💾 New error solution stored (ID: ${result.lastInsertRowid})`);
        return result.lastInsertRowid;
      }
    } catch (error) {
      this.logger.error('❌ Failed to store error solution:', error);
      throw error;
    }
  }

  /**
   * Find past solutions for similar errors
   */
  findPastSolutions(errorMessage, repoPath = null, limit = 3) {
    try {
      let query = `
        SELECT * FROM past_errors
        WHERE error_message LIKE ?
      `;
      let params = [`%${errorMessage.substring(0, 50)}%`];

      if (repoPath) {
        query += ` AND (repo_path = ? OR repo_path IS NULL)`;
        params.push(repoPath);
      }

      query += ` ORDER BY success_rate DESC, times_applied DESC, last_applied DESC LIMIT ?`;
      params.push(limit);

      const stmt = this.db.prepare(query);
      const solutions = stmt.all(...params);

      this.logger.info(`🔍 Found ${solutions.length} past solutions for error`);
      return solutions;
    } catch (error) {
      this.logger.error('❌ Failed to find past solutions:', error);
      return [];
    }
  }

  /**
   * Store project-specific model preferences
   */
  storeProjectModelMapping(repoPath, projectType, taskType, preferredModel, fallbackModel = null) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO project_model_mappings
        (repo_path, project_type, task_type, preferred_model, fallback_model, last_used)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const result = stmt.run(repoPath, projectType, taskType, preferredModel, fallbackModel);
      this.logger.info(`💾 Project model mapping stored: ${repoPath} - ${taskType} → ${preferredModel}`);
      return result.lastInsertRowid;
    } catch (error) {
      this.logger.error('❌ Failed to store project model mapping:', error);
      throw error;
    }
  }

  /**
   * Get optimal model for project and task
   */
  getOptimalModelForProject(repoPath, projectType, taskType) {
    try {
      // First, check project-specific preferences
      const projectStmt = this.db.prepare(`
        SELECT preferred_model, fallback_model, success_rate, avg_response_time
        FROM project_model_mappings
        WHERE repo_path = ? AND project_type = ? AND task_type = ?
      `);

      const projectMapping = projectStmt.get(repoPath, projectType, taskType);

      if (projectMapping && projectMapping.success_rate > 0.8) {
        this.logger.info(`🎯 Using project-specific model: ${projectMapping.preferred_model} (${projectMapping.success_rate * 100}% success)`);
        return {
          primary: projectMapping.preferred_model,
          fallback: projectMapping.fallback_model,
          source: 'project_mapping',
          confidence: projectMapping.success_rate
        };
      }

      // Fall back to global performance data
      const globalStmt = this.db.prepare(`
        SELECT
          model_name,
          AVG(response_time_ms) as avg_response_time,
          COUNT(*) as total_requests,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
        FROM model_performance
        WHERE task_type = ? AND (repo_path = ? OR repo_path IS NULL)
        GROUP BY model_name
        HAVING total_requests >= 3
        ORDER BY success_rate DESC, avg_response_time ASC
        LIMIT 1
      `);

      const globalBest = globalStmt.get(taskType, repoPath);

      if (globalBest) {
        this.logger.info(`🌍 Using global best model: ${globalBest.model_name} (${globalBest.success_rate * 100}% success)`);
        return {
          primary: globalBest.model_name,
          fallback: null,
          source: 'global_performance',
          confidence: globalBest.success_rate
        };
      }

      // Ultimate fallback to default models
      const defaultModels = {
        'intent_analysis': 'granite3.3:8b',
        'approach_analysis': 'qwen2.5-coder:7b-instruct-q6_K',
        'tool_planning': 'qwen2.5-coder:7b-instruct-q6_K',
        'tool_generation': 'qwen2.5-coder:7b-instruct-q6_K'
      };

      const defaultModel = defaultModels[taskType] || 'qwen2.5-coder:7b-instruct-q6_K';
      this.logger.info(`⚡ Using default model: ${defaultModel}`);

      return {
        primary: defaultModel,
        fallback: null,
        source: 'default',
        confidence: 0.5
      };

    } catch (error) {
      this.logger.error('❌ Failed to get optimal model:', error);
      return {
        primary: 'qwen2.5-coder:7b-instruct-q6_K',
        fallback: null,
        source: 'error_fallback',
        confidence: 0.3
      };
    }
  }

  /**
   * Update model performance with repository context
   */
  trackModelPerformanceWithContext(modelName, taskType, responseTime, success, errorMessage, tokensUsed, repoPath, projectType) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO model_performance
        (model_name, task_type, response_time_ms, success, error_message, tokens_used, repo_path, project_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const successInt = success ? 1 : 0;
      const result = stmt.run(modelName, taskType, responseTime, successInt, errorMessage, tokensUsed, repoPath, projectType);

      // Update project model mapping if successful
      if (success && repoPath && projectType) {
        this.updateProjectModelPerformance(repoPath, projectType, taskType, modelName, responseTime);
      }

      this.logger.info(`📊 Model performance tracked with context: ${modelName} - ${taskType} (${repoPath})`);
      return result.lastInsertRowid;
    } catch (error) {
      this.logger.error('❌ Failed to track model performance with context:', error);
      throw error;
    }
  }

  /**
   * Update project model performance metrics
   */
  updateProjectModelPerformance(repoPath, projectType, taskType, modelName, responseTime) {
    try {
      const stmt = this.db.prepare(`
        UPDATE project_model_mappings
        SET times_used = times_used + 1,
            last_used = CURRENT_TIMESTAMP,
            avg_response_time = CASE
              WHEN avg_response_time IS NULL THEN ?
              ELSE (avg_response_time + ?) / 2.0
            END
        WHERE repo_path = ? AND project_type = ? AND task_type = ?
      `);

      const result = stmt.run(responseTime, responseTime, repoPath, projectType, taskType);

      if (result.changes === 0) {
        // Create new mapping if it doesn't exist
        this.storeProjectModelMapping(repoPath, projectType, taskType, modelName);
      }

    } catch (error) {
      this.logger.error('❌ Failed to update project model performance:', error);
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.logger.info('🔒 Database connection closed');
    }
  }
}

module.exports = MemoryManager;
