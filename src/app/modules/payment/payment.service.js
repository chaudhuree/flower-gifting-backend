const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../../utils/prisma');
const AppError = require('../../errors/AppError');

const attachPaymentMethod = async (userId, paymentMethodId) => {
  try {
    // Get user with stripe customer ID
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.stripeCustomerId) {
      throw new AppError('Stripe customer ID not found', 404);
    }

    // Attach payment method to customer in Stripe
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });

    // Set as default payment method for the customer
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Update user in database with payment method ID
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        stripePaymentMethodId: paymentMethodId
      },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        stripePaymentMethodId: true
      }
    });

    return updatedUser;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      throw new AppError('Invalid card details: ' + error.message, 400);
    }
    
    throw new AppError('Failed to attach payment method: ' + error.message, 500);
  }
};

const updatePaymentMethod = async (userId, newPaymentMethodId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Detach old payment method if exists
    if (user.stripePaymentMethodId) {
      try {
        await stripe.paymentMethods.detach(user.stripePaymentMethodId);
      } catch (error) {
        console.log('Error detaching old payment method:', error);
        // Continue execution even if detaching fails
      }
    }

    // Attach and set new payment method
    await stripe.paymentMethods.attach(newPaymentMethodId, {
      customer: user.stripeCustomerId,
    });

    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: newPaymentMethodId,
      },
    });

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        stripePaymentMethodId: newPaymentMethodId
      },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        stripePaymentMethodId: true
      }
    });

    return updatedUser;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    if (error.type === 'StripeCardError') {
      throw new AppError('Invalid card details: ' + error.message, 400);
    }
    
    throw new AppError('Failed to update payment method: ' + error.message, 500);
  }
};

const getPaymentMethod = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user?.stripePaymentMethodId) {
      return null;
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(
      user.stripePaymentMethodId
    );

    return {
      id: paymentMethod.id,
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expiryMonth: paymentMethod.card.exp_month,
      expiryYear: paymentMethod.card.exp_year
    };
  } catch (error) {
    throw new AppError('Failed to retrieve payment method: ' + error.message, 500);
  }
};

module.exports = {
  attachPaymentMethod,
  updatePaymentMethod,
  getPaymentMethod
}; 