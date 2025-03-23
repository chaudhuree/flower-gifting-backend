const express = require('express');
const { handleWebhook } = require('./webhook.controller');

const router = express.Router();

// Webhook routes don't need auth middleware
// Use raw body for Stripe webhook
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

module.exports = router; 