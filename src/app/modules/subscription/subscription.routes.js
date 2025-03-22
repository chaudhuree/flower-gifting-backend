const express = require('express');
const auth = require('../../middlewares/auth');
const { 
  createSubscription,
  getUserSubscriptions
} = require('./subscription.controller');

const router = express.Router();

router.post(
  '/create',
  auth('USER'),
  createSubscription
);

router.get(
  '/my-subscriptions',
  auth('USER'),
  getUserSubscriptions
);

module.exports = router; 