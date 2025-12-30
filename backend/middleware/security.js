const helmet = require('helmet');

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for development
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin for uploads
});

// HTTPS redirect middleware (for production)
const httpsRedirect = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && process.env.HTTPS_ENABLED === 'true') {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  }
  next();
};

// Prevent parameter pollution
const preventParamPollution = (req, res, next) => {
  // If query params are arrays, take only the last value
  for (const key in req.query) {
    if (Array.isArray(req.query[key])) {
      req.query[key] = req.query[key][req.query[key].length - 1];
    }
  }
  next();
};

// Request size limiter
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = parseSize(maxSize);
    
    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: maxSize
      });
    }
    next();
  };
};

// Parse size string to bytes
const parseSize = (size) => {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
  if (!match) return 10 * 1024 * 1024; // Default 10MB
  return parseInt(match[1]) * (units[match[2]] || 1);
};

// XSS protection for JSON responses
const xssProtection = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    // Add security headers for JSON responses
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    return originalJson(data);
  };
  next();
};

// Log suspicious activity
const suspiciousActivityLogger = (req, res, next) => {
  const suspiciousPatterns = [
    /(\.\.|\/\/)/,  // Path traversal
    /<script/i,     // Script injection
    /union.*select/i, // SQL injection
    /javascript:/i  // JavaScript protocol
  ];
  
  const checkValue = (value) => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };
  
  const isSuspicious = 
    Object.values(req.query).some(checkValue) ||
    Object.values(req.params).some(checkValue) ||
    (req.body && typeof req.body === 'object' && Object.values(req.body).some(checkValue));
  
  if (isSuspicious) {
    console.warn(`[SECURITY WARNING] Suspicious request detected:`, {
      ip: req.ip,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

module.exports = {
  securityHeaders,
  httpsRedirect,
  preventParamPollution,
  requestSizeLimiter,
  xssProtection,
  suspiciousActivityLogger
};
