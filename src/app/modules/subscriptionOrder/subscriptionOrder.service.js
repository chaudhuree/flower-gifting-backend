const prisma = require('../../utils/prisma');
const AppError = require('../../errors/AppError');

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

const createSubscriptionOrder = async (subscriptionId, deliveryDate) => {
  // Check if order already exists
  const existingOrder = await checkExistingOrder(subscriptionId, deliveryDate);
  if (existingOrder) {
    throw new AppError('Order already exists for this delivery date', 400);
  }

  // Get subscription details
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId }
  });

  if (!subscription) {
    throw new AppError('Subscription not found', 404);
  }

  // Create subscription order
  const order = await prisma.subscriptionOrder.create({
    data: {
      subscriptionId,
      deliveryDate,
      deliveryLocation: subscription.deliveryLocation,
      receiverName: subscription.receiverName,
      receiverPhone: subscription.receiverPhone,
      anonymous: subscription.anonymous,
      status: 'PENDING'
    }
  });

  return order;
};

const updateOrderStatus = async (orderId, status, failureReason = null) => {
  const order = await prisma.subscriptionOrder.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new AppError('Subscription order not found', 404);
  }

  const updatedOrder = await prisma.subscriptionOrder.update({
    where: { id: orderId },
    data: {
      status,
      failureReason: status === 'FAILED' ? failureReason : null,
      updatedAt: new Date()
    }
  });

  return updatedOrder;
};

const getSubscriptionOrders = async (query) => {
  const {
    page = 1,
    limit = 10,
    status,
    subscriptionId,
    startDate,
    endDate
  } = query;

  const skip = (Number(page) - 1) * Number(limit);
  
  // Build where condition
  const whereCondition = {};
  if (status) whereCondition.status = status;
  if (subscriptionId) whereCondition.subscriptionId = subscriptionId;
  if (startDate && endDate) {
    whereCondition.deliveryDate = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };
  }

  const [total, orders] = await prisma.$transaction([
    prisma.subscriptionOrder.count({ where: whereCondition }),
    prisma.subscriptionOrder.findMany({
      where: whereCondition,
      include: {
        subscription: {
          include: {
            package: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { deliveryDate: 'desc' },
      skip,
      take: Number(limit)
    })
  ]);

  return {
    data: orders,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    }
  };
};

module.exports = {
  createSubscriptionOrder,
  updateOrderStatus,
  getSubscriptionOrders
}; 