/**
 * Context Types and Interfaces for OllamaGeek + PluginGeek Integration
 * This defines the shared data structures for context-aware AI planning
 */

// Workspace-level context
const WorkspaceContext = {
  structure: {
    root: String,
    files: Array,
    directories: Array,
    dependencies: Object
  },
  language: String, // "javascript", "python", "rust", etc.
  framework: String, // "react", "express", "django", etc.
  buildTool: String, // "npm", "yarn", "pip", "cargo", etc.
  gitStatus: {
    branch: String,
    uncommitted: Array,
    recentCommits: Array,
    remote: String
  }
};

// Feature-level context
const FeatureContext = {
  currentFeature: String, // "user authentication", "payment processing", etc.
  relatedFiles: Array, // Array of file paths
  featureProgress: String, // "planning", "implementing", "testing", etc.
  dependencies: Array, // Other features this depends on
  blockers: Array // What's blocking progress
};

// GeekRules for coding standards and preferences
const GeekRules = {
  codingStyle: {
    components: String, // "functional components with hooks"
    naming: String, // "camelCase for variables, PascalCase for components"
    structure: String // "feature-based folder structure"
  },
  architecture: {
    pattern: String, // "MVC", "component-based", "microservices"
    folderStructure: String, // "src/features/featureName/"
    stateManagement: String // "Redux", "Context API", "Zustand"
  },
  testing: {
    framework: String, // "Jest", "Vitest", "pytest"
    organization: String, // "tests alongside source", "separate test folder"
    coverage: String // "aim for 80%+ coverage"
  },
  documentation: {
    code: String, // "JSDoc for functions", "TypeScript interfaces"
    features: String, // "README for each feature", "API documentation"
    architecture: String // "ARCHITECTURE.md", "DECISIONS.md"
  }
};

// File-level context
const FileContext = {
  path: String,
  content: String, // File contents when relevant
  metadata: {
    size: Number,
    lastModified: Date,
    language: String,
    dependencies: Array
  },
  style: {
    indentation: String, // "2 spaces", "4 spaces", "tabs"
    naming: String, // "camelCase", "snake_case", etc.
    patterns: Array // ["functional components", "hooks", "async/await"]
  },
  relationships: {
    imports: Array, // Files this imports
    exports: Array, // What this exports
    dependencies: Array // External dependencies
  }
};

// Context request from OllamaGeek to PluginGeek
const ContextRequest = {
  type: String, // "feature_analysis", "file_creation", "refactoring"
  scope: Array, // File patterns to include
  include: Array, // What to include: ["file_contents", "dependencies", "style_patterns"]
  exclude: Array, // What to exclude: ["node_modules", "build", "tests"]
  priority: String, // "high", "medium", "low"
  context: String // Additional context about what we're trying to accomplish
};

// Context response from PluginGeek to OllamaGeek
const ContextResponse = {
  workspace: WorkspaceContext,
  feature: FeatureContext,
  rules: GeekRules,
  files: Array, // Array of FileContext objects
  summary: String, // AI-generated summary of relevant context
  timestamp: Date,
  contextId: String // Unique identifier for this context snapshot
};

// Planning context that gets sent to the AI
const PlanningContext = {
  userRequest: String,
  workspace: WorkspaceContext,
  feature: FeatureContext,
  rules: GeekRules,
  relevantFiles: Array, // Filtered file contexts
  contextSummary: String,
  previousPlans: Array, // Recent planning decisions
  constraints: Array // Any constraints or requirements
};

module.exports = {
  WorkspaceContext,
  FeatureContext,
  GeekRules,
  FileContext,
  ContextRequest,
  ContextResponse,
  PlanningContext
};
