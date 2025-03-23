const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const catchAsync = require('../../utils/catchAsync');
const webhookService = require('./webhook.service');
const AppError = require('../../errors/AppError');

const handleWebhook = catchAsync(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    await webhookService.handleSubscriptionEvents(event);

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook Error:', err.message);
    throw new AppError(`Webhook Error: ${err.message}`, 400);
  }
});

module.exports = {
  handleWebhook
}; 