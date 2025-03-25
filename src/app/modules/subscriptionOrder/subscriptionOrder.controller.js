const catchAsync = require('../../utils/catchAsync');
const sendResponse = require('../../utils/sendResponse');
const subscriptionOrderService = require('./subscriptionOrder.service');

const updateOrderStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, failureReason } = req.body;

  const result = await subscriptionOrderService.updateOrderStatus(id, status, failureReason);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Subscription order status updated successfully',
    data: result
  });
});

const getSubscriptionOrders = catchAsync(async (req, res) => {
  const result = await subscriptionOrderService.getSubscriptionOrders(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Subscription orders retrieved successfully',
    meta: result.meta,
    data: result.data
  });
});

const createSubscriptionOrder = catchAsync(async (req, res) => {
  const result = await subscriptionOrderService.createSubscriptionOrder(req.body.subscriptionId, req.body.deliveryDate);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Subscription order created successfully',
    data: result
  });
});

module.exports = {
  updateOrderStatus,
  getSubscriptionOrders,
  createSubscriptionOrder
}; 