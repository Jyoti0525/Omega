const multer = require('multer');
const path = require('path');

// Configure multer for local file uploads (backup option)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'video/mp4': true,
    'video/avi': true,
    'video/mov': true,
    'video/wmv': true,
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'text/plain': true
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Please upload images, videos, or documents only.'), false);
  }
};

// Create upload middleware
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 1 // Only one file at a time
  },
  fileFilter: fileFilter
});

// Error handling middleware for uploads
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size allowed is 50MB.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Only one file allowed at a time.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field. Please use the correct field name.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: `Upload error: ${error.message}`
        });
    }
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next();
};

// Validate file size based on type
const validateFileSize = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const fileType = req.file.mimetype.split('/')[0];
  const fileSizeInMB = req.file.size / (1024 * 1024);

  let maxSize;
  switch (fileType) {
    case 'image':
      maxSize = 5; // 5MB for images
      break;
    case 'video':
      maxSize = 50; // 50MB for videos
      break;
    default:
      maxSize = 10; // 10MB for documents
      break;
  }

  if (fileSizeInMB > maxSize) {
    return res.status(400).json({
      success: false,
      message: `File size too large. Maximum size for ${fileType} files is ${maxSize}MB.`
    });
  }

  next();
};

module.exports = {
  upload,
  handleUploadError,
  validateFileSize
};