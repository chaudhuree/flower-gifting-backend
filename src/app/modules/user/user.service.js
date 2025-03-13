const prisma = require('../../utils/prisma');
const AppError = require('../../errors/AppError');
const bcrypt = require('bcryptjs');
const { createToken } = require('../../utils/jwt.utils');
const generateOTP = require('../../utils/generateOTP');

const createUser = async (userData) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: userData.email,
    },
  });

  if (existingUser) {
    throw new AppError('User already exists with this email', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, 12);
  userData.password = hashedPassword;

  const result = await prisma.user.create({
    data: userData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return result;
};

const loginUser = async (loginData) => {
  const { email, password } = loginData;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = createToken({ userId: user.id });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const updateProfile = async (userId, updateData) => {
  // Remove sensitive fields that shouldn't be updated
  const { password, role, email, ...updateFields } = updateData;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const result = await prisma.user.update({
    where: {
      id: userId,
    },
    data: updateFields,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return result;
};

const deleteUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });

  return null;
};

const changePassword = async (userId, passwordData) => {
  const { oldPassword, newPassword } = passwordData;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password: hashedPassword,
    },
  });

  return { message: 'Password changed successfully' };
};

const updateRole = async (userId, roleData) => {
  const { role } = roleData;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      role,
    },
  });

  return { message: 'Role updated successfully' };
};

const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new AppError('User not found with this email', 404);
  }

  // Generate OTP
  const otp = generateOTP();
  const otpExpiration = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

  // Save OTP and expiration
  await prisma.user.update({
    where: {
      email,
    },
    data: {
      resetOTP: otp,
      otpExpiration,
    },
  });

  // In a real application, you would send this OTP via email
  // For development, we'll return it in the response
  return {
    message: 'OTP has been sent to your email',
    otp, // Remove this in production
  };
};

const resetPassword = async (resetData) => {
  const { email, otp, newPassword } = resetData;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.resetOTP || !user.otpExpiration) {
    throw new AppError('No OTP was requested', 400);
  }

  if (user.resetOTP !== otp) {
    throw new AppError('Invalid OTP', 400);
  }

  if (new Date() > user.otpExpiration) {
    throw new AppError('OTP has expired', 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: {
      email,
    },
    data: {
      password: hashedPassword,
      resetOTP: null,
      otpExpiration: null,
    },
  });

  return { message: 'Password reset successfully' };
};

const UserService = {
  createUser,
  loginUser,
  updateProfile,
  deleteUser,
  changePassword,
  updateRole,
  forgotPassword,
  resetPassword,
};

module.exports = { UserService };
