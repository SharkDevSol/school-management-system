// Export all middleware from a single entry point
const auth = require('./auth');
const rateLimiter = require('./rateLimiter');
const inputValidation = require('./inputValidation');
const fileValidation = require('./fileValidation');
const security = require('./security');

module.exports = {
  // Authentication
  ...auth,
  
  // Rate limiting
  ...rateLimiter,
  
  // Input validation
  ...inputValidation,
  
  // File validation
  ...fileValidation,
  
  // Security headers and utilities
  ...security
};
