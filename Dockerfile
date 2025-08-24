FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Copy configuration files
COPY env.example ./
COPY start.sh ./

# Make startup script executable
RUN chmod +x start.sh

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S ollamageek -u 1001

# Change ownership of the app directory
RUN chown -R ollamageek:nodejs /app
USER ollamageek

# Expose port
EXPOSE 11434

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:11434/health || exit 1

# Start the application
CMD ["npm", "start"]
