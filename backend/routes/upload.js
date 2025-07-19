const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage for different file types
const createCloudinaryStorage = (folder, allowedFormats) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `chat-app/${folder}`,
      allowed_formats: allowedFormats,
      transformation: folder === 'images' ? [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto:good' }
      ] : undefined
    }
  });
};

// Storage configurations
const imageStorage = createCloudinaryStorage('images', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
const videoStorage = createCloudinaryStorage('videos', ['mp4', 'avi', 'mov', 'wmv', 'flv']);
const documentStorage = createCloudinaryStorage('documents', ['pdf', 'doc', 'docx', 'txt', 'rtf']);

// File filter function
const fileFilter = (allowedTypes) => (req, file, cb) => {
  const fileType = file.mimetype.split('/')[0];
  if (allowedTypes.includes(fileType) || allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only ${allowedTypes.join(', ')} files are allowed.`), false);
  }
};

// Multer configurations
const uploadImage = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for images
  },
  fileFilter: fileFilter(['image'])
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for videos
  },
  fileFilter: fileFilter(['video'])
});

const uploadDocument = multer({
  storage: documentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for documents
  },
  fileFilter: fileFilter(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Please check the file size limits.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`
    });
  }
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next();
};

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   POST /api/upload/image
// @desc    Upload image file
// @access  Private
router.post('/image', (req, res, next) => {
  uploadImage.single('file')(req, res, (error) => {
    handleUploadError(error, req, res, () => {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          fileUrl: req.file.path,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          messageType: 'image',
          cloudinaryId: req.file.filename
        }
      });
    });
  });
});

// @route   POST /api/upload/video
// @desc    Upload video file
// @access  Private
router.post('/video', (req, res, next) => {
  uploadVideo.single('file')(req, res, (error) => {
    handleUploadError(error, req, res, () => {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No video file provided'
        });
      }

      res.json({
        success: true,
        message: 'Video uploaded successfully',
        data: {
          fileUrl: req.file.path,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          messageType: 'video',
          cloudinaryId: req.file.filename
        }
      });
    });
  });
});

// @route   POST /api/upload/document
// @desc    Upload document file
// @access  Private
router.post('/document', (req, res, next) => {
  uploadDocument.single('file')(req, res, (error) => {
    handleUploadError(error, req, res, () => {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No document file provided'
        });
      }

      res.json({
        success: true,
        message: 'Document uploaded successfully',
        data: {
          fileUrl: req.file.path,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          messageType: 'document',
          cloudinaryId: req.file.filename
        }
      });
    });
  });
});

// @route   DELETE /api/upload/:cloudinaryId
// @desc    Delete uploaded file from Cloudinary
// @access  Private
router.delete('/:cloudinaryId', async (req, res) => {
  try {
    const { cloudinaryId } = req.params;

    if (!cloudinaryId) {
      return res.status(400).json({
        success: false,
        message: 'Cloudinary ID is required'
      });
    }

    // Delete file from Cloudinary
    const result = await cloudinary.uploader.destroy(cloudinaryId);

    if (result.result === 'ok') {
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'File not found or already deleted'
      });
    }

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting file'
    });
  }
});

module.exports = router;