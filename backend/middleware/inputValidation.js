// Input validation and sanitization middleware

// Sanitize string input - remove potentially dangerous characters
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers like onclick=
};

// Sanitize object recursively
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key of Object.keys(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  return obj;
};

// Validation rules
const validators = {
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  
  phone: (value) => {
    // Allow digits, spaces, dashes, parentheses, and + for international
    const phoneRegex = /^[\d\s\-\(\)\+]{7,20}$/;
    return phoneRegex.test(String(value));
  },
  
  username: (value) => {
    // Alphanumeric, underscore, 3-50 characters
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    return usernameRegex.test(value);
  },
  
  password: (value) => {
    // At least 8 characters
    return typeof value === 'string' && value.length >= 8;
  },
  
  strongPassword: (value) => {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongRegex.test(value);
  },
  
  name: (value) => {
    // Letters, spaces, hyphens, apostrophes, 2-100 characters
    const nameRegex = /^[a-zA-Z\s\-']{2,100}$/;
    return nameRegex.test(value);
  },
  
  alphanumeric: (value) => {
    const alphaRegex = /^[a-zA-Z0-9]+$/;
    return alphaRegex.test(value);
  },
  
  integer: (value) => {
    return Number.isInteger(Number(value));
  },
  
  positiveInteger: (value) => {
    const num = Number(value);
    return Number.isInteger(num) && num > 0;
  },
  
  date: (value) => {
    const date = new Date(value);
    return !isNaN(date.getTime());
  },
  
  uuid: (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  // SQL injection prevention - check for dangerous patterns
  safeSqlInput: (value) => {
    if (typeof value !== 'string') return true;
    const dangerousPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
      /(--|;|\/\*|\*\/)/,
      /(\bOR\b|\bAND\b).*=/i
    ];
    return !dangerousPatterns.some(pattern => pattern.test(value));
  }
};

// Validate a single field
const validateField = (value, rules) => {
  const errors = [];
  
  for (const rule of rules) {
    if (rule === 'required') {
      if (value === undefined || value === null || value === '') {
        errors.push('This field is required');
      }
    } else if (rule === 'optional') {
      if (value === undefined || value === null || value === '') {
        return { valid: true, errors: [] }; // Skip other validations if empty and optional
      }
    } else if (validators[rule]) {
      if (!validators[rule](value)) {
        errors.push(`Invalid ${rule} format`);
      }
    } else if (typeof rule === 'object') {
      if (rule.min !== undefined && value.length < rule.min) {
        errors.push(`Minimum length is ${rule.min} characters`);
      }
      if (rule.max !== undefined && value.length > rule.max) {
        errors.push(`Maximum length is ${rule.max} characters`);
      }
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`Value must be one of: ${rule.enum.join(', ')}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
};

// Create validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const errors = {};
    
    // Sanitize all inputs first
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);
    
    // Validate body
    if (schema.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        const result = validateField(req.body[field], rules);
        if (!result.valid) {
          errors[field] = result.errors;
        }
      }
    }
    
    // Validate query params
    if (schema.query) {
      for (const [field, rules] of Object.entries(schema.query)) {
        const result = validateField(req.query[field], rules);
        if (!result.valid) {
          errors[`query.${field}`] = result.errors;
        }
      }
    }
    
    // Validate URL params
    if (schema.params) {
      for (const [field, rules] of Object.entries(schema.params)) {
        const result = validateField(req.params[field], rules);
        if (!result.valid) {
          errors[`params.${field}`] = result.errors;
        }
      }
    }
    
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    next();
  };
};

// Sanitization middleware - applies to all requests
const sanitizeInputs = (req, res, next) => {
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  next();
};

// Common validation schemas
const schemas = {
  login: {
    body: {
      username: ['required', 'username'],
      password: ['required', 'password']
    }
  },
  
  changePassword: {
    body: {
      currentPassword: ['required', 'password'],
      newPassword: ['required', 'password']
    }
  },
  
  createStaff: {
    body: {
      name: ['required', 'name'],
      gender: ['required', { enum: ['Male', 'Female', 'Other'] }],
      role: ['required'],
      staff_enrollment_type: ['required', { enum: ['Permanent', 'Contract'] }],
      staff_work_time: ['required', { enum: ['Full Time', 'Part Time'] }]
    }
  },
  
  createStudent: {
    body: {
      student_name: ['required', 'name'],
      gender: ['required', { enum: ['Male', 'Female', 'Other'] }],
      age: ['required', 'positiveInteger']
    }
  }
};

module.exports = {
  validate,
  validateField,
  validators,
  sanitizeInputs,
  sanitizeString,
  sanitizeObject,
  schemas
};
