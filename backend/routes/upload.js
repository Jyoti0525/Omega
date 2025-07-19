const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Utility: Cloudinary storage for images/videos
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

// ✅ Storage for images/videos
const imageStorage = createCloudinaryStorage('images', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
const videoStorage = createCloudinaryStorage('videos', ['mp4', 'avi', 'mov', 'wmv', 'flv']);

// ✅ File filter for allowed mimetypes
const fileFilter = (allowedTypes) => (req, file, cb) => {
  const fileType = file.mimetype.split('/')[0];
  if (allowedTypes.includes(fileType) || allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only ${allowedTypes.join(', ')} files are allowed.`), false);
  }
};

// ✅ Multer configs for images & videos
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter(['image'])
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: fileFilter(['video'])
});

// ✅ Temporary disk storage for documents
const multerDisk = multer({
  dest: path.join(__dirname, '../temp_uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ])
});

// ✅ Common upload error handler
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

// ✅ Auth middleware for all routes
router.use(authMiddleware);

// ================= IMAGE UPLOAD =================
router.post('/image', (req, res, next) => {
  uploadImage.single('file')(req, res, (error) => {
    handleUploadError(error, req, res, () => {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file provided' });
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

// ================= VIDEO UPLOAD =================
router.post('/video', (req, res, next) => {
  uploadVideo.single('file')(req, res, (error) => {
    handleUploadError(error, req, res, () => {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No video file provided' });
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

// ================= DOCUMENT UPLOAD (FIXED) =================
router.post('/document', (req, res) => {
  multerDisk.single('file')(req, res, async (error) => {
    handleUploadError(error, req, res, async () => {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No document file provided' });
      }

      try {
        // ✅ Upload to Cloudinary as RAW (for PDFs & docs)
        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: 'raw',
          folder: 'chat-app/documents',
          public_id: req.file.originalname.split('.')[0]
        });

        // ✅ Remove temporary file after upload
        fs.unlink(req.file.path, (err) => {
          if (err) console.warn('Temp file not deleted:', err.message);
        });

        res.json({
          success: true,
          message: 'Document uploaded successfully',
          data: {
            fileUrl: result.secure_url, // now loads as raw
            fileName: req.file.originalname,
            fileSize: req.file.size,
            messageType: 'document',
            cloudinaryId: result.public_id
          }
        });

      } catch (err) {
        console.error('Cloudinary document upload error:', err);
        res.status(500).json({ success: false, message: 'Failed to upload document' });
      }
    });
  });
});

// ================= DELETE FILE =================
router.delete('/:cloudinaryId', async (req, res) => {
  try {
    const { cloudinaryId } = req.params;
    if (!cloudinaryId) {
      return res.status(400).json({ success: false, message: 'Cloudinary ID is required' });
    }

    const result = await cloudinary.uploader.destroy(cloudinaryId, { resource_type: 'raw' });

    if (result.result === 'ok') {
      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'File not found or already deleted' });
    }
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting file' });
  }
});

module.exports = router;
