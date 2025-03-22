const express = require('express');
const { handleWebhook } = require('../modules/webhook/webhook.controller');

const router = express.Router();

// Webhook routes don't need auth middleware
router.post('/', express.raw({type: 'application/json'}), handleWebhook);

module.exports = router; 