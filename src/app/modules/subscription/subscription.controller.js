const catchAsync = require('../../utils/catchAsync');
const sendResponse = require('../../utils/sendResponse');
const subscriptionService = require('./subscription.service');
const AppError = require('../../errors/AppError');

const createSubscription = catchAsync(async (req, res) => {
  if (!req.user?.id) {
    throw new AppError('User not authenticated', 401);
  }

  const result = await subscriptionService.createSubscription(req.user.id, req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Subscription created successfully',
    data: result
  });
});

const getUserSubscriptions = catchAsync(async (req, res) => {
  if (!req.user?.id) {
    throw new AppError('User not authenticated', 401);
  }

  const result = await subscriptionService.getUserSubscriptions(req.user.id);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Subscriptions retrieved successfully',
    data: result
  });
});

const getTodayDeliveries = catchAsync(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const result = await subscriptionService.getSubscriptionsByDeliveryDate(today);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Today\'s deliveries retrieved successfully',
    data: result
  });
});

const getTomorrowDeliveries = catchAsync(async (req, res) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const result = await subscriptionService.getSubscriptionsByDeliveryDate(
    tomorrow.toISOString().split('T')[0]
  );
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Tomorrow\'s deliveries retrieved successfully',
    data: result
  });
});

const getUpcomingDeliveries = catchAsync(async (req, res) => {
  const { days = 7 } = req.query;
  const result = await subscriptionService.getUpcomingDeliveries(parseInt(days));
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Upcoming deliveries retrieved successfully',
    data: result
  });
});

const pauseSubscriptionController = catchAsync(async (req, res) => {
  const { subscriptionId } = req.params;
  const { id: userId } = req.user;

  const result = await subscriptionService.pauseSubscription(userId, subscriptionId);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Subscription paused successfully',
    data: result
  });
});

const resumeSubscriptionController = catchAsync(async (req, res) => {
  const { subscriptionId } = req.params;
  const { id: userId } = req.user;

  const result = await subscriptionService.resumeSubscription(userId, subscriptionId);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Subscription resumed successfully',
    data: result
  });
});

const cancelSubscriptionController = catchAsync(async (req, res) => {
  const { subscriptionId } = req.params;
  const { id: userId } = req.user;

  const result = await subscriptionService.cancelSubscription(userId, subscriptionId);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Subscription cancelled successfully',
    data: result
  });
});

module.exports = {
  createSubscription,
  getUserSubscriptions,
  getTodayDeliveries,
  getTomorrowDeliveries,
  getUpcomingDeliveries,
  pauseSubscriptionController,
  resumeSubscriptionController,
  cancelSubscriptionController
}; 