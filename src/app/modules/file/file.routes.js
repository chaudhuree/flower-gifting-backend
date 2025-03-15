const express = require('express');
const router = express.Router();
const fileController = require('./file.controller');
const auth = require('../../middlewares/auth');
const multer = require('multer');
const AppError = require('../../errors/AppError');

// Configure multer with increased file size limit (100MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  // Custom error handling for multer errors
  fileFilter: (req, file, cb) => {
    // Optional: Add file type validation here if needed
    // For example, to allow only images and PDFs:
    // const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    // if (!allowedTypes.includes(file.mimetype)) {
    //   return cb(new AppError('Invalid file type. Only images and PDFs are allowed', 400), false);
    // }
    
    cb(null, true);
  }
});

// Custom error handler for multer errors
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large',
        error: {
          statusCode: 400,
          details: `File size exceeds the limit of 100MB`
        }
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
      error: {
        statusCode: 400,
        details: err.code
      }
    });
  }
  next(err);
};

// File upload routes
router.post(
  '/upload',
//   auth('USER', 'ADMIN'),
  upload.single('file'),
  handleMulterErrors,
  fileController.uploadFile
);

router.post(
  '/upload-with-qr',
//   auth('USER', 'ADMIN'),
  upload.single('file'),
  handleMulterErrors,
  fileController.uploadFileWithQR
);

// File deletion routes
router.delete(
  '/delete',
//   auth('ADMIN'),
  fileController.deleteFile
);

router.delete(
  '/delete-multiple',
//   auth('ADMIN'),
  fileController.deleteMultipleFiles
);

module.exports = router; 