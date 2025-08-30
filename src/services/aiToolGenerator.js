const { Logger } = require('../utils/logger');
const axios = require('axios');
const PerformanceMonitor = require('./performanceMonitor');

class AIToolGenerator {
  constructor() {
    this.logger = new Logger();
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.performanceMonitor = new PerformanceMonitor();
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
      throw new Error('App creation tools must be AI-generated');
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

      // If AI generation fails, fall back to simple pattern-based tools
      if (tools.length === 0) {
        this.logger.info('🔄 AI generation returned 0 tools, using fallback pattern matching');
        return this.generateSimpleFileTools(prompt);
      }

      return tools;

    } catch (error) {
      this.logger.error('File operation tool generation failed:', error);
      this.logger.info('🔄 Falling back to simple pattern-based tools');
      return this.generateSimpleFileTools(prompt);
    }
  }

  /**
   * Generate simple file operation tools using pattern matching
   */
  generateSimpleFileTools(prompt) {
    try {
      this.logger.info('🔧 Generating simple file tools using pattern matching');

      const lowerPrompt = prompt.toLowerCase();
      const tools = [];

      // File creation patterns
      if (lowerPrompt.includes('create') && lowerPrompt.includes('file')) {
        const fileMatch = lowerPrompt.match(/create\s+(?:a\s+)?([^.\s]+\.\w+)/);
        if (fileMatch) {
          const fileName = fileMatch[1];
          tools.push({
            name: 'createFile',
            description: `Create the file ${fileName}`,
            priority: 1,
            dependencies: [],
            estimatedTime: '1 minute',
            context: {
              projectType: 'file_ops',
              projectName: 'file_creation',
              targetDir: '.'
            },
            params: {
              filePath: fileName,
              content: `// ${fileName} created by PluginGeek`,
              directory: 'app'
            }
          });
        }
      }

      // Directory creation patterns
      if (lowerPrompt.includes('create') && lowerPrompt.includes('directory')) {
        const dirMatch = lowerPrompt.match(/create\s+(?:a\s+)?([^.\s]+)/);
        if (dirMatch) {
          const dirName = dirMatch[1];
          tools.push({
            name: 'createDirectory',
            description: `Create the directory ${dirName}`,
            priority: 1,
            dependencies: [],
            estimatedTime: '1 minute',
            context: {
              projectType: 'file_ops',
              projectName: 'directory_creation',
              targetDir: '.'
            },
            params: {
              directory: dirName,
              basePath: 'app'
            }
          });
        }
      }

      this.logger.info(`✅ Generated ${tools.length} simple file tools`);
      return tools;

    } catch (error) {
      this.logger.error('Simple file tool generation failed:', error);
      return [];
    }
  }

  /**
   * Generate code analysis tools
   */
  async generateCodeAnalysisTools(prompt, intentResult, context) {
    try {
      this.logger.info('🧠 Generating code analysis tools with AI...');

      const analysisPrompt = `Generate tools for code analysis: "${prompt}"

Generate 2-4 tools for code analysis tasks. Each tool needs:
- toolName: create_directory, create_file, or run_terminal
- description: what it does
- priority: 1, 2, 3...
- dependencies: []
- estimatedTime: "5 minutes"
- context: {"projectType": "analysis", "projectName": "code_analysis", "targetDir": "."}

Common code analysis tools:
- run_terminal: Find files, run linters, check dependencies
- create_file: Generate analysis reports, create config files
- create_directory: Set up analysis workspace

Respond with JSON array of tools.`;

      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: 'qwen2.5-coder:7b-instruct-q6_K',
        prompt: analysisPrompt,
        stream: false,
        options: { temperature: 0.1, top_p: 0.9 }
      }, { timeout: 120000 });

      const content = response.data.response;
      const jsonMatch = content.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const tools = JSON.parse(jsonMatch[0]);
        this.logger.info(`✅ Generated ${tools.length} code analysis tools with AI`);
        return tools;
      }

      throw new Error('Failed to parse AI-generated code analysis tools');

    } catch (error) {
      this.logger.error('AI code analysis tool generation failed:', error);
      throw new Error('Code analysis tools must be AI-generated');
    }
  }

  /**
   * Generate system operation tools
   */
  async generateSystemOperationTools(prompt, intentResult, context) {
    try {
      this.logger.info('🧠 Generating system operation tools with AI...');

      const systemPrompt = `Generate tools for system operations: "${prompt}"

Generate 2-4 tools for system-level tasks. Each tool needs:
- toolName: create_directory, create_file, or run_terminal
- description: what it does
- priority: 1, 2, 3...
- dependencies: []
- estimatedTime: "10 minutes"
- context: {"projectType": "system", "projectName": "system_ops", "targetDir": "."}

Common system operation tools:
- run_terminal: Check versions, install packages, run system commands
- create_file: Generate config files, create scripts
- create_directory: Set up system directories

Respond with JSON array of tools.`;

      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: 'qwen2.5-coder:7b-instruct-q6_K',
        prompt: systemPrompt,
        stream: false,
        options: { temperature: 0.1, top_p: 0.9 }
      }, { timeout: 120000 });

      const content = response.data.response;
      const jsonMatch = content.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const tools = JSON.parse(jsonMatch[0]);
        this.logger.info(`✅ Generated ${tools.length} system operation tools with AI`);
        return tools;
      }

      throw new Error('Failed to parse AI-generated system operation tools');

    } catch (error) {
      this.logger.error('AI system operation tool generation failed:', error);
      throw new Error('System operation tools must be AI-generated');
    }
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
      }, { timeout: 120000 });

      const content = response.data.response;
      const jsonMatch = content.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Failed to parse complex workflow tools');

    } catch (error) {
      this.logger.error('Complex workflow tool generation failed:', error);
      throw new Error('Complex workflow tools must be AI-generated');
    }
  }

  /**
   * Generate general tools
   */
  async generateGeneralTools(prompt, intentResult, context) {
    try {
      this.logger.info('🧠 Generating general tools with AI...');

      const generalPrompt = `Generate tools for general assistance: "${prompt}"

Generate 1-3 tools for general help tasks. Each tool needs:
- toolName: create_directory, create_file, or run_terminal
- description: what it does
- priority: 1, 2, 3...
- dependencies: []
- estimatedTime: "5 minutes"
- context: {"projectType": "general", "projectName": "general_assistance", "targetDir": "."}

Common general tools:
- run_terminal: Display information, run simple commands
- create_file: Generate help files, create documentation
- create_directory: Set up help directories

Respond with JSON array of tools.`;

      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: 'qwen2.5-coder:7b-instruct-q6_K',
        prompt: generalPrompt,
        stream: false,
        options: { temperature: 0.1, top_p: 0.9 }
      }, { timeout: 120000 });

      const content = response.data.response;
      const jsonMatch = content.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const tools = JSON.parse(jsonMatch[0]);
        this.logger.info(`✅ Generated ${tools.length} general tools with AI`);
        return tools;
      }

      throw new Error('Failed to parse AI-generated general tools');

    } catch (error) {
      this.logger.error('AI general tool generation failed:', error);
      throw new Error('General tools must be AI-generated');
    }
  }

  /**
   * AI-powered tool planning - determines what tools are needed
   */
  async planToolsWithAI(prompt, targetDir, context) {
    try {
      const planningPrompt = `Generate tools for: "${prompt}"

Target Directory: ${targetDir || 'app'}

**CRITICAL: For app creation, the targetDir should be "/Users/ccrocker/projects/${targetDir}" (e.g., "/Users/ccrocker/projects/mathGeek")**

**EXAMPLE: If targetDir is "mathGeek", then use "/Users/ccrocker/projects/mathGeek"**

**DO NOT use "/Users/ccrocker/projects" alone - always include the project folder name!**

RULES:
- For "Create a [filename]" → Generate 1 tool: create_file (assume directory exists)
- For "Create a [dirname] directory" → Generate 1 tool: create_directory
- For "Create [filename] inside [dirname]" → Generate 2 tools: create_directory, then create_file
- For "Create [filename] in [dirname]" → Generate 2 tools: create_directory, then create_file
- For app creation requests → Generate 5-6 tools: create_directory, package.json, server file, HTML file, CSS file, run_terminal (npm install), run_terminal (npm start)
- For web apps with forms → Ensure HTML file is named appropriately (form.html for forms, index.html for general)
- CRITICAL: Only use these tool names: create_directory, create_file, run_terminal
- For npm commands, use run_terminal tool type, not npm_install or npm_start

Each tool MUST have this EXACT structure:
{
  "toolName": "create_directory",
  "description": "what it does",
  "priority": 1,
  "dependencies": [],
  "estimatedTime": "1 minute",
  "context": {
    "projectType": "file_ops",
    "projectName": "simple",
    "targetDir": "${targetDir || 'app'}"
  }
}

CRITICAL: Every tool MUST include the context field with targetDir.

Respond with a JSON array of tools.`;

      this.logger.info('🧠 Planning tools with AI...');

      // Start performance monitoring
      const operationId = `tool_planning_${Date.now()}`;
      this.performanceMonitor.startTiming(operationId, 'qwen2.5-coder:7b-instruct-q6_K', 'tool_planning');

      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: 'qwen2.5-coder:7b-instruct-q6_K',
        prompt: planningPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      }, { timeout: 120000 });

      // End performance monitoring
      this.performanceMonitor.endTiming(operationId, true);

      const content = response.data.response;
      this.logger.info(`🧠 AI planning response: ${content.length} characters`);
      this.logger.info(`🧠 AI planning response content: ${content.substring(0, 500)}...`);

            // Try to extract JSON with multiple strategies
      let toolPlan = null;

      // Strategy 1: Direct JSON array extraction
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          toolPlan = JSON.parse(jsonMatch[0]);
          this.logger.info(`✅ JSON parsed successfully with Strategy 1`);
        }
      } catch (parseError) {
        this.logger.warn(`⚠️ Strategy 1 failed: ${parseError.message}`);
      }

      // Strategy 1.5: Extract JSON from markdown code blocks
      if (!toolPlan) {
        try {
          const codeBlockMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
          if (codeBlockMatch) {
            toolPlan = JSON.parse(codeBlockMatch[1]);
            this.logger.info(`✅ JSON parsed successfully with Strategy 1.5 (markdown)`);
          }
        } catch (parseError) {
          this.logger.warn(`⚠️ Strategy 1.5 failed: ${parseError.message}`);
        }
      }

            // Strategy 1.6: Parse numbered list format from AI
      if (!toolPlan) {
        try {
          // AI generates numbered lists like "1. Tool: create_directory" or "1. Tool Name: create_directory"
          const toolMatches = content.match(/\d+\.\s*Tool(?:\s+Name)?:\s*([^\n]+)[\s\S]*?Context:\s*(\{[^}]*\})/g);
          if (toolMatches && toolMatches.length > 0) {
            const tools = [];
            for (const match of toolMatches) {
              try {
                const toolNameMatch = match.match(/Tool(?:\s+Name)?:\s*([^\n]+)/);
                const contextMatch = match.match(/Context:\s*(\{[^}]*\})/);
                const descriptionMatch = match.match(/Description:\s*([^\n]+)/);
                const priorityMatch = match.match(/Priority:\s*(\d+)/);
                const timeMatch = match.match(/Estimated Time:\s*"([^"]+)"/);
                const dependenciesMatch = match.match(/Dependencies:\s*(\[[^\]]*\])/);

                if (toolNameMatch) {
                  const tool = {
                    toolName: toolNameMatch[1].trim(),
                    description: descriptionMatch ? descriptionMatch[1].trim() : 'Generated by AI',
                    priority: priorityMatch ? parseInt(priorityMatch[1]) : 1,
                    dependencies: dependenciesMatch ? JSON.parse(dependenciesMatch[1]) : [],
                    estimatedTime: timeMatch ? timeMatch[1] : '5 minutes',
                    context: contextMatch ? JSON.parse(contextMatch[1]) : {}
                  };
                  tools.push(tool);
                }
              } catch (parseError) {
                this.logger.warn(`⚠️ Failed to parse tool from numbered list: ${parseError.message}`);
              }
            }
            if (tools.length > 0) {
              toolPlan = tools;
              this.logger.info(`✅ JSON parsed successfully with Strategy 1.6 (numbered list)`);
            }
          }
        } catch (parseError) {
          this.logger.warn(`⚠️ Strategy 1.6 failed: ${parseError.message}`);
                }
      }

      // Strategy 1.7: Parse bullet-point format from AI (more flexible)
      if (!toolPlan) {
        try {
          // AI sometimes generates bullet-point format like "• create_file - Creates a file"
          const toolMatches = content.match(/[•\-\*]\s*([^\s]+)\s*-\s*([^\n]+)[\s\S]*?Context:\s*(\{[^}]*\})/g);
          if (toolMatches && toolMatches.length > 0) {
            const tools = [];
            for (const match of toolMatches) {
              try {
                const toolNameMatch = match.match(/[•\-\*]\s*([^\s]+)\s*-\s*([^\n]+)/);
                const contextMatch = match.match(/Context:\s*(\{[^}]*\})/);
                const priorityMatch = match.match(/Priority:\s*(\d+)/);
                const timeMatch = match.match(/Estimated Time:\s*"([^"]+)"/);
                const dependenciesMatch = match.match(/Dependencies:\s*(\[[^\]]*\])/);

                if (toolNameMatch) {
                  const tool = {
                    toolName: toolNameMatch[1].trim(),
                    description: toolNameMatch[2].trim(),
                    priority: priorityMatch ? parseInt(priorityMatch[1]) : 1,
                    dependencies: dependenciesMatch ? JSON.parse(dependenciesMatch[1]) : [],
                    estimatedTime: timeMatch ? timeMatch[1] : '5 minutes',
                    context: contextMatch ? JSON.parse(contextMatch[1]) : {}
                  };
                  tools.push(tool);
                }
              } catch (parseError) {
                this.logger.warn(`⚠️ Failed to parse tool from bullet format: ${parseError.message}`);
              }
            }
            if (tools.length > 0) {
              toolPlan = tools;
              this.logger.info(`✅ JSON parsed successfully with Strategy 1.7 (bullet format)`);
            }
          }
        } catch (parseError) {
          this.logger.warn(`⚠️ Strategy 1.7 failed: ${parseError.message}`);
        }
      }

      // Strategy 2: Try to find the last complete JSON array
      if (!toolPlan) {
        const allMatches = content.match(/\[[\s\S]*\]/g);
        if (allMatches) {
          for (let i = allMatches.length - 1; i >= 0; i--) {
            try {
              toolPlan = JSON.parse(allMatches[i]);
              this.logger.info(`✅ JSON parsed successfully with Strategy 2`);
              break;
            } catch (parseError) {
              // Continue to next match
            }
          }
        }
      }

      // Strategy 2.5: Try to find JSON array with minimal cleaning
      if (!toolPlan) {
        try {
          // Just remove markdown code blocks, keep everything else
          let minimalClean = content
            .replace(/```(?:json)?\s*/g, '')
            .replace(/```\s*$/g, '');

          this.logger.info(`🔍 Strategy 2.5 minimal clean: ${minimalClean.substring(0, 200)}...`);

          const minimalMatch = minimalClean.match(/\[[\s\S]*\]/);
          if (minimalMatch) {
            this.logger.info(`🔍 Strategy 2.5 extracted match: ${minimalMatch[0].substring(0, 200)}...`);
            toolPlan = JSON.parse(minimalMatch[0]);
            this.logger.info(`✅ JSON parsed successfully with Strategy 2.5 (minimal cleaning)`);
          }
        } catch (parseError) {
          this.logger.warn(`⚠️ Strategy 2.5 failed: ${parseError.message}`);
        }
      }

      // Strategy 3: Try to fix common AI JSON issues
      if (!toolPlan) {
        try {
          // Remove common AI artifacts and try to reconstruct JSON
          let cleanedContent = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
          cleanedContent = cleanedContent.replace(/^[^{]*/, '').replace(/[^}]*$/, '');

          // Try to find JSON array in cleaned content
          const fixedMatch = cleanedContent.match(/\[[\s\S]*\]/);
          if (fixedMatch) {
            toolPlan = JSON.parse(fixedMatch[0]);
            this.logger.info(`✅ JSON parsed successfully with Strategy 3 (cleaned)`);
          }
        } catch (parseError) {
          this.logger.warn(`⚠️ Strategy 3 failed: ${parseError.message}`);
        }
      }

      // Strategy 3.5: More aggressive markdown cleaning
      if (!toolPlan) {
        try {
          // Remove all markdown formatting and extract pure JSON
          let aggressiveClean = content
            .replace(/```(?:json)?\s*/g, '')
            .replace(/```\s*$/g, '')
            .replace(/^[\s\S]*?\[/, '[')
            .replace(/\][\s\S]*$/, ']');

          this.logger.info(`🔍 Strategy 3.5 cleaned content: ${aggressiveClean.substring(0, 200)}...`);

          const aggressiveMatch = aggressiveClean.match(/\[[\s\S]*\]/);
          if (aggressiveMatch) {
            this.logger.info(`🔍 Strategy 3.5 extracted match: ${aggressiveMatch[0].substring(0, 200)}...`);
            toolPlan = JSON.parse(aggressiveMatch[0]);
            this.logger.info(`✅ JSON parsed successfully with Strategy 3.5 (aggressive cleaning)`);
          }
        } catch (parseError) {
          this.logger.warn(`⚠️ Strategy 3.5 failed: ${parseError.message}`);
        }
      }

      // Strategy 4: Try to extract individual tools and reconstruct array
      if (!toolPlan) {
        try {
          const toolMatches = content.match(/\{[^{}]*\}/g);
          if (toolMatches && toolMatches.length > 0) {
            const tools = [];
            for (const toolMatch of toolMatches) {
              try {
                const tool = JSON.parse(toolMatch);
                if (tool.toolName || tool.name) {
                  tools.push(tool);
                }
              } catch (parseError) {
                // Skip invalid tools
              }
            }
            if (tools.length > 0) {
              toolPlan = tools;
              this.logger.info(`✅ JSON parsed successfully with Strategy 4 (reconstructed)`);
            }
          }
        } catch (parseError) {
          this.logger.warn(`⚠️ Strategy 4 failed: ${parseError.message}`);
        }
      }

      // Strategy 5: Last resort - try to find any valid JSON structure
      if (!toolPlan) {
        try {
          // Look for any array-like structure and try to fix it
          const anyArrayMatch = content.match(/\[[\s\S]*\]/);
          if (anyArrayMatch) {
            let lastResort = anyArrayMatch[0];

            // Try to fix common JSON issues
            lastResort = lastResort
              .replace(/([a-zA-Z_][a-zA-Z0-9_]*):/g, '"$1":') // Quote unquoted keys
              .replace(/'/g, '"') // Replace single quotes with double quotes
              .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas

            toolPlan = JSON.parse(lastResort);
            this.logger.info(`✅ JSON parsed successfully with Strategy 5 (last resort)`);
          }
        } catch (parseError) {
          this.logger.warn(`⚠️ Strategy 5 failed: ${parseError.message}`);
        }
      }

      if (!toolPlan) {
        throw new Error('Failed to parse AI-generated tool plan with all strategies');
      }

      // Debug: Log what we actually parsed
      this.logger.info(`🔍 Parsed tool plan structure:`, {
        length: toolPlan.length,
        type: typeof toolPlan,
        isArray: Array.isArray(toolPlan),
        sample: toolPlan.length > 0 ? toolPlan[0] : 'empty'
      });

            // Validate tool plan variety - be more flexible
      const toolTypes = toolPlan.map(t => t.toolName || t.name || t.tool || 'unknown');

      // Filter out unnecessary run_terminal tools for simple file operations
      if (toolTypes.includes('create_file') || toolTypes.includes('create_directory')) {
        const filteredPlan = toolPlan.filter(tool => {
          const toolType = tool.toolName || tool.name || tool.tool;
          // Keep create_file and create_directory, remove run_terminal unless it's for actual commands
          if (toolType === 'run_terminal') {
            const description = tool.description || '';
            // Only keep run_terminal if it's for actual commands like npm install, not just "opens terminal"
            return description.toLowerCase().includes('install') ||
                   description.toLowerCase().includes('command') ||
                   description.toLowerCase().includes('npm') ||
                   description.toLowerCase().includes('git');
          }
          return true;
        });

        if (filteredPlan.length !== toolPlan.length) {
          this.logger.info(`🔧 Filtered out ${toolPlan.length - filteredPlan.length} unnecessary tools`);
          toolPlan = filteredPlan;
        }
      }

      // Check if this is a simple file operation (1-3 tools) or app creation (6 tools)
      const isSimpleFileOp = toolPlan.length <= 3 && (
        toolTypes.includes('create_file') ||
        toolTypes.includes('create_directory')
      );
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

${plan.toolName === 'create_directory' ? `Set path to "${plan.context?.targetDir || targetDir}"` : ''}
${plan.toolName === 'create_file' ? `Set name to the EXACT filename from the description. For HTML files, if the description mentions a form or calculator, create a form.html file. For server files, use server.js. For package.json, use {"name":"${plan.context?.projectName || 'app'}","version":"1.0.0","main":"server.js","scripts":{"start":"node server.js"},"dependencies":{"express":"^4.18.0"}}. For CSS files, create modern, responsive styling. targetDirectory to "${plan.context?.targetDir || targetDir}". CRITICAL: Use the exact filename mentioned in the description! If no filename is specified, use a descriptive name like "app.js" or "index.html"! NEVER use "unknown.txt" as a filename!` : ''}
${plan.toolName === 'run_terminal' ? `Set command to the exact command from the description (e.g., "npm init -y", "npm install express", "npm start"). IMPORTANT: For app creation, the FIRST run_terminal tool MUST be "npm install" to install dependencies, then the SECOND can be "npm start". cwd to "${plan.context?.targetDir || targetDir}"` : ''}

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

      // Smart model selection based on complexity and performance
      const modelSelection = await this.selectOptimalModelForToolGeneration(plan, context);
      const selectedModel = modelSelection.model;
      const timeout = modelSelection.timeout;

      this.logger.info(`🧠 Selected model for tool generation: ${selectedModel} (${modelSelection.reason})`);

      // Start performance monitoring
      const operationId = `tool_generation_${Date.now()}`;
      this.performanceMonitor.startTiming(operationId, selectedModel, 'tool_generation');

      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: selectedModel,
        prompt: toolPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      }, { timeout: timeout });

      // End performance monitoring
      this.performanceMonitor.endTiming(operationId, true);

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
   * Smart model selection for tool generation based on complexity and performance
   */
  async selectOptimalModelForToolGeneration(plan, context) {
    try {
      // Determine task complexity first
      const taskComplexity = this.assessTaskComplexity(plan, context);

      // Get performance recommendations from our monitor
      const recommendations = this.performanceMonitor.getModelRecommendations('tool_generation', taskComplexity);

      // Available models with their characteristics
      const availableModels = {
        'qwen2.5-coder:14b-instruct-q4_K_M': {
          capability: 'high',
          speed: 'slow',
          accuracy: 'very_high',
          bestFor: ['complex_code', 'large_files', 'sophisticated_logic'],
          timeout: 120000
        },
        'qwen2.5-coder:7b-instruct-q6_K': {
          capability: 'medium',
          speed: 'fast',
          accuracy: 'high',
          bestFor: ['simple_tools', 'basic_files', 'standard_operations'],
          timeout: 60000
        },
        'llama3.1:8b-instruct-q4_K_M': {
          capability: 'medium',
          speed: 'fast',
          accuracy: 'good',
          bestFor: ['simple_tools', 'basic_files', 'quick_prototyping'],
          timeout: 45000
        }
      };



      // Select model based on complexity and performance
      let selectedModel = 'qwen2.5-coder:7b-instruct-q6_K'; // Default to fast model
      let reason = 'default_fast_model';
      let timeout = 60000;

      if (taskComplexity === 'high') {
        // High complexity: Use the heavy model
        selectedModel = 'qwen2.5-coder:14b-instruct-q4_K_M';
        reason = 'high_complexity_requires_heavy_model';
        timeout = 120000;
      } else if (taskComplexity === 'medium' && recommendations.length > 0) {
        // Medium complexity: Use performance-based selection
        const bestModel = recommendations[0];
        if (bestModel.model in availableModels) {
          selectedModel = bestModel.model;
          reason = `performance_based_selection_${bestModel.score}_score`;
          timeout = availableModels[bestModel.model].timeout;
        }
      } else if (taskComplexity === 'low') {
        // Low complexity: Use fast model for quick generation
        selectedModel = 'llama3.1:8b-instruct-q4_K_M';
        reason = 'low_complexity_use_fast_model';
        timeout = 45000;
      }

      // Override if we have strong performance data
      if (recommendations.length > 0) {
        const topPerformer = recommendations[0];
        if (topPerformer.successRate > 0.9 && topPerformer.avgResponseTime < 15000) {
          selectedModel = topPerformer.model;
          reason = `top_performer_${topPerformer.successRate * 100}%_success_${topPerformer.avgResponseTime}ms_avg`;
          timeout = availableModels[topPerformer.model]?.timeout || 60000;
        }
      }

      return {
        model: selectedModel,
        reason: reason,
        timeout: timeout,
        complexity: taskComplexity,
        performanceScore: recommendations.find(r => r.model === selectedModel)?.score || 0
      };

    } catch (error) {
      this.logger.warn(`⚠️ Model selection failed, using default: ${error.message}`);
      return {
        model: 'qwen2.5-coder:7b-instruct-q6_K',
        reason: 'fallback_due_to_error',
        timeout: 60000,
        complexity: 'medium',
        performanceScore: 0
      };
    }
  }

  /**
   * Assess the complexity of a tool generation task
   */
  assessTaskComplexity(plan, context) {
    try {
      let complexityScore = 0;
      let complexityFactors = [];

      // Tool type complexity
      if (plan.toolName === 'create_file') {
        complexityScore += 2;
        complexityFactors.push('file_creation');
      } else if (plan.toolName === 'run_terminal') {
        complexityScore += 1;
        complexityFactors.push('terminal_command');
      } else if (plan.toolName === 'create_directory') {
        complexityScore += 0;
        complexityFactors.push('directory_creation');
      } else if (plan.toolName === 'install_dependency') {
        complexityScore += 1;
        complexityFactors.push('dependency_management');
      } else if (plan.toolName === 'configure_linter') {
        complexityScore += 2;
        complexityFactors.push('configuration_setup');
      } else if (plan.toolName === 'run_tests') {
        complexityScore += 1;
        complexityFactors.push('test_execution');
      }

      // Project type complexity
      if (plan.context?.projectType === 'nodejs') {
        complexityScore += 1;
        complexityFactors.push('nodejs_project');
      } else if (plan.context?.projectType === 'react' || plan.context?.projectType === 'nextjs') {
        complexityScore += 2;
        complexityFactors.push('react_project');
      } else if (plan.context?.projectType === 'python') {
        complexityScore += 2;
        complexityFactors.push('python_project');
      } else if (plan.context?.projectType === 'fullstack') {
        complexityScore += 3;
        complexityFactors.push('fullstack_project');
      }

      // File content complexity
      if (plan.context?.fileContent && plan.context.fileContent.length > 1000) {
        complexityScore += 2;
        complexityFactors.push('large_file_content');
      } else if (plan.context?.fileContent && plan.context.fileContent.length > 500) {
        complexityScore += 1;
        complexityFactors.push('medium_file_content');
      }

      // Dependencies complexity
      if (plan.context?.dependencies && Object.keys(plan.context.dependencies).length > 5) {
        complexityScore += 1;
        complexityFactors.push('many_dependencies');
      }

      // Project structure complexity
      if (plan.context?.projectStructure && plan.context.projectStructure.depth > 3) {
        complexityScore += 1;
        complexityFactors.push('deep_project_structure');
      }

      // Special requirements
      if (plan.context?.requiresAuth || plan.context?.requiresDatabase) {
        complexityScore += 2;
        complexityFactors.push('authentication_database');
      }

      // Determine complexity level with more granularity
      let complexityLevel;
      let speedOptimization;

      if (complexityScore >= 8) {
        complexityLevel = 'very_high';
        speedOptimization = 'use_heavy_model';
      } else if (complexityScore >= 6) {
        complexityLevel = 'high';
        speedOptimization = 'consider_performance_data';
      } else if (complexityScore >= 4) {
        complexityLevel = 'medium';
        speedOptimization = 'balanced_selection';
      } else if (complexityScore >= 2) {
        complexityLevel = 'low';
        speedOptimization = 'use_fast_model';
      } else {
        complexityLevel = 'very_low';
        speedOptimization = 'use_fastest_model';
      }

      // Log complexity assessment for monitoring
      this.logger.info(`🔍 Task complexity assessed:`, {
        score: complexityScore,
        level: complexityLevel,
        factors: complexityFactors,
        optimization: speedOptimization,
        context: {
          projectType: plan.context?.projectType,
          toolName: plan.toolName,
          hasFileContent: !!plan.context?.fileContent,
          dependenciesCount: plan.context?.dependencies ? Object.keys(plan.context.dependencies).length : 0
        }
      });

      return complexityLevel;

    } catch (error) {
      this.logger.warn(`⚠️ Complexity assessment failed: ${error.message}`);
      return 'medium'; // Default to medium complexity
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
        if (tool.parameters.fileName && !tool.parameters.name) {
          fixedTool.parameters.name = tool.parameters.fileName;
          this.logger.info(`🔧 Fixed fileName -> name for ${tool.name}`);
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

  // All fallback methods removed - system is now AI-only
}

module.exports = AIToolGenerator;
