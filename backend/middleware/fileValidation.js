const path = require('path');

// Allowed file types with their MIME types and magic bytes
const ALLOWED_FILE_TYPES = {
  // Images
  '.jpg': { mimes: ['image/jpeg'], magic: [0xFF, 0xD8, 0xFF] },
  '.jpeg': { mimes: ['image/jpeg'], magic: [0xFF, 0xD8, 0xFF] },
  '.png': { mimes: ['image/png'], magic: [0x89, 0x50, 0x4E, 0x47] },
  '.gif': { mimes: ['image/gif'], magic: [0x47, 0x49, 0x46] },
  '.webp': { mimes: ['image/webp'], magic: [0x52, 0x49, 0x46, 0x46] },
  '.svg': { mimes: ['image/svg+xml'], magic: null }, // SVG is text-based
  
  // Documents
  '.pdf': { mimes: ['application/pdf'], magic: [0x25, 0x50, 0x44, 0x46] },
  '.doc': { mimes: ['application/msword'], magic: [0xD0, 0xCF, 0x11, 0xE0] },
  '.docx': { mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'], magic: [0x50, 0x4B, 0x03, 0x04] },
  '.xls': { mimes: ['application/vnd.ms-excel'], magic: [0xD0, 0xCF, 0x11, 0xE0] },
  '.xlsx': { mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], magic: [0x50, 0x4B, 0x03, 0x04] },
  
  // Text
  '.txt': { mimes: ['text/plain'], magic: null },
  '.csv': { mimes: ['text/csv', 'text/plain'], magic: null },
};

// Maximum file sizes by category (in bytes)
const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024,      // 5MB for images
  document: 10 * 1024 * 1024,  // 10MB for documents
  default: 5 * 1024 * 1024     // 5MB default
};

// Get file category
const getFileCategory = (ext) => {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const docExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];
  
  if (imageExts.includes(ext)) return 'image';
  if (docExts.includes(ext)) return 'document';
  return 'default';
};

// Validate file extension
const validateExtension = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return {
    valid: ALLOWED_FILE_TYPES.hasOwnProperty(ext),
    extension: ext
  };
};

// Validate MIME type
const validateMimeType = (mimetype, extension) => {
  const allowed = ALLOWED_FILE_TYPES[extension];
  if (!allowed) return false;
  return allowed.mimes.includes(mimetype);
};

// Validate magic bytes (file signature)
const validateMagicBytes = (buffer, extension) => {
  const allowed = ALLOWED_FILE_TYPES[extension];
  if (!allowed || !allowed.magic) return true; // Skip if no magic bytes defined
  
  const magic = allowed.magic;
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) return false;
  }
  return true;
};

// Validate file size
const validateFileSize = (size, extension) => {
  const category = getFileCategory(extension);
  const maxSize = MAX_FILE_SIZES[category];
  return size <= maxSize;
};

// Main file validation middleware
const fileValidator = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const files = req.files || [req.file];
  const errors = [];

  for (const file of files) {
    if (!file) continue;

    // 1. Validate extension
    const extValidation = validateExtension(file.originalname);
    if (!extValidation.valid) {
      errors.push(`File "${file.originalname}": Invalid file type. Allowed: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`);
      continue;
    }

    // 2. Validate MIME type
    if (!validateMimeType(file.mimetype, extValidation.extension)) {
      errors.push(`File "${file.originalname}": MIME type mismatch. File may be corrupted or disguised.`);
      continue;
    }

    // 3. Validate magic bytes (if buffer available)
    if (file.buffer && !validateMagicBytes(file.buffer, extValidation.extension)) {
      errors.push(`File "${file.originalname}": File signature mismatch. File may be corrupted or disguised.`);
      continue;
    }

    // 4. Validate file size
    if (!validateFileSize(file.size, extValidation.extension)) {
      const category = getFileCategory(extValidation.extension);
      const maxMB = MAX_FILE_SIZES[category] / (1024 * 1024);
      errors.push(`File "${file.originalname}": File too large. Maximum size for ${category}s is ${maxMB}MB.`);
      continue;
    }

    // 5. Sanitize filename (remove potentially dangerous characters)
    file.sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'File validation failed',
      details: errors
    });
  }

  next();
};

// Multer file filter function
const multerFileFilter = (req, file, cb) => {
  const extValidation = validateExtension(file.originalname);
  
  if (!extValidation.valid) {
    cb(new Error(`Invalid file type: ${path.extname(file.originalname)}. Allowed: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`), false);
    return;
  }

  if (!validateMimeType(file.mimetype, extValidation.extension)) {
    cb(new Error(`MIME type mismatch for file: ${file.originalname}`), false);
    return;
  }

  cb(null, true);
};

module.exports = {
  fileValidator,
  multerFileFilter,
  validateExtension,
  validateMimeType,
  validateMagicBytes,
  validateFileSize,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZES
};
