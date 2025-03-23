const express = require('express');
const auth = require('../../middlewares/auth');
const { RoleEnum } = require('@prisma/client');
const { 
  createSubscription,
  getUserSubscriptions,
  getTodayDeliveries,
  getTomorrowDeliveries,
  getUpcomingDeliveries,
  pauseSubscriptionController,
  resumeSubscriptionController,
  cancelSubscriptionController,
  getAllSubscriptions
} = require('./subscription.controller');

const router = express.Router();

router.post(
  '/create',
  auth(RoleEnum.ADMIN),
  createSubscription
);

router.get(
  '/my-subscriptions',
  auth(RoleEnum.ADMIN),
  getUserSubscriptions
);

// get all subscriptions for admin with filters and pagination
router.get(
  '/all-subscriptions',
  auth(RoleEnum.ADMIN),
  getAllSubscriptions
);

// Subscription management routes
router.post('/:subscriptionId/pause', auth(), pauseSubscriptionController);
router.post('/:subscriptionId/resume', auth(), resumeSubscriptionController);
router.post('/:subscriptionId/cancel', auth(), cancelSubscriptionController);

// New delivery routes (admin only)
router.get('/deliveries/today', auth(RoleEnum.ADMIN), getTodayDeliveries);
router.get('/deliveries/tomorrow', auth(RoleEnum.ADMIN), getTomorrowDeliveries);
router.get('/deliveries/upcoming', auth(RoleEnum.ADMIN), getUpcomingDeliveries);

module.exports = router; 