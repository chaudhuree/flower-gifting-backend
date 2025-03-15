const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../errors/AppError');
const config = require('../../config');

// Initialize S3 client for DigitalOcean Spaces
const s3Client = new S3Client({
  forcePathStyle: false, // Required for DigitalOcean Spaces
  endpoint: config.digitalOcean.endpoint,
  region: "nyc3",
  credentials: {
    accessKeyId: config.digitalOcean.accessKeyId,
    secretAccessKey: config.digitalOcean.secretAccessKey,
  }
});


/**
 * NODE_ENV=development
PORT=5000
DATABASE_URL= mongodb+srv://chaudhuree:chaudhuree@cluster0.zbqtwmy.mongodb.net/flower-gift?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET= "secret"
JWT_EXPIRES_IN= "7d"
# Stripe
STRIPE_SECRET_KEY=sk_test_51Qp5LOPs8mVJ1TARHLe2BwHxb4lP9rDLqJqKbZzdSNXsXsz1UjqpwlwCtY8G419upYMaCdn8b8Dgr3BRllDmOAa1008KFuRdrT
STRIPE_PUBLISHABLE_KEY=pk_test_51Qp5LOPs8mVJ1TARXPGnFhtXqSGxyInN2qfw2Suc8Uc9UT4iDcYC90XHcCWjViiqsIidXKA1sSoHEE68SdBXvR8000d6SXeuJa

# space

DO_SPACE_ENDPOINT="https://nyc3.digitaloceanspaces.com"
DO_SPACE_ACCESS_KEY="DO002RGDJ947DJHJ9WDT"
DO_SPACE_SECRET_KEY="e5+/pko6Ojar51Hb8ojUKfq2HtXy+tnGKOfs3rIcEfo"
DO_SPACE_BUCKET="smtech-space"
 * 
 */
/**
 * Format error details for better readability
 * @param {Error} error - The error object
 * @returns {Object} - Formatted error details
 */
function formatErrorDetails(error) {
  const errorDetails = {
    message: error.message || 'Unknown error',
    name: error.name,
    code: error.Code || error.code,
    statusCode: error.$metadata?.httpStatusCode || error.statusCode || 500
  };

  // Add request ID if available
  if (error.$metadata?.requestId) {
    errorDetails.requestId = error.$metadata.requestId;
  }

  // Add specific S3 error information
  if (error.Code) {
    switch (error.Code) {
      case 'InvalidAccessKeyId':
        errorDetails.explanation = 'The access key ID provided does not exist or is not active';
        errorDetails.solution = 'Verify your access key or generate new keys in DigitalOcean dashboard';
        break;
      case 'SignatureDoesNotMatch':
        errorDetails.explanation = 'The request signature calculated does not match the signature provided';
        errorDetails.solution = 'Check your secret access key for accuracy';
        break;
      case 'NoSuchBucket':
        errorDetails.explanation = `The bucket "${config.digitalOcean.bucket}" does not exist`;
        errorDetails.solution = 'Create the bucket in DigitalOcean Spaces or check the bucket name';
        break;
      case 'AccessDenied':
        errorDetails.explanation = 'Access denied to the requested resource';
        errorDetails.solution = 'Check permissions for your access keys';
        break;
      default:
        errorDetails.explanation = `S3 error: ${error.Code}`;
    }
  }

  return errorDetails;
}

class FileUpload {
  constructor() {
    this.bucket = config.digitalOcean.bucket;
    this.baseUrl = `${config.digitalOcean.endpoint}/${this.bucket}`;
  }

  /**
   * Upload a single file
   * @param {Object} file - File object from multer
   * @returns {Promise<String>} - Returns uploaded file URL
   */
  async uploadFile(file) {
    // Validate file input
    if (!file) {
      throw new AppError('No file provided', 400);
    }

    try {
      // Log upload attempt
      console.log("Starting file upload:", {
        fileName: file.originalname,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        mimeType: file.mimetype
      });

      // Generate unique filename
      const fileExtension = file.originalname.split(".").pop().toLowerCase();
      const fileName = `files/${uuidv4()}.${fileExtension}`;

      // Define upload parameters
      const uploadParams = {
        Bucket: config.digitalOcean.bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      };

      try {
        // Attempt to upload file
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);

        // Generate and return public URL
        const fileUrl = `${config.digitalOcean.endpoint}/${config.digitalOcean.bucket}/${fileName}`;
        console.log("✅ File upload successful:", {
          url: fileUrl,
          size: `${(file.size / 1024).toFixed(2)} KB`
        });
        
        return fileUrl;
      } catch (uploadError) {
        // Handle S3 specific errors
        const errorDetails = formatErrorDetails(uploadError);
        
        console.error("❌ S3 Upload Error:", errorDetails);
        
        throw new AppError(
          `File upload failed: ${errorDetails.explanation || errorDetails.message}`,
          errorDetails.statusCode
        );
      }
    } catch (error) {
      // Handle general errors
      if (error instanceof AppError) {
        throw error;
      }
      
      const errorDetails = formatErrorDetails(error);
      console.error("❌ Unexpected error during file upload:", errorDetails);
      
      throw new AppError(
        `File upload failed: ${errorDetails.explanation || errorDetails.message}`,
        errorDetails.statusCode
      );
    }
  }

  /**
   * Generate QR code for a file URL and upload it
   * @param {String} fileUrl - URL of the uploaded file
   * @returns {Promise<String>} - Returns QR code image URL
   */
  async generateAndUploadQRCode(fileUrl) {
    try {
      console.log("Generating QR code for URL:", fileUrl);
      
      // Generate QR code as buffer
      const qrBuffer = await QRCode.toBuffer(fileUrl, {
        errorCorrectionLevel: 'H',
        type: 'png',
        margin: 1,
        width: 300
      });

      // Generate unique filename
      const fileName = `qrcodes/${uuidv4()}.png`;

      // Define upload parameters
      const uploadParams = {
        Bucket: config.digitalOcean.bucket,
        Key: fileName,
        Body: qrBuffer,
        ContentType: 'image/png',
        ACL: 'public-read',
      };

      try {
        // Upload QR code
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);

        // Generate and return public URL
        const qrCodeUrl = `${config.digitalOcean.endpoint}/${config.digitalOcean.bucket}/${fileName}`;
        console.log("✅ QR code generated and uploaded:", qrCodeUrl);
        
        return qrCodeUrl;
      } catch (uploadError) {
        // Handle S3 specific errors
        const errorDetails = formatErrorDetails(uploadError);
        
        console.error("❌ QR Code Upload Error:", errorDetails);
        
        throw new AppError(
          `QR code upload failed: ${errorDetails.explanation || errorDetails.message}`,
          errorDetails.statusCode
        );
      }
    } catch (error) {
      // Handle general errors
      if (error instanceof AppError) {
        throw error;
      }
      
      const errorDetails = formatErrorDetails(error);
      console.error("❌ QR code generation error:", errorDetails);
      
      throw new AppError(
        `QR code generation failed: ${errorDetails.explanation || errorDetails.message}`,
        errorDetails.statusCode
      );
    }
  }

  /**
   * Upload file and generate QR code
   * @param {Object} file - File object from multer
   * @returns {Promise<Object>} - Returns both file URL and QR code URL
   */
  async uploadFileWithQR(file) {
    try {
      console.log("Starting file upload with QR code generation");
      
      // Upload original file
      const fileUrl = await this.uploadFile(file);
      
      // Generate and upload QR code
      const qrCodeUrl = await this.generateAndUploadQRCode(fileUrl);

      console.log("✅ File upload with QR code completed successfully");
      
      return {
        fileUrl,
        qrCodeUrl
      };
    } catch (error) {
      // Pass through AppErrors
      if (error instanceof AppError) {
        throw error;
      }
      
      const errorDetails = formatErrorDetails(error);
      console.error("❌ File upload with QR failed:", errorDetails);
      
      throw new AppError(
        `File upload with QR failed: ${errorDetails.explanation || errorDetails.message}`,
        errorDetails.statusCode
      );
    }
  }

  /**
   * Delete a file from space
   * @param {String} fileUrl - Complete URL of the file
   * @returns {Promise<void>}
   */
  async deleteFile(fileUrl) {
    try {
      console.log("Attempting to delete file:", fileUrl);
      
      // Extract key from URL
      const urlParts = fileUrl.split('/');
      const bucketIndex = urlParts.indexOf(config.digitalOcean.bucket);
      
      if (bucketIndex === -1) {
        throw new AppError('Invalid file URL format', 400);
      }
      
      const key = urlParts.slice(bucketIndex + 1).join('/');
      
      // Define delete parameters
      const deleteParams = {
        Bucket: config.digitalOcean.bucket,
        Key: key
      };

      try {
        // Delete file
        const command = new DeleteObjectCommand(deleteParams);
        await s3Client.send(command);
        
        console.log("✅ File deleted successfully:", key);
      } catch (deleteError) {
        // Handle S3 specific errors
        const errorDetails = formatErrorDetails(deleteError);
        
        console.error("❌ File deletion error:", errorDetails);
        
        throw new AppError(
          `File deletion failed: ${errorDetails.explanation || errorDetails.message}`,
          errorDetails.statusCode
        );
      }
    } catch (error) {
      // Pass through AppErrors
      if (error instanceof AppError) {
        throw error;
      }
      
      const errorDetails = formatErrorDetails(error);
      console.error("❌ Unexpected error during file deletion:", errorDetails);
      
      throw new AppError(
        `File deletion failed: ${errorDetails.explanation || errorDetails.message}`,
        errorDetails.statusCode
      );
    }
  }

  /**
   * Delete multiple files from space
   * @param {Array<String>} fileUrls - Array of file URLs
   * @returns {Promise<void>}
   */
  async deleteMultipleFiles(fileUrls) {
    try {
      console.log(`Attempting to delete ${fileUrls.length} files`);
      
      if (!Array.isArray(fileUrls) || fileUrls.length === 0) {
        throw new AppError('No files provided for deletion', 400);
      }
      
      // Delete files in parallel
      const results = await Promise.allSettled(fileUrls.map(url => this.deleteFile(url)));
      
      // Check for failures
      const failures = results.filter(r => r.status === 'rejected');
      
      if (failures.length > 0) {
        console.warn(`⚠️ ${failures.length} of ${fileUrls.length} files failed to delete`);
        
        if (failures.length === fileUrls.length) {
          throw new AppError('All file deletions failed', 500);
        }
      } else {
        console.log(`✅ All ${fileUrls.length} files deleted successfully`);
      }
    } catch (error) {
      // Pass through AppErrors
      if (error instanceof AppError) {
        throw error;
      }
      
      const errorDetails = formatErrorDetails(error);
      console.error("❌ Multiple files deletion error:", errorDetails);
      
      throw new AppError(
        `Multiple files deletion failed: ${errorDetails.explanation || errorDetails.message}`,
        errorDetails.statusCode
      );
    }
  }
}

module.exports = new FileUpload();
