const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    this.currentLevel = this.logLevels[this.logLevel] || 2;

    // Create logs directory if it doesn't exist
    this.logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    // Initialize log files
    this.logFiles = {
      error: path.join(this.logsDir, 'error.log'),
      warn: path.join(this.logsDir, 'warn.log'),
      info: path.join(this.logsDir, 'info.log'),
      debug: path.join(this.logsDir, 'debug.log'),
      combined: path.join(this.logsDir, 'combined.log')
    };

    // Ensure log files exist
    for (const logFile of Object.values(this.logFiles)) {
      if (!fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, '');
      }
    }
  }

  /**
   * Log an error message
   */
  error(message, data = {}) {
    if (this.currentLevel >= this.logLevels.error) {
      this._log('ERROR', message, data);
    }
  }

  /**
   * Log a warning message
   */
  warn(message, data = {}) {
    if (this.currentLevel >= this.logLevels.warn) {
      this._log('WARN', message, data);
    }
  }

  /**
   * Log an info message
   */
  info(message, data = {}) {
    if (this.currentLevel >= this.logLevels.info) {
      this._log('INFO', message, data);
    }
  }

  /**
   * Log a debug message
   */
  debug(message, data = {}) {
    if (this.currentLevel >= this.logLevels.debug) {
      this._log('DEBUG', message, data);
    }
  }

  /**
   * Internal logging method
   */
  _log(level, message, data) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      pid: process.pid,
      memory: process.memoryUsage()
    };

    const logString = JSON.stringify(logEntry) + '\n';

    // Write to console
    this._writeToConsole(level, message, data);

    // Write to appropriate log file
    this._writeToFile(level, logString);

    // Write to combined log file
    this._writeToCombinedFile(logString);
  }

  /**
   * Write to console with appropriate formatting
   */
  _writeToConsole(level, message, data) {
    const timestamp = new Date().toISOString();
    const levelColors = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[35m'  // Magenta
    };

    const resetColor = '\x1b[0m';
    const color = levelColors[level] || '';

    let consoleMessage = `${color}[${timestamp}] ${level}${resetColor}: ${message}`;

    if (Object.keys(data).length > 0) {
      consoleMessage += ` ${JSON.stringify(data, null, 2)}`;
    }

    console.log(consoleMessage);
  }

  /**
   * Write to specific log file
   */
  _writeToFile(level, logString) {
    try {
      const logFile = this.logFiles[level.toLowerCase()];
      if (logFile) {
        fs.appendFileSync(logFile, logString);
      }
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Write to combined log file
   */
  _writeToCombinedFile(logString) {
    try {
      fs.appendFileSync(this.logFiles.combined, logString);
    } catch (error) {
      console.error('Failed to write to combined log file:', error.message);
    }
  }

  /**
   * Set log level
   */
  setLogLevel(level) {
    if (this.logLevels.hasOwnProperty(level)) {
      this.currentLevel = this.logLevels[level];
      this.logLevel = level;
      this.info('Log level changed', { newLevel: level });
    } else {
      this.warn('Invalid log level', { level, validLevels: Object.keys(this.logLevels) });
    }
  }

  /**
   * Get current log level
   */
  getLogLevel() {
    return this.logLevel;
  }

  /**
   * Get available log levels
   */
  getAvailableLogLevels() {
    return Object.keys(this.logLevels);
  }

  /**
   * Rotate log files
   */
  rotateLogs() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      for (const [level, logFile] of Object.entries(this.logFiles)) {
        if (fs.existsSync(logFile)) {
          const stats = fs.statSync(logFile);
          const fileSize = stats.size;

          // Rotate if file is larger than 10MB
          if (fileSize > 10 * 1024 * 1024) {
            const rotatedFile = `${logFile}.${timestamp}`;
            fs.renameSync(logFile, rotatedFile);

            // Create new empty log file
            fs.writeFileSync(logFile, '');

            this.info('Log file rotated', {
              level,
              originalFile: logFile,
              rotatedFile,
              size: fileSize
            });
          }
        }
      }
    } catch (error) {
      this.error('Failed to rotate log files', { error: error.message });
    }
  }

  /**
   * Clean up old log files
   */
  cleanupOldLogs(maxAgeDays = 30) {
    try {
      const maxAge = maxAgeDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
      const now = Date.now();
      let cleanedCount = 0;

      // Check logs directory for old rotated files
      if (fs.existsSync(this.logsDir)) {
        const files = fs.readdirSync(this.logsDir);

        for (const file of files) {
          if (file.includes('.log.') && file.endsWith('.log')) {
            const filePath = path.join(this.logsDir, file);
            const stats = fs.statSync(filePath);
            const age = now - stats.mtime.getTime();

            if (age > maxAge) {
              fs.unlinkSync(filePath);
              cleanedCount++;
            }
          }
        }
      }

      if (cleanedCount > 0) {
        this.info('Old log files cleaned up', { cleanedCount, maxAgeDays });
      }

      return cleanedCount;
    } catch (error) {
      this.error('Failed to cleanup old log files', { error: error.message });
      return 0;
    }
  }

  /**
   * Get log file statistics
   */
  getLogStats() {
    try {
      const stats = {};

      for (const [level, logFile] of Object.entries(this.logFiles)) {
        if (fs.existsSync(logFile)) {
          const fileStats = fs.statSync(logFile);
          stats[level] = {
            size: fileStats.size,
            modified: fileStats.mtime,
            exists: true
          };
        } else {
          stats[level] = {
            size: 0,
            modified: null,
            exists: false
          };
        }
      }

      return stats;
    } catch (error) {
      this.error('Failed to get log stats', { error: error.message });
      return {};
    }
  }

  /**
   * Search logs for specific patterns
   */
  searchLogs(pattern, level = 'all', maxResults = 100) {
    try {
      const results = [];
      const regex = new RegExp(pattern, 'i');

      const searchFiles = level === 'all'
        ? Object.values(this.logFiles)
        : [this.logFiles[level.toLowerCase()]];

      for (const logFile of searchFiles) {
        if (fs.existsSync(logFile)) {
          const content = fs.readFileSync(logFile, 'utf8');
          const lines = content.split('\n');

          for (const line of lines) {
            if (line.trim() && regex.test(line)) {
              try {
                const logEntry = JSON.parse(line);
                results.push(logEntry);

                if (results.length >= maxResults) {
                  break;
                }
              } catch (parseError) {
                // Skip malformed JSON lines
              }
            }
          }
        }
      }

      return results.slice(0, maxResults);
    } catch (error) {
      this.error('Failed to search logs', { error: error.message, pattern });
      return [];
    }
  }

  /**
   * Export logs to a file
   */
  exportLogs(outputFile, level = 'all', startDate = null, endDate = null) {
    try {
      let allLogs = [];

      if (level === 'all') {
        // Export from combined log file
        if (fs.existsSync(this.logFiles.combined)) {
          const content = fs.readFileSync(this.logFiles.combined, 'utf8');
          const lines = content.split('\n');

          for (const line of lines) {
            if (line.trim()) {
              try {
                const logEntry = JSON.parse(line);

                // Apply date filters if specified
                if (startDate || endDate) {
                  const logDate = new Date(logEntry.timestamp);

                  if (startDate && logDate < new Date(startDate)) continue;
                  if (endDate && logDate > new Date(endDate)) continue;
                }

                allLogs.push(logEntry);
              } catch (parseError) {
                // Skip malformed JSON lines
              }
            }
          }
        }
      } else {
        // Export from specific level log file
        const logFile = this.logFiles[level.toLowerCase()];
        if (logFile && fs.existsSync(logFile)) {
          const content = fs.readFileSync(logFile, 'utf8');
          const lines = content.split('\n');

          for (const line of lines) {
            if (line.trim()) {
              try {
                const logEntry = JSON.parse(line);

                // Apply date filters if specified
                if (startDate || endDate) {
                  const logDate = new Date(logEntry.timestamp);

                  if (startDate && logDate < new Date(startDate)) continue;
                  if (endDate && logDate > new Date(endDate)) continue;
                }

                allLogs.push(logEntry);
              } catch (parseError) {
                // Skip malformed JSON lines
              }
            }
          }
        }
      }

      // Write to output file
      const exportData = {
        exportInfo: {
          timestamp: new Date().toISOString(),
          level,
          startDate,
          endDate,
          totalEntries: allLogs.length
        },
        logs: allLogs
      };

      fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));

      this.info('Logs exported successfully', {
        outputFile,
        level,
        totalEntries: allLogs.length
      });

      return { success: true, totalEntries: allLogs.length };

    } catch (error) {
      this.error('Failed to export logs', { error: error.message, outputFile });
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context) {
    const childLogger = Object.create(this);
    childLogger.context = context;

    // Override the _log method to include context
    childLogger._log = function(level, message, data) {
      const enhancedData = { ...data, context: this.context };
      Logger.prototype._log.call(this, level, message, enhancedData);
    };

    return childLogger;
  }
}

module.exports = { Logger };
