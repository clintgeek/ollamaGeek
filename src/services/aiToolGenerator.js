const { Logger } = require('../utils/logger');
const axios = require('axios');

class AIToolGenerator {
  constructor() {
    this.logger = new Logger();
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  /**
   * Generate tools for a specific intent
   */
  async generateToolsForIntent(prompt, intentResult, context) {
    try {
      this.logger.info(`🧠 Generating tools for intent: ${intentResult.intent}`);

      switch (intentResult.intent) {
        case 'app_creation':
          return await this.generateAppCreationTools(prompt, intentResult, context);
        case 'file_ops':
          return await this.generateFileOperationTools(prompt, intentResult, context);
        case 'code_analysis':
          return await this.generateCodeAnalysisTools(prompt, intentResult, context);
        case 'system_ops':
          return await this.generateSystemOperationTools(prompt, intentResult, context);
        case 'complex_multi_step':
          return await this.generateComplexWorkflowTools(prompt, intentResult, context);
        default:
          return await this.generateGeneralTools(prompt, intentResult, context);
      }
    } catch (error) {
      this.logger.error('Tool generation for intent failed:', error);
      throw error;
    }
  }

  /**
   * Generate app creation tools
   */
  async generateAppCreationTools(prompt, intentResult, context) {
    try {
      this.logger.info('🧠 Starting AI-native tool generation for:', prompt);

      // Extract target directory from prompt
      const targetDir = await this.extractTargetPathFromPrompt(prompt);
      const fullTargetDir = `/Users/ccrocker/projects/${targetDir}`;

      // Use AI to plan and generate tools
      const toolPlan = await this.planToolsWithAI(prompt, fullTargetDir, context);
      const tools = await this.generateToolContentWithAI(toolPlan, fullTargetDir, context);

      this.logger.info(`✅ Generated ${tools.length} complete tools`);
      return tools;

    } catch (error) {
      this.logger.error('AI-native tool generation failed:', error);

      // Simple fallback tools
      const fallbackTools = [
        {
          name: 'create_directory',
          description: 'Create the project directory',
          parameters: { path: 'mathGeek' },
          context: 'Fallback tool generation'
        },
        {
          name: 'create_file',
          description: 'Create a basic file',
          parameters: {
            name: 'app.js',
            content: 'console.log("Hello World");',
            targetDirectory: 'mathGeek'
          },
          context: 'Fallback tool generation'
        }
      ];

      this.logger.info('✅ Fallback tools generated');
      return fallbackTools;
    }
  }

  /**
   * Generate file operation tools
   */
  async generateFileOperationTools(prompt, intentResult, context) {
    try {
      this.logger.info('🧠 Generating file operation tools with AI...');

      // Extract target directory from prompt
      const targetDir = await this.extractTargetPathFromPrompt(prompt);
      const fullTargetDir = `/Users/ccrocker/projects/${targetDir}`;

      // Use our main AI-native tool generation approach
      const toolPlan = await this.planToolsWithAI(prompt, fullTargetDir, context);
      const tools = await this.generateToolContentWithAI(toolPlan, fullTargetDir, context);

      this.logger.info(`✅ Generated ${tools.length} file operation tools`);
      return tools;

    } catch (error) {
      this.logger.error('File operation tool generation failed:', error);
      // Fallback to simple tools
      return [
        {
          name: 'create_directory',
          description: 'Create the target directory',
          parameters: { path: 'greetings' },
          context: 'File operation fallback'
        },
        {
          name: 'create_file',
          description: 'Create the target file',
          parameters: {
            name: 'hello.txt',
            content: 'Hello World',
            targetDirectory: 'greetings'
          },
          context: 'File operation fallback'
        }
      ];
    }
  }

  /**
   * Generate code analysis tools
   */
  async generateCodeAnalysisTools(prompt, intentResult, context) {
    return [
      {
        name: 'run_terminal',
        description: 'Analyze code structure and dependencies',
        parameters: {
          command: 'find . -name "*.js" -o -name "*.ts" -o -name "*.py" | head -10',
          cwd: '.'
        },
        context: 'Code analysis preparation'
      }
    ];
  }

  /**
   * Generate system operation tools
   */
  async generateSystemOperationTools(prompt, intentResult, context) {
    return [
      {
        name: 'run_terminal',
        description: 'Check system status and dependencies',
        parameters: {
          command: 'node --version && npm --version',
          cwd: '.'
        },
        context: 'System status check'
      }
    ];
  }

  /**
   * Generate complex workflow tools
   */
  async generateComplexWorkflowTools(prompt, intentResult, context) {
    try {
      this.logger.info('🧠 Generating complex workflow tools with AI...');

      const workflowPrompt = `Generate tools for complex workflow: "${prompt}"

      Generate 4-8 tools for this complex task. Each tool needs:
      - toolName: create_directory, create_file, or run_terminal
      - description: what it does
      - priority: 1, 2, 3...
      - dependencies: []
      - estimatedTime: "10 minutes"
      - context: {"projectType": "complex", "projectName": "workflow", "targetDir": "."}

      Respond with JSON array of tools.`;

      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: 'qwen2.5-coder:7b-instruct-q6_K',
        prompt: workflowPrompt,
        stream: false,
        options: { temperature: 0.1, top_p: 0.9 }
      }, { timeout: 30000 });

      const content = response.data.response;
      const jsonMatch = content.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Failed to parse complex workflow tools');

    } catch (error) {
      this.logger.error('Complex workflow tool generation failed:', error);
      return this.generateFallbackComplexTools(prompt);
    }
  }

  /**
   * Generate general tools
   */
  async generateGeneralTools(prompt, intentResult, context) {
    return [
      {
        name: 'run_terminal',
        description: 'Execute general command',
        parameters: {
          command: 'echo "General tool execution"',
          cwd: '.'
        },
        context: 'General tool fallback'
      }
    ];
  }

  /**
   * AI-powered tool planning - determines what tools are needed
   */
  async planToolsWithAI(prompt, targetDir, context) {
    try {
      const planningPrompt = `Generate tools for: "${prompt}"

Target Directory: ${targetDir}

CRITICAL RULES:
- If the request mentions "app", "express", "server", "npm", "package.json" → Generate EXACTLY 6 tools
- If the request is just file/directory creation → Generate 1-3 tools

FOR APP CREATION (6 tools required):
1. create_directory - Create project folder
2. create_file - Create package.json with Express dependency
3. create_file - Create server file (app.js or server.js)
4. create_file - Create HTML frontend
5. run_terminal - Install dependencies with npm install
6. run_terminal - Start app with npm start

FOR SIMPLE FILE OPERATIONS (1-3 tools):
- create_directory - if directory creation needed
- create_file - if file creation needed
- run_terminal - if commands needed

Each tool needs:
- toolName: create_directory, create_file, or run_terminal
- description: what it does
- priority: 1, 2, 3...
- dependencies: []
- estimatedTime: "5 minutes"
- context: {"projectType": "nodejs", "projectName": "${targetDir.split('/').pop()}", "targetDir": "${targetDir}"}

Follow the rules above strictly.`;

      this.logger.info('🧠 Planning tools with AI...');

      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: 'granite3.3:8b',
        prompt: planningPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      }, { timeout: 30000 });

      const content = response.data.response;
      this.logger.info(`🧠 AI planning response: ${content.length} characters`);

      // Try to extract JSON with better error handling
      let toolPlan = null;

      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          toolPlan = JSON.parse(jsonMatch[0]);
          this.logger.info(`✅ JSON parsed successfully`);
        }
      } catch (parseError) {
        this.logger.warn(`⚠️ JSON parse failed: ${parseError.message}`);

        // Try to clean the content and parse again
        try {
          let cleanedContent = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
          const cleanedMatch = cleanedContent.match(/\[[\s\S]*\]/);
          if (cleanedMatch) {
            toolPlan = JSON.parse(cleanedMatch[0]);
            this.logger.info(`✅ JSON parsed successfully after cleaning`);
          }
        } catch (cleanError) {
          this.logger.warn(`⚠️ Cleaned JSON parse also failed: ${cleanError.message}`);
        }
      }

      if (!toolPlan) {
        throw new Error('Failed to parse AI-generated tool plan');
      }

      // Validate tool plan variety - be more flexible
      const toolTypes = toolPlan.map(t => t.toolName);

      // Check if this is a simple file operation (1-3 tools) or app creation (6 tools)
      const isSimpleFileOp = toolPlan.length <= 3 && toolTypes.includes('create_directory') && toolTypes.includes('create_file');
      const isAppCreation = toolPlan.length === 6 && toolTypes.filter(t => t === 'create_file').length === 3;

      if (isSimpleFileOp || isAppCreation) {
        this.logger.info(`✅ AI tool planning completed: ${toolPlan.length} tools planned (${isSimpleFileOp ? 'simple file op' : 'app creation'})`);
        return toolPlan;
      } else {
        this.logger.warn(`⚠️ Tool plan validation failed. Got ${toolPlan.length} tools: ${toolTypes.join(', ')}`);
        // Still return the plan even if validation fails - let the tool generation handle it
        return toolPlan;
      }

    } catch (error) {
      this.logger.error('AI tool planning failed:', error);
      this.logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        targetDir: targetDir,
        prompt: prompt
      });
      throw error;
    }
  }

  /**
   * AI-powered tool content generation - creates the actual tool objects
   */
  async generateToolContentWithAI(toolPlan, targetDir, context) {
    try {
      this.logger.info('🧠 Generating tool content with AI...');

      const tools = [];
      const seenTools = new Set();

      for (const plan of toolPlan) {
        this.logger.info(`🧠 Generating tool for plan: ${JSON.stringify(plan)}`);
        const tool = await this.generateSingleToolWithAI(plan, targetDir, context);

        if (tool) {
          // Check for duplicates based on tool name and key parameters
          const toolKey = this.generateToolKey(tool);
          this.logger.info(`🔍 Generated tool: ${tool.name}, Key: ${toolKey}`);

          if (seenTools.has(toolKey)) {
            this.logger.warn(`⚠️ Skipping duplicate tool: ${tool.name} (Key: ${toolKey})`);
            continue;
          }

          seenTools.add(toolKey);
          this.logger.info(`✅ Successfully generated tool: ${tool.name}`);
          tools.push(tool);
        } else {
          this.logger.warn(`❌ Failed to generate tool for plan: ${plan.toolName}`);
        }
      }

      this.logger.info(`✅ Generated ${tools.length} complete tools`);

      // Validate tools before returning
      const validation = this.validateToolsBeforeExecution(tools, targetDir);
      if (!validation.valid) {
        this.logger.warn(`⚠️ Tool validation failed: ${validation.errors.join(', ')}`);
        // Continue with tools even if validation fails, but log warnings
      } else {
        this.logger.info(`✅ Tool validation passed: ${validation.toolCount} tools ready for execution`);
      }

      return tools;

    } catch (error) {
      this.logger.error('AI tool content generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate a single tool with AI
   */
  async generateSingleToolWithAI(plan, targetDir, context) {
    try {
      const toolPrompt = `Generate a ${plan.toolName} tool INSTANCE for a Node.js project.

Project Context: ${JSON.stringify(plan.context)}

CRITICAL: The tool name MUST be exactly "${plan.toolName}"

${plan.toolName === 'create_directory' ? `Set path to "${plan.context.targetDir}"` : ''}
${plan.toolName === 'create_file' ? `Set name to "filename", content to "simple file content", targetDirectory to "${plan.context.targetDir}"` : ''}
${plan.toolName === 'run_terminal' ? `Set command to "npm command", cwd to "${plan.context.targetDir}"` : ''}

IMPORTANT:
- Generate the ACTUAL tool with real values, not a tool definition/schema
- For run_terminal tools, use npm commands (npm install, npm start)
- For create_file tools, use SIMPLE content without quotes, newlines, or special characters
- Keep file content minimal to avoid JSON parsing issues
- The "name" field MUST be exactly "${plan.toolName}" - do not change it

Respond with valid JSON:
{
  "name": "${plan.toolName}",
  "description": "${plan.description}",
  "parameters": { actual values here },
  "context": "${plan.context.projectName}"
}`;

      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: 'qwen2.5-coder:14b-instruct-q4_K_M',
        prompt: toolPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      }, { timeout: 45000 }); // Heavy model for tool generation

      const content = response.data.response;
      this.logger.info(`🧠 AI response received: ${content.length} characters`);

      // Extract JSON from the response with multiple strategies
      let tool = null;

      // Strategy 1: Find the first complete JSON object by counting braces
      const firstBrace = content.indexOf('{');
      if (firstBrace !== -1) {
        let braceCount = 0;
        let endPos = firstBrace;

        for (let i = firstBrace; i < content.length; i++) {
          if (content[i] === '{') braceCount++;
          if (content[i] === '}') braceCount--;
          if (braceCount === 0) {
            endPos = i;
            break;
          }
        }

        if (braceCount === 0) {
          try {
            tool = JSON.parse(content.substring(firstBrace, endPos + 1));
            this.logger.info(`✅ JSON parsed successfully with brace counting`);
          } catch (parseError) {
            this.logger.warn(`⚠️ Brace counting parse failed: ${parseError.message}`);
          }
        }
      }

      // Strategy 2: Try regex extraction
      if (!tool) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            tool = JSON.parse(jsonMatch[0]);
            this.logger.info(`✅ JSON parsed successfully with regex`);
          } catch (parseError) {
            this.logger.warn(`⚠️ Regex parse failed: ${parseError.message}`);
          }
        }
      }

      // Strategy 3: Try to fix common AI JSON issues
      if (!tool) {
        try {
          let cleanedContent = this.fixAIJSON(content);
          const fixedMatch = cleanedContent.match(/\{[\s\S]*\}/);
          if (fixedMatch) {
            tool = JSON.parse(fixedMatch[0]);
            this.logger.info(`✅ JSON parsed successfully after fixing`);
          }
        } catch (parseError) {
          this.logger.warn(`⚠️ Fixed JSON parse failed: ${parseError.message}`);
        }
      }

      if (!tool) {
        this.logger.error(`All JSON extraction strategies failed for ${plan.toolName}`);
        return null;
      }

      // Validate and fix the tool
      const validatedTool = this.validateTool(tool);
      if (!validatedTool) {
        const fixedTool = this.fixToolValidation(tool, targetDir);
        if (fixedTool) {
          this.logger.info(`🔧 Tool fixed successfully: ${fixedTool.name}`);
          return fixedTool;
        } else {
          this.logger.error(`❌ Tool could not be fixed, skipping`);
          return null;
        }
      }

      return tool;

    } catch (error) {
      this.logger.error(`Failed to generate tool for plan ${plan.toolName}:`, error.message);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  /**
   * Validate that tool plan has the required variety of tools
   */
  validateToolPlanVariety(actualTypes, expectedTypes) {
    if (actualTypes.length !== expectedTypes.length) return false;

    // Sort both arrays to compare
    const sortedActual = [...actualTypes].sort();
    const sortedExpected = [...expectedTypes].sort();

    return sortedActual.every((type, index) => type === sortedExpected[index]);
  }

  /**
   * Generate a unique key for a tool to detect duplicates
   */
  generateToolKey(tool) {
    switch (tool.name) {
      case 'create_directory':
        return `dir_${tool.parameters.path}`;
      case 'create_file':
        // Make create_file keys more unique by including description
        const fileName = tool.parameters.name || tool.parameters.filename || 'unknown';
        const targetDir = tool.parameters.targetDirectory || 'root';
        const description = tool.description || 'no_desc';
        return `file_${fileName}_${targetDir}_${description.substring(0, 20)}`;
      case 'run_terminal':
        // Make run_terminal keys more unique by including description
        const command = tool.parameters.command || 'unknown';
        const cwd = tool.parameters.cwd || 'root';
        const termDesc = tool.description || 'no_desc';
        return `term_${command}_${cwd}_${termDesc.substring(0, 20)}`;
      default:
        return `unknown_${tool.name}`;
    }
  }

  /**
   * Fix common AI JSON generation issues
   */
  fixAIJSON(jsonStr) {
    try {
      // Replace backticks with regular quotes in content fields
      jsonStr = jsonStr.replace(/`([^`]*)`/g, '"$1"');

      // Fix escaped quotes in content
      jsonStr = jsonStr.replace(/\\"/g, '"');

      // Fix newlines in content
      jsonStr = jsonStr.replace(/\\n/g, '\\n');

      // Fix tabs in content
      jsonStr = jsonStr.replace(/\\t/g, '\\t');

      // Fix control characters
      jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, '');

      // Fix common AI mistakes: ensure tool name matches plan
      if (jsonStr.includes('"name"') && !jsonStr.includes('"name":"create_file"')) {
        // If this should be a create_file tool, fix the name
        jsonStr = jsonStr.replace(/"name"\s*:\s*"[^"]*"/, '"name":"create_file"');
      }

      return jsonStr;
    } catch (error) {
      this.logger.error('JSON fixing failed:', error);
      return jsonStr;
    }
  }

  /**
   * Fix common tool validation issues
   */
  fixToolValidation(tool, targetDir) {
    try {
      const fixedTool = { ...tool };

      // Fix missing targetDirectory for create_file tools
      if (tool.name === 'create_file' && !tool.parameters.targetDirectory) {
        fixedTool.parameters.targetDirectory = targetDir;
        this.logger.info(`🔧 Fixed missing targetDirectory for ${tool.name}`);
      }

      // Fix missing cwd for run_terminal tools
      if (tool.name === 'run_terminal' && !tool.parameters.cwd) {
        fixedTool.parameters.cwd = targetDir;
        this.logger.info(`🔧 Fixed missing cwd for ${tool.name}`);
      }

      // Fix missing path for create_directory tools
      if (tool.name === 'create_directory' && !tool.parameters.path) {
        fixedTool.parameters.path = targetDir;
        this.logger.info(`🔧 Fixed missing path for ${tool.name}`);
      }

      // Fix parameter name differences for create_file
      if (tool.name === 'create_file') {
        if (tool.parameters.filename && !tool.parameters.name) {
          fixedTool.parameters.name = tool.parameters.filename;
          this.logger.info(`🔧 Fixed filename -> name for ${tool.name}`);
        }
        if (tool.parameters.name && !tool.parameters.filename) {
          fixedTool.parameters.filename = tool.parameters.name;
          this.logger.info(`🔧 Fixed name -> filename for ${tool.name}`);
        }
      }

      return fixedTool;
    } catch (error) {
      this.logger.error('Tool fixing failed:', error);
      return null;
    }
  }

  /**
   * Validate tool structure
   */
  validateTool(tool) {
    const requiredFields = ['name', 'description', 'parameters', 'context'];
    const validToolNames = ['create_directory', 'create_file', 'run_terminal'];

    // Check required fields
    for (const field of requiredFields) {
      if (!tool[field]) {
        this.logger.warn(`⚠️ Missing required field: ${field}`);
        return false;
      }
    }

    // Check tool name
    if (!validToolNames.includes(tool.name)) {
      this.logger.warn(`⚠️ Invalid tool name: ${tool.name}`);
      return false;
    }

    // Check parameters based on tool type
    switch (tool.name) {
      case 'create_directory':
        return tool.parameters && tool.parameters.path;
      case 'create_file':
        // Accept both 'name' and 'filename' for backward compatibility
        return tool.parameters &&
               (tool.parameters.name || tool.parameters.filename) &&
               tool.parameters.content &&
               tool.parameters.targetDirectory;
      case 'run_terminal':
        return tool.parameters && tool.parameters.command;
      default:
        return false;
    }
  }

  /**
   * Validate tools before execution
   */
  validateToolsBeforeExecution(tools, targetDir) {
    const errors = [];

    // Check JSON structure
    if (!Array.isArray(tools) || tools.length === 0) {
      errors.push('Tools array is empty or invalid');
      return { valid: false, errors, toolCount: 0 };
    }

    // Validate each tool
    for (let index = 0; index < tools.length; index++) {
      const tool = tools[index];
      if (!this.validateTool(tool)) {
        errors.push(`Tool ${index + 1} (${tool.name}) has invalid structure`);
      }

      // Check commands match project type
      if (tool.name === 'run_terminal') {
        if (!tool.parameters.command.includes('npm') && !tool.parameters.command.includes('node')) {
          errors.push(`Tool ${index + 1} command should use npm or node`);
        }
      }

      // Check paths are valid
      if (tool.parameters.path && !tool.parameters.path.includes(targetDir)) {
        errors.push(`Tool ${index + 1} path should include target directory`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      toolCount: tools.length
    };
  }

  /**
   * Extract target path from prompt using AI
   */
  async extractTargetPathFromPrompt(prompt) {
    try {
      const extractionPrompt = `Extract the target directory/folder name from this prompt:

Prompt: "${prompt}"

Look for:
- "in a [folder] folder"
- "in [folder] directory"
- "create [folder]"
- "build [folder]"

Respond with ONLY the folder name, nothing else.
If no folder is specified, respond with "app".`;

      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: 'granite3.3:8b',
        prompt: extractionPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      }, { timeout: 15000 });

      const folderName = response.data.response.trim().replace(/^["']|["']$/g, '');

      // Validate folder name
      if (folderName && folderName !== 'app' && /^[a-zA-Z0-9_-]+$/.test(folderName)) {
        this.logger.info(`🎯 Extracted target directory: ${folderName}`);
        return folderName;
      }

      this.logger.info('🎯 Using default directory: app');
      return 'app';

    } catch (error) {
      this.logger.error('AI path extraction failed:', error);
      return 'app';
    }
  }

  /**
   * Generate fallback complex tools
   */
  generateFallbackComplexTools(prompt) {
    return [
      {
        name: 'create_directory',
        description: 'Create project structure',
        parameters: { path: 'project' },
        context: 'Complex workflow fallback'
      },
      {
        name: 'run_terminal',
        description: 'Initialize project',
        parameters: { command: 'echo "Project initialized"', cwd: 'project' },
        context: 'Complex workflow fallback'
      }
    ];
  }
}

module.exports = AIToolGenerator;
