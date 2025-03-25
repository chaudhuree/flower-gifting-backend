const prisma = require('../utils/prisma');
const { verifyToken } = require('../utils/jwt.utils');
const AppError = require('../errors/AppError');
const catchAsync = require('../utils/catchAsync');

const auth = (requiredRole) => {
  return catchAsync(async (req, res, next) => {
    // Check if authorization header exists
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new AppError('You are not authorized', 401);
    }

    try {
      // Verify token using the utility function
      const decoded = verifyToken(token);
      
      if (!decoded?.id) { // Change userId to id since that's what we store in token
        throw new AppError('Invalid token', 401);
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: {
          id: decoded.id // Use decoded.id
        }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check role if required
      if (requiredRole && user.role !== requiredRole) {
        throw new AppError('You are not authorized', 403);
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid token', 401);
      }
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token has expired', 401);
      }
      throw error;
    }
  });
};

module.exports = auth;
