const catchAsync = require('../../utils/catchAsync');
const sendResponse = require('../../utils/sendResponse');
const { attachPaymentMethod, updatePaymentMethod, getPaymentMethod } = require('./payment.service');

const attachPaymentMethodController = catchAsync(async (req, res) => {
  const { paymentMethodId } = req.body;
  const userId = req.user.id; // Assuming you have auth middleware setting req.user

  const result = await attachPaymentMethod(userId, paymentMethodId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Payment method attached successfully',
    data: result
  });
});

const updatePaymentMethodController = catchAsync(async (req, res) => {
  const { paymentMethodId } = req.body;
  const userId = req.user.id;

  const result = await updatePaymentMethod(userId, paymentMethodId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Payment method updated successfully',
    data: result
  });
});

const getPaymentMethodController = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const result = await getPaymentMethod(userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: result ? 'Payment method retrieved successfully' : 'No payment method found',
    data: result
  });
});

module.exports = {
  attachPaymentMethodController,
  updatePaymentMethodController,
  getPaymentMethodController
}; 