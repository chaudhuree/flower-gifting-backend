const { verifyToken } = require('../utils/jwt.utils');
const AppError = require('../errors/AppError');
const prisma = require('../utils/prisma');
const catchAsync = require('../utils/catchAsync');

const auth = (...requiredRoles) => {
  return catchAsync(async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('You are not authorized', 401);
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (requiredRoles.length && !requiredRoles.includes(user.role)) {
      throw new AppError('You are not authorized', 403);
    }

    req.user = user;
    next();
  });
};

module.exports = auth;
