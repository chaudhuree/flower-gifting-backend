const catchAsync = require('../../utils/catchAsync');
const sendResponse = require('../../utils/sendResponse');
const { PackageService } = require('./package.service');

const createPackage = catchAsync(async (req, res) => {
  const result = await PackageService.createPackage(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Package created successfully',
    data: result
  });
});

const getPackages = catchAsync(async (req, res) => {
  const result = await PackageService.getPackages();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Packages retrieved successfully',
    data: result
  });
});

// ... other controller methods

module.exports = {
  createPackage,
  getPackages
}; 