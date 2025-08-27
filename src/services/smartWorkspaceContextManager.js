const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

class SmartWorkspaceContextManager {
  constructor() {
    this.logger = new Logger();
    this.workspaceRoot = null;
    this.projectPatterns = new Map();
    this.conflictCache = new Map();
  }

  /**
   * Analyze the current workspace for context awareness
   */
  async analyzeWorkspaceContext(targetPath = null) {
    try {
      this.workspaceRoot = this._findWorkspaceRoot();

      const context = {
        workspace: await this._analyzeWorkspaceStructure(),
        target: targetPath ? await this._analyzeTargetLocation(targetPath) : null,
        patterns: await this._detectProjectPatterns(),
        conflicts: await this._detectPotentialConflicts(targetPath),
        recommendations: await this._generateRecommendations(targetPath)
      };

      this.logger.info('🔍 Workspace context analyzed:', context);
      return context;

    } catch (error) {
      this.logger.error('Failed to analyze workspace context:', error);
      return this._getFallbackContext();
    }
  }

  /**
   * Find the workspace root (git repo, package.json, etc.)
   */
  _findWorkspaceRoot() {
    let currentDir = process.cwd();

    // Walk up the directory tree looking for workspace indicators
    while (currentDir !== path.dirname(currentDir)) {
      if (this._isWorkspaceRoot(currentDir)) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    return process.cwd(); // Fallback to current directory
  }

  /**
   * Check if a directory is a workspace root
   */
  _isWorkspaceRoot(dir) {
    const indicators = [
      '.git',           // Git repository
      'package.json',   // Node.js project
      'requirements.txt', // Python project
      'Gemfile',        // Ruby project
      'Cargo.toml',     // Rust project
      'pom.xml',        // Maven project
      'build.gradle',   // Gradle project
      'Makefile',       // C/C++ project
      'docker-compose.yml', // Docker project
      '.vscode'         // VS Code workspace
    ];

    return indicators.some(indicator =>
      fs.existsSync(path.join(dir, indicator))
    );
  }

  /**
   * Analyze the overall workspace structure
   */
  async _analyzeWorkspaceStructure() {
    const structure = {
      root: this.workspaceRoot,
      type: this._detectWorkspaceType(),
      projects: await this._discoverProjects(),
      structure: await this._analyzeDirectoryStructure(),
      conventions: await this._detectNamingConventions()
    };

    return structure;
  }

  /**
   * Detect the type of workspace
   */
  _detectWorkspaceType() {
    if (fs.existsSync(path.join(this.workspaceRoot, '.git'))) {
      return 'git_repository';
    } else if (fs.existsSync(path.join(this.workspaceRoot, 'package.json'))) {
      return 'node_workspace';
    } else if (fs.existsSync(path.join(this.workspaceRoot, 'requirements.txt'))) {
      return 'python_workspace';
    } else if (fs.existsSync(path.join(this.workspaceRoot, 'Gemfile'))) {
      return 'ruby_workspace';
    } else {
      return 'general_workspace';
    }
  }

  /**
   * Discover existing projects in the workspace
   */
  async _discoverProjects() {
    const projects = [];
    const entries = fs.readdirSync(this.workspaceRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(this.workspaceRoot, entry.name);
        const projectType = this._detectProjectType(projectPath);

        if (projectType) {
          projects.push({
            name: entry.name,
            path: projectPath,
            type: projectType,
            config: await this._readProjectConfig(projectPath, projectType)
          });
        }
      }
    }

    return projects;
  }

  /**
   * Detect the type of a project directory
   */
  _detectProjectType(projectPath) {
    const indicators = {
      'node': ['package.json', 'node_modules'],
      'python': ['requirements.txt', 'pyproject.toml', '__pycache__'],
      'ruby': ['Gemfile', 'Gemfile.lock'],
      'rust': ['Cargo.toml', 'Cargo.lock'],
      'java': ['pom.xml', 'build.gradle', 'src/main/java'],
      'cpp': ['Makefile', 'CMakeLists.txt', 'src'],
      'go': ['go.mod', 'go.sum'],
      'php': ['composer.json', 'vendor'],
      'dotnet': ['.csproj', '.sln', 'bin', 'obj']
    };

    for (const [type, files] of Object.entries(indicators)) {
      if (files.some(file => fs.existsSync(path.join(projectPath, file)))) {
        return type;
      }
    }

    return null;
  }

  /**
   * Read project configuration files
   */
  async _readProjectConfig(projectPath, projectType) {
    try {
      switch (projectType) {
        case 'node':
          const packageJson = JSON.parse(
            fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8')
          );
          return {
            name: packageJson.name,
            version: packageJson.version,
            scripts: packageJson.scripts || {},
            dependencies: packageJson.dependencies || {}
          };

        case 'python':
          if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) {
            const requirements = fs.readFileSync(
              path.join(projectPath, 'requirements.txt'), 'utf8'
            );
            return {
              requirements: requirements.split('\n').filter(line => line.trim())
            };
          }
          break;

        case 'ruby':
          if (fs.existsSync(path.join(projectPath, 'Gemfile'))) {
            const gemfile = fs.readFileSync(
              path.join(projectPath, 'Gemfile'), 'utf8'
            );
            return {
              gems: gemfile.split('\n').filter(line => line.includes('gem'))
            };
          }
          break;
      }
    } catch (error) {
      this.logger.warn(`Failed to read config for ${projectType} project:`, error);
    }

    return {};
  }

  /**
   * Analyze the directory structure for patterns
   */
  async _analyzeDirectoryStructure() {
    const structure = {
      depth: 0,
      maxDepth: 0,
      commonPatterns: [],
      organization: 'flat' // flat, nested, modular
    };

    const analyzeDir = (dir, depth = 0) => {
      structure.maxDepth = Math.max(structure.maxDepth, depth);

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const dirs = entries.filter(entry => entry.isDirectory());

        if (dirs.length > 0) {
          structure.organization = depth === 0 && dirs.length > 3 ? 'modular' : 'nested';
        }

        // Recursively analyze subdirectories
        dirs.forEach(subDir => {
          analyzeDir(path.join(dir, subDir.name), depth + 1);
        });
      } catch (error) {
        // Skip directories we can't read
      }
    };

    analyzeDir(this.workspaceRoot);
    structure.depth = structure.maxDepth;

    return structure;
  }

  /**
   * Detect naming conventions used in the workspace
   */
  async _detectNamingConventions() {
    const conventions = {
      folders: 'kebab-case', // kebab-case, snake_case, camelCase, PascalCase
      files: 'kebab-case',
      projects: 'kebab-case'
    };

    try {
      const entries = fs.readdirSync(this.workspaceRoot, { withFileTypes: true });
      const folders = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
      const files = entries.filter(entry => entry.isFile()).map(entry => entry.name);

      conventions.folders = this._detectNamingPattern(folders);
      conventions.files = this._detectNamingPattern(files);
      conventions.projects = conventions.folders; // Projects are usually folders
    } catch (error) {
      this.logger.warn('Failed to detect naming conventions:', error);
    }

    return conventions;
  }

  /**
   * Detect naming pattern from a list of names
   */
  _detectNamingPattern(names) {
    if (names.length === 0) return 'kebab-case';

    const patterns = {
      'kebab-case': /^[a-z][a-z0-9-]*[a-z0-9]$/,
      'snake_case': /^[a-z][a-z0-9_]*[a-z0-9]$/,
      'camelCase': /^[a-z][a-zA-Z0-9]*$/,
      'PascalCase': /^[A-Z][a-zA-Z0-9]*$/
    };

    const scores = {};
    for (const [pattern, regex] of Object.entries(patterns)) {
      scores[pattern] = names.filter(name => regex.test(name)).length;
    }

    // Return the pattern with the highest score
    return Object.entries(scores).reduce((a, b) => scores[a] > scores[b] ? a : b)[0];
  }

  /**
   * Analyze the target location for the new project
   */
  async _analyzeTargetLocation(targetPath) {
    if (!targetPath) return null;

    const fullPath = path.isAbsolute(targetPath)
      ? targetPath
      : path.join(this.workspaceRoot, targetPath);

    return {
      requested: targetPath,
      absolute: fullPath,
      exists: fs.existsSync(fullPath),
      type: fs.existsSync(fullPath) ? this._getPathType(fullPath) : 'none',
      conflicts: await this._detectPathConflicts(fullPath),
      recommendations: await this._generatePathRecommendations(fullPath)
    };
  }

  /**
   * Get the type of a path (file, directory, or none)
   */
  _getPathType(path) {
    try {
      const stat = fs.statSync(path);
      return stat.isDirectory() ? 'directory' : 'file';
    } catch (error) {
      return 'none';
    }
  }

  /**
   * Detect potential conflicts at the target path
   */
  async _detectPathConflicts(targetPath) {
    const conflicts = [];

    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);

      if (stat.isDirectory()) {
        // Check if directory has important files
        try {
          const entries = fs.readdirSync(targetPath);
          const importantFiles = ['.git', 'package.json', 'requirements.txt', 'Gemfile'];

          importantFiles.forEach(file => {
            if (entries.includes(file)) {
              conflicts.push({
                type: 'important_file_exists',
                file: file,
                severity: 'high',
                message: `Directory contains important file: ${file}`
              });
            }
          });
        } catch (error) {
          // Can't read directory contents
        }
      } else {
        // It's a file
        conflicts.push({
          type: 'file_exists',
          severity: 'medium',
          message: `File already exists: ${path.basename(targetPath)}`
        });
      }
    }

    return conflicts;
  }

  /**
   * Generate recommendations for the target path
   */
  async _generatePathRecommendations(targetPath) {
    const recommendations = [];

    if (fs.existsSync(targetPath)) {
      recommendations.push({
        type: 'backup_existing',
        message: 'Consider backing up existing content before proceeding',
        action: 'backup'
      });
    }

    // Check if the path follows workspace naming conventions
    const conventions = await this._detectNamingConventions();
    const targetName = path.basename(targetPath);

    if (!this._followsConvention(targetName, conventions.folders)) {
      recommendations.push({
        type: 'naming_convention',
        message: `Consider using ${conventions.folders} naming convention`,
        suggestion: this._convertToConvention(targetName, conventions.folders)
      });
    }

    return recommendations;
  }

  /**
   * Check if a name follows a naming convention
   */
  _followsConvention(name, convention) {
    const patterns = {
      'kebab-case': /^[a-z][a-z0-9-]*[a-z0-9]$/,
      'snake_case': /^[a-z][a-z0-9_]*[a-z0-9]$/,
      'camelCase': /^[a-z][a-zA-Z0-9]*$/,
      'PascalCase': /^[A-Z][a-zA-Z0-9]*$/
    };

    return patterns[convention]?.test(name) || false;
  }

  /**
   * Convert a name to follow a naming convention
   */
  _convertToConvention(name, convention) {
    // Remove special characters and split
    const words = name.replace(/[^a-zA-Z0-9]/g, ' ').split(/\s+/).filter(word => word);

    switch (convention) {
      case 'kebab-case':
        return words.map(word => word.toLowerCase()).join('-');
      case 'snake_case':
        return words.map(word => word.toLowerCase()).join('_');
      case 'camelCase':
        return words.map((word, index) =>
          index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join('');
      case 'PascalCase':
        return words.map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join('');
      default:
        return name;
    }
  }

  /**
   * Detect project patterns for consistency
   */
  async _detectProjectPatterns() {
    const patterns = {
      structure: 'standard', // standard, monorepo, microservices
      organization: 'feature-based', // feature-based, layer-based, domain-driven
      testing: 'adjacent', // adjacent, separate, integrated
      documentation: 'inline' // inline, separate, minimal
    };

    // Analyze existing projects to detect patterns
    const projects = await this._discoverProjects();

    if (projects.length > 0) {
      // Look for common patterns across projects
      const structures = projects.map(p => this._analyzeProjectStructure(p.path));
      patterns.structure = this._detectCommonPattern(structures, 'structure');
      patterns.organization = this._detectCommonPattern(structures, 'organization');
      patterns.testing = this._detectCommonPattern(structures, 'testing');
      patterns.documentation = this._detectCommonPattern(structures, 'documentation');
    }

    return patterns;
  }

  /**
   * Analyze the structure of a specific project
   */
  _analyzeProjectStructure(projectPath) {
    const structure = {
      structure: 'standard',
      organization: 'feature-based',
      testing: 'adjacent',
      documentation: 'inline'
    };

    try {
      const entries = fs.readdirSync(projectPath, { withFileTypes: true });
      const dirs = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
      const files = entries.filter(entry => entry.isFile()).map(entry => entry.name);

      // Detect structure type
      if (dirs.includes('packages') || dirs.includes('apps')) {
        structure.structure = 'monorepo';
      } else if (dirs.includes('services') || dirs.includes('microservices')) {
        structure.structure = 'microservices';
      }

      // Detect organization pattern
      if (dirs.includes('src') && dirs.includes('components')) {
        structure.organization = 'feature-based';
      } else if (dirs.includes('controllers') && dirs.includes('models')) {
        structure.organization = 'layer-based';
      } else if (dirs.includes('domain') && dirs.includes('infrastructure')) {
        structure.organization = 'domain-driven';
      }

      // Detect testing approach
      if (dirs.includes('tests') || dirs.includes('__tests__')) {
        structure.testing = 'separate';
      } else if (files.some(f => f.includes('.test.') || f.includes('.spec.'))) {
        structure.testing = 'adjacent';
      }

      // Detect documentation approach
      if (files.includes('README.md') || files.includes('docs')) {
        structure.documentation = 'separate';
      } else if (files.some(f => f.includes('.md'))) {
        structure.documentation = 'inline';
      }
    } catch (error) {
      this.logger.warn(`Failed to analyze project structure:`, error);
    }

    return structure;
  }

  /**
   * Detect the most common pattern from a list
   */
  _detectCommonPattern(structures, key) {
    const counts = {};
    structures.forEach(s => {
      const value = s[key];
      counts[value] = (counts[value] || 0) + 1;
    });

    return Object.entries(counts).reduce((a, b) => counts[a] > counts[b] ? a : b)[0];
  }

  /**
   * Detect potential conflicts with existing projects
   */
  async _detectPotentialConflicts(targetPath) {
    const conflicts = [];

    if (targetPath) {
      const targetName = path.basename(targetPath);
      const projects = await this._discoverProjects();

      // Check for name conflicts
      const nameConflict = projects.find(p =>
        p.name.toLowerCase() === targetName.toLowerCase()
      );

      if (nameConflict) {
        conflicts.push({
          type: 'name_conflict',
          severity: 'high',
          message: `Project with name "${targetName}" already exists`,
          existing: nameConflict,
          suggestion: `${targetName}-new`
        });
      }

      // Check for dependency conflicts
      const dependencyConflicts = await this._detectDependencyConflicts(targetPath, projects);
      conflicts.push(...dependencyConflicts);
    }

    return conflicts;
  }

  /**
   * Detect potential dependency conflicts
   */
  async _detectDependencyConflicts(targetPath, existingProjects) {
    const conflicts = [];

    // This is a simplified check - in a real implementation, you'd analyze
    // actual dependency versions and compatibility
    const projectTypes = existingProjects.map(p => p.type);
    const uniqueTypes = [...new Set(projectTypes)];

    if (uniqueTypes.length > 1) {
      conflicts.push({
        type: 'mixed_ecosystem',
        severity: 'medium',
        message: 'Workspace contains mixed technology ecosystems',
        details: uniqueTypes,
        recommendation: 'Consider organizing by technology or using containerization'
      });
    }

    return conflicts;
  }

  /**
   * Generate intelligent recommendations based on context
   */
  async _generateRecommendations(targetPath) {
    const recommendations = [];

    // Get workspace context
    const workspace = await this._analyzeWorkspaceStructure();
    const patterns = await this._detectProjectPatterns();

    // Recommend following existing patterns
    if (patterns.structure !== 'standard') {
      recommendations.push({
        type: 'pattern_consistency',
        message: `Follow existing ${patterns.structure} pattern`,
        action: 'adapt_structure'
      });
    }

    // Recommend naming convention consistency
    const conventions = await this._detectNamingConventions();
    recommendations.push({
      type: 'naming_consistency',
      message: `Use ${conventions.folders} naming convention`,
      action: 'follow_convention'
    });

    // Recommend testing approach
    if (patterns.testing !== 'adjacent') {
      recommendations.push({
        type: 'testing_consistency',
        message: `Follow existing ${patterns.testing} testing approach`,
        action: 'adapt_testing'
      });
    }

    // Recommend documentation approach
    if (patterns.documentation !== 'inline') {
      recommendations.push({
        type: 'documentation_consistency',
        message: `Follow existing ${patterns.documentation} documentation approach`,
        action: 'adapt_documentation'
      });
    }

    return recommendations;
  }

  /**
   * Get fallback context when analysis fails
   */
  _getFallbackContext() {
    return {
      workspace: {
        root: process.cwd(),
        type: 'general_workspace',
        projects: [],
        structure: { depth: 0, maxDepth: 0, organization: 'flat' },
        conventions: { folders: 'kebab-case', files: 'kebab-case', projects: 'kebab-case' }
      },
      target: null,
      patterns: {
        structure: 'standard',
        organization: 'feature-based',
        testing: 'adjacent',
        documentation: 'inline'
      },
      conflicts: [],
      recommendations: []
    };
  }

  /**
   * Get a summary of the workspace context for planning
   */
  async getContextSummary(targetPath = null) {
    const context = await this.analyzeWorkspaceContext(targetPath);

    return {
      workspaceType: context.workspace.type,
      projectCount: context.workspace.projects.length,
      namingConvention: context.workspace.conventions.folders,
      structurePattern: context.patterns.structure,
      hasConflicts: context.conflicts.length > 0,
      recommendations: context.recommendations.length,
      targetExists: context.target?.exists || false,
      targetConflicts: context.target?.conflicts?.length || 0
    };
  }
}

module.exports = SmartWorkspaceContextManager;
