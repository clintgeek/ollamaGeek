const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * Manages workspace context and provides intelligent context analysis
 */
class ContextManager {
    constructor() {
        this.contextCache = new Map();
        this.contextHistory = [];
        this.monitoringInterval = null;
        this.config = vscode.workspace.getConfiguration('pluginGeek');
    }

    /**
     * Start monitoring workspace for changes
     */
    startMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        const interval = this.config.get('contextUpdateInterval', 5000);
        this.monitoringInterval = setInterval(() => {
            this.updateContextCache();
        }, interval);

        console.log(`🔍 Context monitoring started (${interval}ms interval)`);
    }

    /**
     * Stop monitoring workspace
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('🛑 Context monitoring stopped');
        }
    }

    /**
     * Get current workspace context
     */
    async getWorkspaceContext() {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder found');
            }

            const workspacePath = workspaceFolder.uri.fsPath;
            const contextId = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Analyze workspace structure
            const structure = await this.analyzeWorkspaceStructure(workspacePath);
            
            // Detect language and framework
            const language = this.detectLanguage(structure);
            const framework = this.detectFramework(structure, language);
            const buildTool = this.detectBuildTool(structure);

            // Get file information
            const files = await this.getFileInfo(structure.files);
            const directories = structure.directories;

            // Analyze git status
            const gitStatus = await this.analyzeGitStatus(workspacePath);

            const context = {
                contextId,
                timestamp: new Date().toISOString(),
                workspace: {
                    path: workspacePath,
                    name: path.basename(workspacePath),
                    language,
                    framework,
                    buildTool,
                    structure: {
                        type: this.classifyProjectStructure(structure),
                        quality: this.assessStructureQuality(structure),
                        files: files.length,
                        directories: directories.length
                    }
                },
                files,
                directories,
                git: gitStatus,
                analysis: {
                    complexity: this.assessWorkspaceComplexity(structure),
                    patterns: this.detectCodingPatterns(files),
                    dependencies: this.analyzeDependencies(structure)
                }
            };

            // Cache the context
            this.contextCache.set(contextId, context);
            this.contextHistory.push({
                contextId,
                timestamp: context.timestamp,
                summary: `${language} project with ${framework} framework`
            });

            // Keep only last 10 contexts
            if (this.contextHistory.length > 10) {
                this.contextHistory.shift();
            }

            return context;

        } catch (error) {
            console.error('❌ Error getting workspace context:', error);
            throw new Error(`Failed to get workspace context: ${error.message}`);
        }
    }

    /**
     * Analyze workspace structure
     */
    async analyzeWorkspaceStructure(workspacePath) {
        const structure = {
            files: [],
            directories: [],
            rootFiles: []
        };

        try {
            const items = await vscode.workspace.fs.readDirectory(vscode.Uri.file(workspacePath));
            
            for (const item of items) {
                const itemPath = path.join(workspacePath, item[0]);
                const isDirectory = item[1] === vscode.FileType.Directory;
                
                if (isDirectory) {
                    structure.directories.push(item[0]);
                    // Recursively analyze subdirectories (limited depth)
                    const subItems = await this.analyzeSubdirectory(itemPath, 2);
                    structure.files.push(...subItems.files);
                    structure.directories.push(...subItems.directories);
                } else {
                    structure.rootFiles.push(item[0]);
                    structure.files.push(item[0]);
                }
            }
        } catch (error) {
            console.error('Error analyzing workspace structure:', error);
        }

        return structure;
    }

    /**
     * Analyze subdirectory with limited depth
     */
    async analyzeSubdirectory(dirPath, depth) {
        if (depth <= 0) return { files: [], directories: [] };

        const result = { files: [], directories: [] };
        
        try {
            const items = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dirPath));
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item[0]);
                const isDirectory = item[1] === vscode.FileType.Directory;
                
                if (isDirectory) {
                    result.directories.push(path.relative(dirPath, itemPath));
                    if (depth > 1) {
                        const subResult = await this.analyzeSubdirectory(itemPath, depth - 1);
                        result.files.push(...subResult.files);
                        result.directories.push(...subResult.directories);
                    }
                } else {
                    result.files.push(path.relative(dirPath, itemPath));
                }
            }
        } catch (error) {
            console.error('Error analyzing subdirectory:', error);
        }

        return result;
    }

    /**
     * Detect programming language
     */
    detectLanguage(structure) {
        const fileExtensions = structure.files.map(file => path.extname(file).toLowerCase());
        
        if (fileExtensions.includes('.js') || fileExtensions.includes('.jsx')) return 'JavaScript';
        if (fileExtensions.includes('.ts') || fileExtensions.includes('.tsx')) return 'TypeScript';
        if (fileExtensions.includes('.py')) return 'Python';
        if (fileExtensions.includes('.java')) return 'Java';
        if (fileExtensions.includes('.cpp') || fileExtensions.includes('.c')) return 'C++';
        if (fileExtensions.includes('.go')) return 'Go';
        if (fileExtensions.includes('.rs')) return 'Rust';
        if (fileExtensions.includes('.php')) return 'PHP';
        if (fileExtensions.includes('.rb')) return 'Ruby';
        
        return 'Unknown';
    }

    /**
     * Detect framework
     */
    detectFramework(structure, language) {
        const rootFiles = structure.rootFiles.map(file => file.toLowerCase());
        const directories = structure.directories.map(dir => dir.toLowerCase());
        
        // JavaScript/TypeScript frameworks
        if (language === 'JavaScript' || language === 'TypeScript') {
            if (rootFiles.includes('package.json')) {
                if (rootFiles.includes('next.config.js') || directories.includes('pages')) return 'Next.js';
                if (rootFiles.includes('vite.config.js')) return 'Vite';
                if (rootFiles.includes('webpack.config.js')) return 'Webpack';
                if (rootFiles.includes('angular.json')) return 'Angular';
                if (rootFiles.includes('vue.config.js')) return 'Vue.js';
                return 'Node.js';
            }
        }
        
        // Python frameworks
        if (language === 'Python') {
            if (rootFiles.includes('requirements.txt')) return 'Flask/Django';
            if (rootFiles.includes('pyproject.toml')) return 'Poetry';
            if (rootFiles.includes('setup.py')) return 'Setuptools';
        }
        
        // Other frameworks
        if (rootFiles.includes('pom.xml')) return 'Maven';
        if (rootFiles.includes('build.gradle')) return 'Gradle';
        if (rootFiles.includes('cargo.toml')) return 'Cargo';
        if (rootFiles.includes('go.mod')) return 'Go Modules';
        
        return 'None';
    }

    /**
     * Detect build tool
     */
    detectBuildTool(structure) {
        const rootFiles = structure.rootFiles.map(file => file.toLowerCase());
        
        if (rootFiles.includes('package.json')) return 'npm/yarn';
        if (rootFiles.includes('requirements.txt')) return 'pip';
        if (rootFiles.includes('pom.xml')) return 'Maven';
        if (rootFiles.includes('build.gradle')) return 'Gradle';
        if (rootFiles.includes('cargo.toml')) return 'Cargo';
        if (rootFiles.includes('go.mod')) return 'Go';
        
        return 'None';
    }

    /**
     * Classify project structure
     */
    classifyProjectStructure(structure) {
        const hasSrc = structure.directories.includes('src');
        const hasComponents = structure.directories.includes('components');
        const hasTests = structure.directories.some(dir => dir.includes('test') || dir.includes('tests'));
        
        if (hasSrc && hasComponents && hasTests) return 'feature_based';
        if (hasSrc && hasComponents) return 'component_based';
        if (hasSrc) return 'src_based';
        if (hasTests) return 'test_driven';
        
        return 'flat';
    }

    /**
     * Assess structure quality
     */
    assessStructureQuality(structure) {
        const hasSrc = structure.directories.includes('src');
        const hasComponents = structure.directories.includes('components');
        const hasTests = structure.directories.some(dir => dir.includes('test') || dir.includes('tests'));
        const hasDocs = structure.directories.includes('docs') || structure.directories.includes('documentation');
        
        let score = 0;
        if (hasSrc) score += 2;
        if (hasComponents) score += 2;
        if (hasTests) score += 2;
        if (hasDocs) score += 1;
        
        if (score >= 6) return 'high';
        if (score >= 3) return 'medium';
        return 'low';
    }

    /**
     * Assess workspace complexity
     */
    assessWorkspaceComplexity(structure) {
        const fileCount = structure.files.length;
        const dirCount = structure.directories.length;
        
        if (fileCount > 100 || dirCount > 20) return 'high';
        if (fileCount > 50 || dirCount > 10) return 'medium';
        return 'low';
    }

    /**
     * Detect coding patterns
     */
    detectCodingPatterns(files) {
        const patterns = {
            hasTests: false,
            hasDocs: false,
            hasConfig: false,
            hasScripts: false
        };
        
        for (const file of files) {
            if (file.includes('test') || file.includes('spec')) patterns.hasTests = true;
            if (file.includes('readme') || file.includes('doc')) patterns.hasDocs = true;
            if (file.includes('config') || file.includes('conf')) patterns.hasConfig = true;
            if (file.includes('script') || file.includes('bin')) patterns.hasScripts = true;
        }
        
        return patterns;
    }

    /**
     * Analyze dependencies
     */
    analyzeDependencies(structure) {
        const dependencies = {
            hasPackageJson: structure.rootFiles.includes('package.json'),
            hasRequirements: structure.rootFiles.includes('requirements.txt'),
            hasPomXml: structure.rootFiles.includes('pom.xml'),
            hasCargoToml: structure.rootFiles.includes('cargo.toml'),
            hasGoMod: structure.rootFiles.includes('go.mod')
        };
        
        return dependencies;
    }

    /**
     * Get file information
     */
    async getFileInfo(filePaths) {
        const fileInfo = [];
        
        for (const filePath of filePaths) {
            try {
                const fullPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, filePath);
                const stat = await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
                
                fileInfo.push({
                    path: filePath,
                    name: path.basename(filePath),
                    extension: path.extname(filePath),
                    size: stat.size,
                    modified: new Date(stat.mtime).toISOString()
                });
            } catch (error) {
                console.error(`Error getting file info for ${filePath}:`, error);
            }
        }
        
        return fileInfo;
    }

    /**
     * Analyze git status
     */
    async analyzeGitStatus(workspacePath) {
        try {
            const gitPath = path.join(workspacePath, '.git');
            const hasGit = await vscode.workspace.fs.stat(vscode.Uri.file(gitPath)).then(() => true).catch(() => false);
            
            if (!hasGit) {
                return { hasGit: false, status: 'not_initialized' };
            }
            
            // For now, just check if git exists
            // In a real implementation, you'd run git commands to get status
            return { hasGit: true, status: 'initialized' };
            
        } catch (error) {
            return { hasGit: false, status: 'unknown' };
        }
    }

    /**
     * Update context cache
     */
    async updateContextCache() {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                // Invalidate cache to force refresh
                this.contextCache.clear();
            }
        } catch (error) {
            console.error('Error updating context cache:', error);
        }
    }

    /**
     * Get context history
     */
    getContextHistory() {
        return [...this.contextHistory];
    }

    /**
     * Clear context cache
     */
    clearCache() {
        this.contextCache.clear();
        this.contextHistory = [];
        console.log('🗑️ Context cache cleared');
    }
}

module.exports = { ContextManager };
