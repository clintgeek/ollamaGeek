---
description: Repository Information Overview
alwaysApply: true
---

# OllamaGeek Information

## Summary
OllamaGeek is an intelligent API wrapper for Ollama that provides agentic orchestration capabilities while maintaining complete compatibility with the Ollama API. It acts as an intermediary that automatically selects the best model for each request, handles context management, provides tool calling capabilities, and executes multi-step planning.

## Structure
- **src/**: Core server implementation with services, routes, and middleware
- **tests/**: Test files organized by type (unit, integration, performance)
- **pluginGeek/**: VS Code extension for OllamaGeek integration
- **data/**: Database files for intent learning and memory storage
- **logs/**: Application logs organized by level
- **coverage/**: Test coverage reports

## Language & Runtime
**Language**: JavaScript (Node.js)
**Version**: Node.js 18 (based on Dockerfile)
**Package Manager**: npm
**Main Entry Point**: src/server.js

## Dependencies
**Main Dependencies**:
- express: ^4.21.2 - Web server framework
- axios: ^1.11.0 - HTTP client
- cors: ^2.8.5 - Cross-origin resource sharing
- dotenv: ^17.2.1 - Environment variable management
- helmet: ^8.1.0 - Security middleware
- morgan: ^1.10.1 - HTTP request logger

**Development Dependencies**:
- jest: ^30.1.1 - Testing framework
- nodemon: ^3.0.1 - Development server with hot reload
- supertest: ^7.1.4 - HTTP testing
- better-sqlite3: ^12.2.0 - SQLite database driver

## Build & Installation
```bash
# Install dependencies
npm install

# Configure environment
cp env.example .env

# Start development server
npm run dev

# Start production server
npm start
```

## Docker
**Dockerfile**: Dockerfile
**Image**: Node.js 18 Alpine
**Configuration**:
- Exposes port 11434
- Uses non-root user (ollamageek)
- Includes health check
- Configured with docker-compose.yml for multi-container setup with Ollama

**Docker Compose**:
```bash
# Start with Docker Compose
docker-compose up -d
```

## Testing
**Framework**: Jest
**Test Location**: tests/ directory
**Structure**:
- Unit tests: tests/unit/
- Integration tests: tests/integration/
- Performance tests: tests/performance/
- Mocks: tests/mocks/

**Configuration**: jest.config.js
**Run Commands**:
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
```

## Projects

### VSCode Extension (pluginGeek)
**Configuration File**: pluginGeek/package.json

#### Language & Runtime
**Language**: JavaScript
**Version**: VS Code Extension API v1.74.0+
**Main Entry Point**: src/extension.js

#### Dependencies
**Main Dependencies**:
- axios: ^1.6.0 - HTTP client for API communication

#### Features
- AI Chat integration in VS Code
- Feature planning capabilities
- Context analysis
- Custom sidebar with webview interface
- Configuration options for OllamaGeek server URL and context analysis