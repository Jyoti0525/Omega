const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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
      transformation:
        folder === 'images'
          ? [
              { width: 800, height: 600, crop: 'limit' },
              { quality: 'auto:good' }
            ]
          : undefined
    }
  });
};

const imageStorage = createCloudinaryStorage('images', [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp'
]);
const videoStorage = createCloudinaryStorage('videos', [
  'mp4',
  'avi',
  'mov',
  'wmv',
  'flv'
]);

// ✅ File filter for allowed mimetypes
const fileFilter = (allowedTypes) => (req, file, cb) => {
  const fileType = file.mimetype.split('/')[0];
  if (
    allowedTypes.includes(fileType) ||
    allowedTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Only ${allowedTypes.join(', ')} allowed.`
      ),
      false
    );
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
        message: 'File size too large.'
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
router.post('/image', (req, res) => {
  uploadImage.single('file')(req, res, (error) => {
    handleUploadError(error, req, res, () => {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: 'No image provided' });
      }

      res.json({
        success: true,
        message: 'Image uploaded',
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
router.post('/video', (req, res) => {
  uploadVideo.single('file')(req, res, (error) => {
    handleUploadError(error, req, res, () => {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: 'No video provided' });
      }

      res.json({
        success: true,
        message: 'Video uploaded',
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

// ================= DOCUMENT UPLOAD =================
router.post('/document', (req, res) => {
  multerDisk.single('file')(req, res, async (error) => {
    handleUploadError(error, req, res, async () => {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No document provided' });
      }

      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: 'raw',
          folder: 'chat-app/documents',
          access_mode: 'public',
          public_id: `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`
        });

        // ✅ Delete temp file
        fs.unlink(req.file.path, (err) => {
          if (err) console.warn('Temp file delete failed:', err.message);
        });

        // ✅ Direct usable URL (already signed & public)
        const documentUrl = result.secure_url;

        res.json({
          success: true,
          message: 'Document uploaded',
          data: {
            fileUrl: documentUrl,    // ✅ now using Cloudinary's own secure_url
            fileName: req.file.originalname,
            fileSize: req.file.size,
            messageType: 'document',
            cloudinaryId: result.public_id
          }
        });

      } catch (err) {
        console.error('Cloudinary upload error:', err);
        res.status(500).json({ success: false, message: 'Failed to upload document' });
      }
    });
  });
});

// ================= SAFE DOCUMENT VIEW ROUTE =================
// ✅ Now you can always open using /api/upload/document/view/:cloudinaryId
router.get('/document/view/:cloudinaryId', async (req, res) => {
  try {
    const { cloudinaryId } = req.params;

    if (!cloudinaryId) return res.status(400).send('Missing document ID');

    // ✅ Build direct Cloudinary URL
    const rawUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/${cloudinaryId}`;

    // ✅ Stream document to browser
    const response = await axios.get(rawUrl, { responseType: 'arraybuffer' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=document.pdf');
    res.send(response.data);

  } catch (error) {
    console.error('View error:', error.message);
    res.status(500).send('Failed to fetch document');
  }
});

// ================= DELETE FILE =================
router.delete('/:cloudinaryId', async (req, res) => {
  try {
    const { cloudinaryId } = req.params;
    if (!cloudinaryId) {
      return res
        .status(400)
        .json({ success: false, message: 'Cloudinary ID required' });
    }

    const result = await cloudinary.uploader.destroy(cloudinaryId, {
      resource_type: 'raw'
    });

    if (result.result === 'ok') {
      res.json({ success: true, message: 'File deleted' });
    } else {
      res
        .status(404)
        .json({ success: false, message: 'File not found or already deleted' });
    }
  } catch (error) {
    console.error('Delete file error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Server error while deleting file' });
  }
});

module.exports = router;
