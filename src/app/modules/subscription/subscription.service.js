const prisma = require('../../utils/prisma');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AppError = require('../../errors/AppError');

const createSubscription = async (userId, subscriptionData) => {
  const {
    priceId,
    paymentMethodId,
    packageId,
    deliveryLocation,
    anonymous
  } = subscriptionData;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeCustomerId) {
    throw new AppError('User stripe account not found', 404);
  }

  try {
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

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: user.stripeCustomerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent']
    });

    // Calculate next delivery date based on frequency
    const price = await stripe.prices.retrieve(priceId);
    const nextDeliveryDate = calculateNextDeliveryDate(price.recurring);

    // Save subscription in database
    const dbSubscription = await prisma.subscription.create({
      data: {
        userId,
        packageId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: 'PENDING',
        deliveryLocation,
        anonymous,
        nextDeliveryDate,
        frequency: `${price.recurring.interval_count}_${price.recurring.interval}`
      }
    });

    return dbSubscription;
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

// ... other service methods

module.exports = {
  createSubscription
}; 