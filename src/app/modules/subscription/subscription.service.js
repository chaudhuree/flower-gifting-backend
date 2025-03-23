const prisma = require('../../utils/prisma');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AppError = require('../../errors/AppError');
const cron = require('node-cron');

const calculateNextDeliveryDate = (baseDate, frequency) => {
  const date = new Date(baseDate);
  switch(frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      throw new AppError('Invalid frequency', 400);
  }
  return date;
};

// Cron job to update next delivery dates
cron.schedule('0 0 * * *', async () => { // Runs daily at midnight
  try {
    // Get all active subscriptions
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextDeliveryDate: {
          lte: new Date() // Only update if current delivery date has passed
        }
      }
    });

    console.log(`Updating delivery dates for ${activeSubscriptions.length} subscriptions`);

    // Update next delivery dates
    for (const subscription of activeSubscriptions) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          nextDeliveryDate: calculateNextDeliveryDate(
            subscription.nextDeliveryDate,
            subscription.frequency
          )
        }
      });
    }
  } catch (error) {
    console.error('Delivery date update cron job error:', error);
  }
});

// Webhook handlers for different subscription events
const handleSubscriptionEvents = async (event) => {
  const subscription = event.data.object;
  
  switch (event.type) {
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(subscription);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(subscription);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(subscription);
      break;
    case 'payment_method.detached':
      await handlePaymentMethodDetached(subscription);
      break;
  }
};

const handlePaymentSucceeded = async (invoice) => {
  if (!invoice.subscription) return; // Only handle subscription payments

  await prisma.subscription.update({
    where: {
      stripeSubscriptionId: invoice.subscription
    },
    data: {
      status: 'ACTIVE',
      nextPaymentDate: new Date(invoice.next_payment_attempt * 1000)
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

  // Update subscription status based on payment attempt count
  const status = invoice.attempt_count >= 3 ? 'CANCELLED' : 'PAYMENT_FAILED';
  
  await prisma.subscription.update({
    where: {
      stripeSubscriptionId: invoice.subscription
    },
    data: {
      status,
      nextPaymentDate: invoice.next_payment_attempt 
        ? new Date(invoice.next_payment_attempt * 1000)
        : null,
      nextDeliveryDate: status === 'CANCELLED' ? null : subscription.nextDeliveryDate
    }
  });
};

const handleSubscriptionUpdated = async (subscription) => {
  const updateData = {
    nextPaymentDate: new Date(subscription.current_period_end * 1000)
  };

  // Handle different subscription statuses
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
  // Find subscriptions using this payment method
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE'
    },
    include: {
      user: true
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
          status: 'PAYMENT_FAILED'
        }
      });

      // Here you might want to notify the user that their payment method is invalid
      // Implementation of notification system would go here
    }
  }
};

const createSubscription = async (userId, subscriptionData) => {
  if (!userId) {
    throw new AppError('User ID is required', 400);
  }

  const {
    priceId,
    paymentMethodId,
    packageId,
    deliveryLocation,
    anonymous,
    receiverName,
    receiverPhone,
    firstDeliveryDate
  } = subscriptionData;

  // Find user with explicit where clause
  const user = await prisma.user.findUnique({
    where: {
      id: userId // This should now be properly defined
    }
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.stripeCustomerId) {
    throw new AppError('Stripe customer ID not found', 404);
  }

  try {
    // Verify package exists
    const package = await prisma.package.findUnique({
      where: { id: packageId }
    });

    if (!package) {
      throw new AppError('Package not found', 404);
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });

    // Set as default payment method
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Update user with payment method
    await prisma.user.update({
      where: { id: userId },
      data: { stripePaymentMethodId: paymentMethodId }
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: user.stripeCustomerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent']
    });

    const price = await stripe.prices.retrieve(priceId);
    
    const dbSubscription = await prisma.subscription.create({
      data: {
        userId,
        packageId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: 'PENDING',
        deliveryLocation,
        anonymous,
        receiverName,
        receiverPhone,
        firstDeliveryDate: new Date(firstDeliveryDate),
        nextDeliveryDate: new Date(firstDeliveryDate),
        nextPaymentDate: new Date(subscription.current_period_end * 1000),
        frequency: price.recurring.interval
      }
    });

    return {
      subscription: dbSubscription,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret
    };
  } catch (error) {
    // Clean up if something fails
    try {
      if (paymentMethodId) {
        await stripe.paymentMethods.detach(paymentMethodId);
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(error.message, 400);
  }
};

const getUserSubscriptions = async (userId) => {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    include: {
      package: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return subscriptions;
};

const getSubscriptionsByDeliveryDate = async (date) => {
  // Convert date string to start and end of the day
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      nextDeliveryDate: {
        gte: startDate,
        lte: endDate
      },
      status: 'ACTIVE' // Only get active subscriptions
    },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      },
      package: true
    },
    orderBy: {
      nextDeliveryDate: 'asc'
    }
  });

  return subscriptions;
};

const getUpcomingDeliveries = async (days = 7) => {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  endDate.setHours(23, 59, 59, 999);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      nextDeliveryDate: {
        gte: startDate,
        lte: endDate
      },
      status: 'ACTIVE'
    },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      },
      package: true
    },
    orderBy: {
      nextDeliveryDate: 'asc'
    }
  });

  // Group by delivery date
  const groupedDeliveries = subscriptions.reduce((acc, subscription) => {
    const date = subscription.nextDeliveryDate.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(subscription);
    return acc;
  }, {});

  return groupedDeliveries;
};

const pauseSubscription = async (userId, subscriptionId) => {
  // Find subscription and verify ownership
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      userId: userId
    }
  });

  if (!subscription) {
    throw new AppError('Subscription not found', 404);
  }

  if (subscription.status === 'CANCELLED') {
    throw new AppError('Cannot pause a cancelled subscription', 400);
  }

  try {
    // Pause subscription in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: {
        behavior: 'void' // or 'mark_uncollectible' based on your business logic
      }
    });

    // Update subscription in database
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'PAUSED'
      },
      include: {
        package: true
      }
    });

    return updatedSubscription;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Failed to pause subscription: ${error.message}`, 400);
  }
};

const resumeSubscription = async (userId, subscriptionId) => {
  // Find subscription and verify ownership
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      userId: userId
    }
  });

  if (!subscription) {
    throw new AppError('Subscription not found', 404);
  }

  if (subscription.status !== 'PAUSED') {
    throw new AppError('Subscription is not paused', 400);
  }

  try {
    // Resume subscription in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: null // Remove pause
    });

    // Update subscription in database
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE'
      },
      include: {
        package: true
      }
    });

    return updatedSubscription;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Failed to resume subscription: ${error.message}`, 400);
  }
};

const cancelSubscription = async (userId, subscriptionId) => {
  // Find subscription and verify ownership
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      userId: userId
    }
  });

  if (!subscription) {
    throw new AppError('Subscription not found', 404);
  }

  if (subscription.status === 'CANCELLED') {
    throw new AppError('Subscription is already cancelled', 400);
  }

  try {
    // Cancel subscription in Stripe
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

    // Update subscription in database
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED'
      },
      include: {
        package: true
      }
    });

    return updatedSubscription;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Failed to cancel subscription: ${error.message}`, 400);
  }
};

module.exports = {
  createSubscription,
  getUserSubscriptions,
  getSubscriptionsByDeliveryDate,
  getUpcomingDeliveries,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  handleSubscriptionEvents
}; 


// get subcsription by date range 

/**
 * GET /api/subscriptions/deliveries/tomorrow
 * GET /api/subscriptions/deliveries/today
 * GET /api/subscriptions/deliveries/upcoming
 * Or specify number of days
 * GET /api/subscriptions/deliveries/upcoming?days=14
 */

