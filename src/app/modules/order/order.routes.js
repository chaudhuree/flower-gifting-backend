const express = require('express');
const { OrderController } = require('./order.controller');
const auth = require('../../middlewares/auth');
const { RoleEnum } = require('@prisma/client');

const router = express.Router();

// Public routes (guest checkout)
router.post('/', OrderController.createOrder);
router.post('/:orderId/payment', OrderController.processPayment);

// Protected routes (require authentication)
router.get('/my-orders', auth(), OrderController.getUserOrders);
router.get('/:orderId', auth(), OrderController.getOrderById);
router.post('/:orderId/cancel', auth(), OrderController.cancelOrder);

// Admin routes
router.get('/', auth(RoleEnum.ADMIN), OrderController.getAllOrders);
router.patch('/:orderId/status', auth(RoleEnum.ADMIN), OrderController.updateOrderStatus);
router.get('/stats/dashboard', auth(RoleEnum.ADMIN), OrderController.getOrderStats);

module.exports = router;
