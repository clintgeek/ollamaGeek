const path = require('path');
const fs = require('fs').promises;

/**
 * Enhanced Context Manager for OllamaGeek + PluginGeek Integration
 * Provides intelligent context analysis and management for AI planning
 */
class EnhancedContextManager {
  constructor() {
    this.contextCache = new Map();
    this.featureTracker = new Map();
    this.contextHistory = [];
    this.maxHistoryLength = 50;
  }

  /**
   * Request context from PluginGeek based on AI analysis
   */
  async requestContext(contextRequest) {
    try {
      console.log(`🧠 Requesting context: ${contextRequest.type}`);
      console.log(`📁 Scope: ${contextRequest.scope.join(', ')}`);
      console.log(`📋 Include: ${contextRequest.include.join(', ')}`);

      // This would be a call to PluginGeek's context API
      // For now, we'll simulate the response
      const contextResponse = await this._simulateContextResponse(contextRequest);

      // Cache the context for future use
      this._cacheContext(contextResponse);

      return contextResponse;
    } catch (error) {
      console.error('❌ Error requesting context:', error.message);
      throw error;
    }
  }

  /**
   * Analyze context for AI planning
   */
  async analyzeContextForPlanning(userRequest, contextResponse) {
    try {
      console.log('🧠 Analyzing context for AI planning...');

      const analysis = {
        workspace: this._analyzeWorkspace(contextResponse.workspace),
        feature: this._analyzeFeature(contextResponse.feature),
        rules: this._analyzeRules(contextResponse.rules),
        files: this._analyzeFiles(contextResponse.files),
        relationships: this._analyzeFileRelationships(contextResponse.files),
        patterns: this._detectCodingPatterns(contextResponse.files),
        recommendations: this._generateRecommendations(contextResponse)
      };

      // Create intelligent context summary
      const contextSummary = this._generateContextSummary(analysis);

      // Build planning context
      const planningContext = {
        userRequest,
        workspace: contextResponse.workspace,
        feature: contextResponse.feature,
        rules: contextResponse.rules,
        relevantFiles: contextResponse.files,
        contextSummary,
        previousPlans: this._getRecentPlans(),
        constraints: this._identifyConstraints(analysis),
        analysis
      };

      console.log(`📋 Context analysis complete: ${contextSummary.length} chars`);
      return planningContext;
    } catch (error) {
      console.error('❌ Error analyzing context:', error.message);
      throw error;
    }
  }

  /**
   * Update feature tracking
   */
  updateFeatureTracking(featureName, progress, relatedFiles = []) {
    const feature = this.featureTracker.get(featureName) || {
      name: featureName,
      progress: 'planning',
      relatedFiles: [],
      startTime: new Date(),
      updates: []
    };

    feature.progress = progress;
    feature.relatedFiles = [...new Set([...feature.relatedFiles, ...relatedFiles])];
    feature.updates.push({
      timestamp: new Date(),
      progress,
      relatedFiles
    });

    this.featureTracker.set(featureName, feature);
    console.log(`📊 Feature tracking updated: ${featureName} -> ${progress}`);
  }

  /**
   * Get context recommendations for a request
   */
  async getContextRecommendations(userRequest) {
    try {
      // Analyze the request to determine what context is needed
      const contextNeeds = this._analyzeRequestForContext(userRequest);

      // Build context request
      const contextRequest = {
        type: contextNeeds.type,
        scope: contextNeeds.scope,
        include: contextNeeds.include,
        exclude: ['node_modules', 'build', 'dist', '.git'],
        priority: contextNeeds.priority,
        context: userRequest
      };

      return contextRequest;
    } catch (error) {
      console.error('❌ Error getting context recommendations:', error.message);
      throw error;
    }
  }

  /**
   * Private methods for context analysis
   */
  _analyzeWorkspace(workspace) {
    return {
      complexity: this._assessWorkspaceComplexity(workspace),
      structure: this._analyzeProjectStructure(workspace.structure),
      dependencies: this._analyzeDependencies(workspace.dependencies),
      gitHealth: this._analyzeGitHealth(workspace.gitStatus)
    };
  }

  _analyzeFeature(feature) {
    return {
      scope: this._assessFeatureScope(feature.relatedFiles),
      progress: this._assessFeatureProgress(feature.progress),
      dependencies: this._analyzeFeatureDependencies(feature.dependencies),
      blockers: this._analyzeBlockers(feature.blockers)
    };
  }

  _analyzeFeatureDependencies(dependencies) {
    if (!dependencies || dependencies.length === 0) return 'none';
    if (dependencies.length > 5) return 'many';
    if (dependencies.length > 2) return 'moderate';
    return 'few';
  }

  _analyzeBlockers(blockers) {
    if (!blockers || blockers.length === 0) return 'none';
    if (blockers.length > 3) return 'many';
    if (blockers.length > 1) return 'moderate';
    return 'few';
  }

  _analyzeRules(rules) {
    return {
      consistency: this._assessRuleConsistency(rules),
      completeness: this._assessRuleCompleteness(rules),
      adherence: this._assessRuleAdherence(rules)
    };
  }

  _assessRuleConsistency(rules) {
    // Simple consistency check - could be enhanced
    const hasStyle = rules.codingStyle && Object.keys(rules.codingStyle).length > 0;
    const hasArchitecture = rules.architecture && Object.keys(rules.architecture).length > 0;
    const hasTesting = rules.testing && Object.keys(rules.testing).length > 0;

    if (hasStyle && hasArchitecture && hasTesting) return 'high';
    if (hasStyle || hasArchitecture || hasTesting) return 'medium';
    return 'low';
  }

  _assessRuleCompleteness(rules) {
    // Check if rules cover all major areas
    const areas = ['codingStyle', 'architecture', 'testing', 'documentation'];
    const coveredAreas = areas.filter(area => rules[area] && Object.keys(rules[area]).length > 0);

    if (coveredAreas.length === areas.length) return 'complete';
    if (coveredAreas.length >= areas.length * 0.75) return 'mostly_complete';
    if (coveredAreas.length >= areas.length * 0.5) return 'partially_complete';
    return 'minimal';
  }

  _assessRuleAdherence(rules) {
    // This would analyze actual code against rules - simplified for now
    return 'unknown'; // Would need code analysis to determine
  }

  _analyzeFiles(files) {
    return files.map(file => ({
      path: file.path,
      relevance: this._assessFileRelevance(file),
      complexity: this._assessFileComplexity(file),
      quality: this._assessFileQuality(file),
      relationships: file.relationships
    }));
  }

  _analyzeFileRelationships(files) {
    const relationships = {
      imports: new Map(),
      exports: new Map(),
      dependencies: new Map()
    };

    files.forEach(file => {
      if (file.relationships.imports) {
        file.relationships.imports.forEach(importPath => {
          if (!relationships.imports.has(importPath)) {
            relationships.imports.set(importPath, []);
          }
          relationships.imports.get(importPath).push(file.path);
        });
      }
    });

    return relationships;
  }

  _detectCodingPatterns(files) {
    const patterns = {
      components: new Set(),
      hooks: new Set(),
      patterns: new Set(),
      conventions: new Set()
    };

    files.forEach(file => {
      if (file.style.patterns) {
        file.style.patterns.forEach(pattern => {
          patterns.patterns.add(pattern);
        });
      }
    });

    return patterns;
  }

  _generateRecommendations(contextResponse) {
    const recommendations = [];

    // Analyze workspace for recommendations
    if (contextResponse.workspace.language === 'javascript' && !contextResponse.workspace.framework) {
      recommendations.push({
        type: 'framework_suggestion',
        message: 'Consider adding a framework for better structure',
        priority: 'medium'
      });
    }

    // Analyze feature progress
    if (contextResponse.feature.progress === 'planning' && contextResponse.feature.relatedFiles.length === 0) {
      recommendations.push({
        type: 'feature_setup',
        message: 'Set up initial file structure for the feature',
        priority: 'high'
      });
    }

    return recommendations;
  }

  _generateContextSummary(analysis) {
    const summary = [];

    // Workspace summary
    summary.push(`Workspace: ${analysis.workspace.complexity} complexity, ${analysis.workspace.structure.type} structure`);

    // Feature summary
    if (analysis.feature.scope) {
      summary.push(`Feature: ${analysis.feature.scope} scope, ${analysis.feature.progress} progress`);
    }

    // File summary
    const relevantFiles = analysis.files.filter(f => f.relevance > 0.7);
    if (relevantFiles.length > 0) {
      summary.push(`Files: ${relevantFiles.length} relevant files identified`);
    }

    // Pattern summary
    if (analysis.patterns.patterns.size > 0) {
      summary.push(`Patterns: ${Array.from(analysis.patterns.patterns).join(', ')}`);
    }

    return summary.join('. ');
  }

  _analyzeRequestForContext(userRequest) {
    const lowerRequest = userRequest.toLowerCase();

    if (lowerRequest.includes('create') || lowerRequest.includes('add')) {
      return {
        type: 'file_creation',
        scope: ['src/**/*', 'components/**/*'],
        include: ['file_contents', 'style_patterns', 'dependencies'],
        priority: 'high'
      };
    } else if (lowerRequest.includes('refactor') || lowerRequest.includes('modify')) {
      return {
        type: 'refactoring',
        scope: ['src/**/*'],
        include: ['file_contents', 'relationships', 'style_patterns'],
        priority: 'high'
      };
    } else if (lowerRequest.includes('test') || lowerRequest.includes('debug')) {
      return {
        type: 'testing_debugging',
        scope: ['src/**/*', 'tests/**/*'],
        include: ['file_contents', 'dependencies', 'style_patterns'],
        priority: 'medium'
      };
    } else {
      return {
        type: 'general_analysis',
        scope: ['src/**/*'],
        include: ['file_metadata', 'style_patterns'],
        priority: 'low'
      };
    }
  }

  _assessWorkspaceComplexity(workspace) {
    const fileCount = workspace.structure.files.length;
    const dirCount = workspace.structure.directories.length;

    if (fileCount > 100 || dirCount > 20) return 'high';
    if (fileCount > 50 || dirCount > 10) return 'medium';
    return 'low';
  }

  _analyzeProjectStructure(structure) {
    const hasSrc = structure.directories.some(dir => dir.includes('src'));
    const hasComponents = structure.directories.some(dir => dir.includes('components'));
    const hasTests = structure.directories.some(dir => dir.includes('test') || dir.includes('tests'));

    if (hasSrc && hasComponents && hasTests) return { type: 'feature_based', quality: 'high' };
    if (hasSrc && hasComponents) return { type: 'component_based', quality: 'medium' };
    return { type: 'flat', quality: 'low' };
  }

  _analyzeDependencies(dependencies) {
    const depCount = Object.keys(dependencies || {}).length;
    if (depCount > 20) return 'heavy';
    if (depCount > 10) return 'moderate';
    return 'light';
  }

  _analyzeGitHealth(gitStatus) {
    const uncommittedCount = gitStatus.uncommitted.length;
    if (uncommittedCount > 10) return 'needs_attention';
    if (uncommittedCount > 5) return 'moderate';
    return 'healthy';
  }

  _assessFeatureScope(relatedFiles) {
    if (relatedFiles.length > 10) return 'large';
    if (relatedFiles.length > 5) return 'medium';
    return 'small';
  }

  _assessFeatureProgress(progress) {
    const progressMap = {
      'planning': 0.2,
      'implementing': 0.5,
      'testing': 0.8,
      'complete': 1.0
    };
    return progressMap[progress] || 0.1;
  }

  _assessFileRelevance(file) {
    // Simple relevance scoring - could be enhanced with AI
    let score = 0.5;

    if (file.path.includes('src/')) score += 0.2;
    if (file.path.includes('components/')) score += 0.1;
    if (file.metadata.size < 1000) score += 0.1;

    return Math.min(score, 1.0);
  }

  _assessFileComplexity(file) {
    if (!file.content) return 'unknown';

    const lines = file.content.split('\n').length;
    const functions = (file.content.match(/function|=>/g) || []).length;

    if (lines > 100 || functions > 10) return 'high';
    if (lines > 50 || functions > 5) return 'medium';
    return 'low';
  }

  _assessFileQuality(file) {
    // Simple quality assessment - could be enhanced with linting results
    let score = 0.5;

    if (file.content && file.content.includes('//')) score += 0.1;
    if (file.content && file.content.includes('TODO')) score += 0.1;
    if (file.metadata.size > 0) score += 0.1;

    return Math.min(score, 1.0);
  }

  _cacheContext(contextResponse) {
    const contextId = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    contextResponse.contextId = contextId;

    this.contextCache.set(contextId, contextResponse);
    this.contextHistory.push({
      contextId,
      timestamp: new Date(),
      type: contextResponse.type || 'general'
    });

    // Clean up old contexts
    if (this.contextHistory.length > this.maxHistoryLength) {
      const oldContext = this.contextHistory.shift();
      this.contextCache.delete(oldContext.contextId);
    }
  }

  _getRecentPlans() {
    // Return recent planning decisions - this would be populated by the planning system
    return [];
  }

  _identifyConstraints(analysis) {
    const constraints = [];

    if (analysis.workspace.complexity === 'high') {
      constraints.push('High complexity workspace - consider breaking down tasks');
    }

    if (analysis.feature.scope === 'large') {
      constraints.push('Large feature scope - consider incremental implementation');
    }

    return constraints;
  }

  _simulateContextResponse(contextRequest) {
    // This simulates what PluginGeek would return
    // In the real implementation, this would be an API call to PluginGeek
    return {
      workspace: {
        structure: {
          root: '/workspace',
          files: ['src/App.js', 'src/components/Button.jsx'],
          directories: ['src', 'src/components', 'public'],
          dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' }
        },
        language: 'javascript',
        framework: 'react',
        buildTool: 'npm',
        gitStatus: {
          branch: 'main',
          uncommitted: ['src/App.js'],
          recentCommits: ['Initial commit'],
          remote: 'origin/main'
        }
      },
      feature: {
        currentFeature: 'user interface components',
        relatedFiles: ['src/components/Button.jsx'],
        featureProgress: 'implementing',
        dependencies: [],
        blockers: []
      },
      rules: {
        codingStyle: {
          components: 'functional components with hooks',
          naming: 'camelCase for variables, PascalCase for components',
          structure: 'feature-based folder structure'
        },
        architecture: {
          pattern: 'component-based',
          folderStructure: 'src/components/componentName/',
          stateManagement: 'React Context API'
        },
        testing: {
          framework: 'Jest + React Testing Library',
          organization: 'tests alongside source',
          coverage: 'aim for 80%+ coverage'
        },
        documentation: {
          code: 'JSDoc for functions',
          features: 'README for each feature',
          architecture: 'ARCHITECTURE.md'
        }
      },
      files: [
        {
          path: 'src/components/Button.jsx',
          content: 'import React from "react";\n\nconst Button = ({ children, onClick }) => {\n  return <button onClick={onClick}>{children}</button>;\n};\n\nexport default Button;',
          metadata: {
            size: 150,
            lastModified: new Date(),
            language: 'javascript',
            dependencies: ['react']
          },
          style: {
            indentation: '2 spaces',
            naming: 'camelCase',
            patterns: ['functional component', 'hooks', 'props destructuring']
          },
          relationships: {
            imports: ['react'],
            exports: ['Button'],
            dependencies: ['react']
          }
        }
      ],
      summary: 'React project with functional components and hooks',
      timestamp: new Date(),
      type: contextRequest.type
    };
  }
}

module.exports = { EnhancedContextManager };
