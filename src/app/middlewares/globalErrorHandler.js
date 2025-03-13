const globalErrorHandler = (error, req, res, next) => {
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    error: error,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
};

module.exports = globalErrorHandler;
