#!/bin/bash

# OllamaGeek API Wrapper Startup Script

echo "🚀 Starting OllamaGeek API Wrapper..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if Ollama is running
echo "🔍 Checking if Ollama is running..."
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "⚠️  Warning: Ollama doesn't appear to be running on port 11434"
    echo "   Please start Ollama first: ollama serve"
    echo "   Or update the OLLAMA_BASE_URL in your .env file"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted."
        exit 1
    fi
else
    echo "✅ Ollama is running on port 11434"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please review and update the configuration."
    echo ""
    read -p "Continue with default settings? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Please update .env file and run again."
        exit 1
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies."
        exit 1
    fi
    echo "✅ Dependencies installed."
fi

# Create logs directory
mkdir -p logs

# Start the server
echo "🚀 Starting OllamaGeek API wrapper..."
echo "📡 The wrapper will be available at: http://localhost:3003"
echo "🔧 Orchestration endpoint: http://localhost:3003/api/orchestrate"
echo "📊 Health check: http://localhost:3003/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
