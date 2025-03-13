const catchAsync = require('../../utils/catchAsync');
const sendResponse = require('../../utils/sendResponse');
const { UserService } = require('./user.service');

const createUser = catchAsync(async (req, res) => {
  const result = await UserService.createUser(req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'User created successfully',
    data: result,
  });
});

const loginUser = catchAsync(async (req, res) => {
  const result = await UserService.loginUser(req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'User logged in successfully',
    data: result,
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const result = await UserService.updateProfile(req.user.id, req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Profile updated successfully',
    data: result,
  });
});

const deleteUser = catchAsync(async (req, res) => {
  await UserService.deleteUser(req.params.id);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'User deleted successfully',
  });
});

const changePassword = catchAsync(async (req, res) => {
  const result = await UserService.changePassword(req.user.id, req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Password changed successfully',
    data: result,
  });
});

const updateRole = catchAsync(async (req, res) => {
  const result = await UserService.updateRole(req.params.id, req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Role updated successfully',
    data: result,
  });
});

const forgotPassword = catchAsync(async (req, res) => {
  const result = await UserService.forgotPassword(req.body.email);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'OTP sent successfully',
    data: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const result = await UserService.resetPassword(req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Password reset successfully',
    data: result,
  });
});

const UserController = {
  createUser,
  loginUser,
  updateProfile,
  deleteUser,
  changePassword,
  updateRole,
  forgotPassword,
  resetPassword,
};

module.exports = { UserController };
