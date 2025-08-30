const mockOllamaClient = {
  generate: jest.fn(),
  embed: jest.fn(),
  chat: jest.fn()
};

// Mock responses based on our real-world testing
const mockResponses = {
  // Intent recognition responses
  intentRecognition: {
    'file_ops': {
      intent: 'file_ops',
      confidence: 0.95,
      complexity: 'low',
      approach: 'simple_execution',
      requiresApproval: false,
      actionType: 'execution_simple'
    },
    'app_creation': {
      intent: 'app_creation',
      confidence: 0.95,
      complexity: 'very_high',
      approach: 'complex_planning',
      requiresApproval: true,
      actionType: 'execution_complex'
    },
    'complex_multi_step': {
      intent: 'complex_multi_step',
      confidence: 0.95,
      complexity: 'very_high',
      approach: 'planning_with_execution',
      requiresApproval: true,
      actionType: 'execution_complex'
    }
  },

  // Tool planning responses (numbered list format - Strategy 1.6)
  toolPlanning: {
    'file_ops': `1. Tool: create_directory
   - Description: Creates a new directory for the project
   - Priority: 1
   - Dependencies: []
   - Estimated Time: "5 minutes"
   - Context: {"projectType": "nodejs", "projectName": "app", "targetDir": "/Users/ccrocker/projects/app"}

2. Tool: create_file
   - Description: Creates a simple text file
   - Priority: 2
   - Dependencies: ["create_directory"]
   - Estimated Time: "3 minutes"
   - Context: {"projectType": "nodejs", "projectName": "app", "targetDir": "/Users/ccrocker/projects/app"}

3. Tool: run_terminal
   - Description: Runs npm commands
   - Priority: 3
   - Dependencies: ["create_directory"]
   - Estimated Time: "2 minutes"
   - Context: {"projectType": "nodejs", "projectName": "app", "targetDir": "/Users/ccrocker/projects/app"}`,

    'app_creation': `1. Tool: create_directory
   - Description: Creates the project folder at the specified target directory
   - Priority: 1
   - Dependencies: []
   - Estimated Time: "2 minutes"
   - Context: {"projectType": "nodejs", "projectName": "app", "targetDir": "/Users/ccrocker/projects/app"}

2. Tool: create_file
   - Description: Generates a package.json file with Express dependency
   - Priority: 2
   - Dependencies: []
   - Estimated Time: "3 minutes"
   - Context: {"projectType": "nodejs", "projectName": "app", "targetDir": "/Users/ccrocker/projects/app"}

3. Tool: create_file
   - Description: Creates a server file (e.g., app.js or server.js) for handling Express routes and logic
   - Priority: 3
   - Dependencies: []
   - Estimated Time: "5 minutes"
   - Context: {"projectType": "nodejs", "projectName": "app", "targetDir": "/Users/ccrocker/projects/app"}

4. Tool: create_file
   - Description: Generates an HTML frontend file (e.g., index.html) for the React app
   - Priority: 4
   - Dependencies: []
   - Estimated Time: "5 minutes"
   - Context: {"projectType": "nodejs", "projectName": "app", "targetDir": "/Users/ccrocker/projects/app"}

5. Tool: run_terminal
   - Description: Executes the command 'npm install' to install dependencies listed in package.json
   - Priority: 5
   - Dependencies: []
   - Estimated Time: "3 minutes"
   - Context: {"projectType": "nodejs", "projectName": "app", "targetDir": "/Users/ccrocker/projects/app"}

6. Tool: run_terminal
   - Description: Starts the app using 'npm start' command, which should initiate the development server
   - Priority: 6
   - Dependencies: []
   - Estimated Time: "2 minutes"
   - Context: {"projectType": "nodejs", "projectName": "app", "targetDir": "/Users/ccrocker/projects/app"}`,

    'complex_multi_step': `1. Tool: create_directory
   - Description: Creates a new directory in the specified target directory
   - Priority: 1
   - Dependencies: []
   - Estimated Time: "5 minutes"
   - Context: {"projectType": "complex", "projectName": "workflow", "targetDir": "."}

2. Tool: create_file
   - Description: Creates a new file in the specified target directory
   - Priority: 2
   - Dependencies: ["create_directory"]
   - Estimated Time: "5 minutes"
   - Context: {"projectType": "complex", "projectName": "workflow", "targetDir": "."}

3. Tool: run_terminal
   - Description: Runs a terminal command in the specified target directory
   - Priority: 3
   - Dependencies: ["create_directory"]
   - Estimated Time: "10 minutes"
   - Context: {"projectType": "complex", "projectName": "app", "targetDir": "/Users/ccrocker/projects/app"}`,

    'complex_multi_step': `1. Tool: create_directory
   - Description: Creates a new directory in the specified target directory
   - Priority: 1
   - Dependencies: []
   - Estimated Time: "5 minutes"
   - Context: {"projectType": "complex", "projectName": "workflow", "targetDir": "."}

2. Tool: create_file
   - Description: Creates a new file in the specified target directory
   - Priority: 2
   - Dependencies: ["create_directory"]
   - Estimated Time: "5 minutes"
   - Context: {"projectType": "complex", "projectName": "app", "targetDir": "/Users/ccrocker/projects/app"}

3. Tool: run_terminal
   - Description: Runs a terminal command in the specified target directory
   - Priority: 3
   - Dependencies: ["create_directory"]
   - Estimated Time: "10 minutes"
   - Context: {"projectType": "complex", "projectName": "workflow", "targetDir": "."}`
  },

  // Tool generation responses (JSON format)
  toolGeneration: {
    'create_directory': {
      name: 'create_directory',
      description: 'Creates a new directory for the project at the specified target path',
      parameters: {
        path: '/Users/ccrocker/projects/app'
      },
      context: 'app'
    },
    'create_file': {
      name: 'create_file',
      description: 'Creates a simple text file in the specified directory',
      parameters: {
        filename: 'example.txt',
        content: 'simple file content',
        targetDirectory: '/Users/ccrocker/projects/app'
      },
      context: 'app'
    },
    'run_terminal': {
      name: 'run_terminal',
      description: 'Executes the command npm install to install necessary dependencies for the project',
      parameters: {
        command: 'npm install',
        cwd: '/Users/ccrocker/projects/app'
      },
      context: 'app'
    }
  }
};

// Configure mock responses based on the prompt
mockOllamaClient.generate.mockImplementation(async (prompt, options) => {
  const response = { response: '' };
  
  if (prompt.includes('intent recognition') || prompt.includes('comprehensive analysis')) {
    // Intent recognition
    if (prompt.includes('file') || prompt.includes('create') && prompt.includes('file')) {
      response.response = JSON.stringify(mockResponses.intentRecognition.file_ops);
    } else if (prompt.includes('app') || prompt.includes('React') || prompt.includes('Node.js')) {
      response.response = JSON.stringify(mockResponses.intentRecognition.app_creation);
    } else if (prompt.includes('complex') || prompt.includes('multi-step')) {
      response.response = JSON.stringify(mockResponses.intentRecognition.complex_multi_step);
    }
  } else if (prompt.includes('tool plan') || prompt.includes('planning')) {
    // Tool planning
    if (prompt.includes('file_ops') || prompt.includes('file operation')) {
      response.response = mockResponses.toolPlanning.file_ops;
    } else if (prompt.includes('app_creation') || prompt.includes('app creation')) {
      response.response = mockResponses.toolPlanning.app_creation;
    } else if (prompt.includes('complex_multi_step')) {
      response.response = mockResponses.toolPlanning.complex_multi_step;
    }
  } else if (prompt.includes('generate tool') || prompt.includes('tool content')) {
    // Tool generation
    if (prompt.includes('create_directory')) {
      response.response = JSON.stringify(mockResponses.toolGeneration.create_directory);
    } else if (prompt.includes('create_file')) {
      response.response = JSON.stringify(mockResponses.toolGeneration.create_file);
    } else if (prompt.includes('run_terminal')) {
      response.response = JSON.stringify(mockResponses.toolGeneration.run_terminal);
    }
  }
  
  return response;
});

mockOllamaClient.embed.mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);
mockOllamaClient.chat.mockResolvedValue({ message: { content: 'Mock chat response' } });

module.exports = {
  mockOllamaClient,
  mockResponses
};
