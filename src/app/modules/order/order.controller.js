const catchAsync = require('../../utils/catchAsync');
const sendResponse = require('../../utils/sendResponse');
const { OrderService } = require('./order.service');
const AppError = require('../../errors/AppError');

const createOrder = catchAsync(async (req, res) => {
  // Get user ID from authenticated user or null for guest checkout
  const userId = req.user?.id || null;
  
  const result = await OrderService.createOrder(req.body, userId);
  
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Order created successfully',
    data: result,
  });
});

const processPayment = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  
  const result = await OrderService.processPayment(orderId, req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Payment processed successfully',
    data: result,
  });
});

const getOrderById = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user?.role === 'ADMIN' ? null : req.user?.id;
  
  const result = await OrderService.getOrderById(orderId, userId);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Order retrieved successfully',
    data: result,
  });
});

const getAllOrders = catchAsync(async (req, res) => {
  // Only admins can access all orders
  if (req.user?.role !== 'ADMIN') {
    throw new AppError('You are not authorized to access this resource', 403);
  }
  
  const result = await OrderService.getAllOrders(req.query);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Orders retrieved successfully',
    meta: result.meta,
    data: result.orders,
  });
});

const getUserOrders = catchAsync(async (req, res) => {
  const userId = req.user.id;
  
  const result = await OrderService.getUserOrders(userId, req.query);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'User orders retrieved successfully',
    meta: result.meta,
    data: result.orders,
  });
});

const updateOrderStatus = catchAsync(async (req, res) => {
  // Only admins can update order status
  if (req.user?.role !== 'ADMIN') {
    throw new AppError('You are not authorized to access this resource', 403);
  }
  
  const { orderId } = req.params;
  
  const result = await OrderService.updateOrderStatus(orderId, req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Order status updated successfully',
    data: result,
  });
});

const cancelOrder = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user?.role === 'ADMIN' ? null : req.user?.id;
  
  const result = await OrderService.cancelOrder(orderId, userId);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Order cancelled successfully',
    data: result,
  });
});

const getOrderStats = catchAsync(async (req, res) => {
  // Only admins can access order statistics
  if (req.user?.role !== 'ADMIN') {
    throw new AppError('You are not authorized to access this resource', 403);
  }
  
  const result = await OrderService.getOrderStats();
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Order statistics retrieved successfully',
    data: result,
  });
});

const OrderController = {
  createOrder,
  processPayment,
  getOrderById,
  getAllOrders,
  getUserOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
};

module.exports = { OrderController };
