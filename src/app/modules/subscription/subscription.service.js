const prisma = require('../../utils/prisma');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AppError = require('../../errors/AppError');
const cron = require('node-cron');
const { createSubscriptionOrder } = require('../subscriptionOrder/subscriptionOrder.service');

const calculateNextDeliveryDate = (currentDate, frequency) => {
  const date = new Date(currentDate);
  
  switch (frequency.toLowerCase()) {
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
      throw new Error('Invalid frequency');
  }
  
  return date;
};

// Helper function to check if order already exists
const checkExistingOrder = async (subscriptionId, deliveryDate) => {
  const startOfDay = new Date(deliveryDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(deliveryDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existingOrder = await prisma.subscriptionOrder.findFirst({
    where: {
      subscriptionId,
      deliveryDate: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });

  return existingOrder;
};

// Updated cron job
cron.schedule('0 0 * * *', async () => { // Runs daily at midnight
  try {
    // Get all active subscriptions that need delivery
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextDeliveryDate: {
          lte: new Date(), // Only update if current delivery date has passed
          not: null // Ensure nextDeliveryDate exists
        }
      }
    });

    console.log(`Checking ${activeSubscriptions.length} subscriptions for delivery`);

    for (const subscription of activeSubscriptions) {
      try {
        // Check if order already exists for this delivery date
        const existingOrder = await checkExistingOrder(
          subscription.id,
          subscription.nextDeliveryDate
        );

        if (!existingOrder) {
          // Only create order if one doesn't exist
          await createSubscriptionOrder(
            subscription.id,
            subscription.nextDeliveryDate
          );
          console.log(`Created new order for subscription: ${subscription.id}`);
        } else {
          console.log(`Order already exists for subscription: ${subscription.id} on ${subscription.nextDeliveryDate}`);
        }

        // Calculate and update next delivery date
        const nextDate = calculateNextDeliveryDate(
          subscription.nextDeliveryDate,
          subscription.frequency
        );

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { nextDeliveryDate: nextDate }
        });
        
        console.log(`Updated next delivery date to ${nextDate} for subscription: ${subscription.id}`);
      } catch (error) {
        console.error(`Error processing subscription ${subscription.id}:`, error);
        // Continue with next subscription even if one fails
        continue;
      }
    }
  } catch (error) {
    console.error('Delivery date update cron job error:', error);
  }
});

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
    const subscriptionOrder = await createSubscriptionOrder(
      dbSubscription.id,
      dbSubscription.nextDeliveryDate
    );
    return {
      subscription: dbSubscription,
      subscriptionOrder,
      // clientSecret: subscription.latest_invoice.payment_intent.client_secret
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

const getAllSubscriptions = async (query) => {
  const {
    page = 1,
    limit = 10,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query;

  // Calculate skip value for pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Build where condition
  const whereCondition = {};
  if (status) {
    whereCondition.status = status;
  }

  // Build orderBy condition
  const orderBy = {};
  orderBy[sortBy] = sortOrder;

  // Get total count for pagination
  const total = await prisma.subscription.count({
    where: whereCondition
  });

  // Get paginated data
  const subscriptions = await prisma.subscription.findMany({
    where: whereCondition,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      package: {
        select: {
          id: true,
          name: true,
          image: true,
          basePrice: true
        }
      }
    },
    orderBy,
    skip,
    take: Number(limit)
  });

  // Calculate pagination info
  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    data: subscriptions,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage
    }
  };
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
  getAllSubscriptions
}; 


// get subcsription by date range 

/**
 * GET /api/subscriptions/deliveries/tomorrow
 * GET /api/subscriptions/deliveries/today
 * GET /api/subscriptions/deliveries/upcoming
 * Or specify number of days
 * GET /api/subscriptions/deliveries/upcoming?days=14
 */

