// javascript file
// Utility functions for OllamaGeek

/**
 * Format a message for display
 */
function formatMessage(message) {
  return `[${new Date().toISOString()}] ${message}`;
}

/**
 * Validate file path
 */
function isValidPath(path) {
  return path && !path.includes("..") && !path.startsWith("/");
}

/**
 * Generate a unique ID
 */
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

module.exports = {
  formatMessage,
  isValidPath,
  generateId
};