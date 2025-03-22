const express = require('express');
const auth = require('../../middlewares/auth');
const { 
  attachPaymentMethodController,
  updatePaymentMethodController,
  getPaymentMethodController
} = require('./payment.controller');

const router = express.Router();

router.post(
  '/attach',
  auth('USER'),
  attachPaymentMethodController
);

router.post(
  '/update',
  auth('USER'),
  updatePaymentMethodController
);

router.get(
  '/',
  auth('USER'),
  getPaymentMethodController
);

module.exports = router; 