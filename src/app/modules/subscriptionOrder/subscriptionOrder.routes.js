const express = require('express');
const auth = require('../../middlewares/auth');
const { RoleEnum } = require('@prisma/client');
const {
  updateOrderStatus,
  getSubscriptionOrders,
  createSubscriptionOrder
} = require('./subscriptionOrder.controller');

const router = express.Router();

// Admin routes
router.post(
  '/create',
  auth(RoleEnum.ADMIN),
  createSubscriptionOrder
);

router.get(
  '/all-orders',
  auth(RoleEnum.ADMIN),
  getSubscriptionOrders
);

router.patch(
  '/:id/status',
  auth(RoleEnum.ADMIN),
  updateOrderStatus
);

module.exports = router; 