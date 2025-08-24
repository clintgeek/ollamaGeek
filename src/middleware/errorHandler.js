const { Logger } = require('../utils/logger');

function createErrorHandler() {
  return function(err, req, res, next) {
    const logger = new Logger();

    // Log the error
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Determine error type and status code
    let statusCode = 500;
    let errorMessage = 'Internal Server Error';

    if (err.status) {
      statusCode = err.status;
    } else if (err.statusCode) {
      statusCode = err.statusCode;
    }

    if (err.message) {
      errorMessage = err.message;
    }

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
      errorMessage = 'Internal Server Error';
    }

    // Send error response
    res.status(statusCode).json({
      error: {
        message: errorMessage,
        status: statusCode,
        timestamp: new Date().toISOString(),
        path: req.url,
        method: req.method
      }
    });
  };
}

// Export both the factory function and the class for backward compatibility
module.exports = {
  ErrorHandler: { middleware: createErrorHandler() },
  createErrorHandler
};
