const express = require('express');
const router = express.Router();
const fileController = require('./file.controller');
const auth = require('../../middlewares/auth');
const multer = require('multer');

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// File upload routes
router.post(
  '/upload',
//   auth('USER', 'ADMIN'),
  upload.single('file'),
  fileController.uploadFile
);

router.post(
  '/upload-with-qr',
//   auth('USER', 'ADMIN'),
  upload.single('file'),
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