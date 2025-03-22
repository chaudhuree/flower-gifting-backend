const catchAsync = require('../../utils/catchAsync');
const sendResponse = require('../../utils/sendResponse');
const { SubscriptionService } = require('./subscription.service');

const createSubscription = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await SubscriptionService.createSubscription(userId, req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Subscription created successfully',
    data: result
  });
});

const getUserSubscriptions = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await SubscriptionService.getUserSubscriptions(userId);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Subscriptions retrieved successfully',
    data: result
  });
});

// ... other controller methods

module.exports = {
  createSubscription,
  getUserSubscriptions
}; 