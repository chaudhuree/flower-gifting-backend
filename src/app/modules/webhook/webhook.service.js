const prisma = require('../../utils/prisma');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AppError = require('../../errors/AppError');

const handleSubscriptionEvents = async (event) => {
  const eventType = event.type;
  const data = event.data.object;
  
  try {
    switch (eventType) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(data);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(data);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(data);
        break;
      case 'payment_method.detached':
        await handlePaymentMethodDetached(data);
        break;
      default:
        console.log(`Unhandled event type: ${eventType}`);
    }
  } catch (error) {
    console.error(`Error handling webhook event ${eventType}:`, error);
    throw new AppError(`Webhook processing failed: ${error.message}`, 500);
  }
};

const handlePaymentSucceeded = async (invoice) => {
  if (!invoice.subscription) return;

  await prisma.subscription.update({
    where: {
      stripeSubscriptionId: invoice.subscription
    },
    data: {
      status: 'ACTIVE',
      nextPaymentDate: new Date(invoice.next_payment_attempt * 1000),
      paymentFailureCount: 0,
      lastPaymentStatus: 'succeeded',
      lastPaymentError: null
    }
  });
};

const handlePaymentFailed = async (invoice) => {
  if (!invoice.subscription) return;

  const subscription = await prisma.subscription.findUnique({
    where: {
      stripeSubscriptionId: invoice.subscription
    }
  });

  if (!subscription) return;

  const updatedFailureCount = (subscription.paymentFailureCount || 0) + 1;
  const status = updatedFailureCount >= 3 ? 'CANCELLED' : 'PAYMENT_FAILED';

  await prisma.subscription.update({
    where: {
      stripeSubscriptionId: invoice.subscription
    },
    data: {
      status,
      paymentFailureCount: updatedFailureCount,
      nextPaymentDate: invoice.next_payment_attempt 
        ? new Date(invoice.next_payment_attempt * 1000)
        : null,
      nextDeliveryDate: status === 'CANCELLED' ? null : subscription.nextDeliveryDate,
      lastPaymentStatus: 'failed',
      lastPaymentError: invoice.last_payment_error?.message || 'Payment failed'
    }
  });
};

const handleSubscriptionUpdated = async (subscription) => {
  const updateData = {
    nextPaymentDate: new Date(subscription.current_period_end * 1000)
  };

  switch (subscription.status) {
    case 'active':
      updateData.status = 'ACTIVE';
      break;
    case 'past_due':
      updateData.status = 'PAYMENT_FAILED';
      break;
    case 'canceled':
      updateData.status = 'CANCELLED';
      updateData.nextDeliveryDate = null;
      updateData.nextPaymentDate = null;
      break;
    case 'unpaid':
      updateData.status = 'PAYMENT_FAILED';
      break;
  }

  await prisma.subscription.update({
    where: {
      stripeSubscriptionId: subscription.id
    },
    data: updateData
  });
};

const handlePaymentMethodDetached = async (paymentMethod) => {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE'
    }
  });

  for (const subscription of subscriptions) {
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    if (stripeSubscription.default_payment_method === paymentMethod.id) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'PAYMENT_FAILED',
          lastPaymentStatus: 'invalid',
          lastPaymentError: 'Payment method was removed'
        }
      });
    }
  }
};

module.exports = {
  handleSubscriptionEvents,
  handlePaymentSucceeded,
  handlePaymentFailed,
  handleSubscriptionUpdated,
  handlePaymentMethodDetached
}; 




/**
 * 
 * 
 *invoice.payment_succeeded
 * invoice.payment_failed
 * customer.subscription.updated
 * payment_method.detached 
 * 
 */
