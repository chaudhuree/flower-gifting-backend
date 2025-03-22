const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../../utils/prisma');
const catchAsync = require('../../utils/catchAsync');

const handleWebhook = catchAsync(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    // ... handle other webhook events
  }

  res.json({ received: true });
});

const handleSubscriptionUpdated = async (subscription) => {
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status.toUpperCase(),
      // Update other relevant fields
    }
  });
};

// ... other webhook handlers

module.exports = {
  handleWebhook
}; 