const { Logger } = require('../utils/logger');

function createRequestLogger() {
  return function(req, res, next) {
    const logger = new Logger();
    const startTime = Date.now();

    // Log request start
    logger.info('Request started', {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const duration = Date.now() - startTime;

      logger.info('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('Content-Length') || 'unknown'
      });

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

// Export both the factory function and the class for backward compatibility
module.exports = {
  RequestLogger: { middleware: createRequestLogger() },
  createRequestLogger
};
