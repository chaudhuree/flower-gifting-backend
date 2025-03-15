const catchAsync = require('../../utils/catchAsync');
const FileUpload = require('../../utils/FileUpload');
const sendResponse = require('../../utils/sendResponse');
const AppError = require('../../errors/AppError');

const fileController = {
  uploadFile: catchAsync(async (req, res) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Log file size for debugging
    console.log(`Processing file: ${req.file.originalname}, Size: ${(req.file.size / (1024 * 1024)).toFixed(2)}MB`);

    const fileUrl = await FileUpload.uploadFile(req.file);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'File uploaded successfully',
      data: { fileUrl }
    });
  }),

  uploadFileWithQR: catchAsync(async (req, res) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Log file size for debugging
    console.log(`Processing file with QR: ${req.file.originalname}, Size: ${(req.file.size / (1024 * 1024)).toFixed(2)}MB`);

    const result = await FileUpload.uploadFileWithQR(req.file);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'File uploaded with QR code successfully',
      data: result
    });
  }),

  deleteFile: catchAsync(async (req, res) => {
    const { fileUrl } = req.body;
    
    if (!fileUrl) {
      throw new AppError('File URL is required', 400);
    }

    await FileUpload.deleteFile(fileUrl);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'File deleted successfully'
    });
  }),

  deleteMultipleFiles: catchAsync(async (req, res) => {
    const { fileUrls } = req.body;

    if (!Array.isArray(fileUrls) || fileUrls.length === 0) {
      throw new AppError('File URLs array is required', 400);
    }

    await FileUpload.deleteMultipleFiles(fileUrls);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'Files deleted successfully'
    });
  })
};

module.exports = fileController; 