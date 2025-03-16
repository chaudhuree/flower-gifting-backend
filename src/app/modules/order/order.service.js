const prisma = require('../../utils/prisma');
const AppError = require('../../errors/AppError');
const FileUpload = require('../../utils/FileUpload');
const QRCode = require('qrcode');
const stripe = require("stripe")(
  "sk_test_51Qp5LOPs8mVJ1TARHLe2BwHxb4lP9rDLqJqKbZzdSNXsXsz1UjqpwlwCtY8G419upYMaCdn8b8Dgr3BRllDmOAa1008KFuRdrT",
  {
    apiVersion: "2023-10-16",
  }
);

/**
 * Create a new order
 */
const createOrder = async (orderData, userId = null) => {
  const { 
    orderItems, 
    giftCardId, 
    message, 
    senderName, 
    senderEmail, 
    recipientName, 
    recipientEmail, 
    deliveryAddress, 
    deliveryDate,
    annonimous = false,
    qrCode = null
  } = orderData;

  // Validate order items
  if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
    throw new AppError('Order must contain at least one product', 400);
  }

  // Start a transaction
  return await prisma.$transaction(async (tx) => {
    // Calculate total price and validate products
    let totalPrice = 0;
    const orderItemsData = [];

    // Process each order item
    for (const item of orderItems) {
      const { productId, quantity } = item;
      
      if (!productId || !quantity || quantity < 1) {
        throw new AppError('Invalid product or quantity', 400);
      }

      // Get product details
      const product = await tx.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new AppError(`Product with ID ${productId} not found`, 404);
      }

      // Calculate item price
      const itemPrice = product.price * quantity;
      totalPrice += itemPrice;

      // Add to order items data
      orderItemsData.push({
        productId,
        quantity,
        price: product.price // Store current price
      });
    }

    // Add gift card price if provided
    let giftCard = null;
    if (giftCardId) {
      giftCard = await tx.giftCard.findUnique({
        where: { id: giftCardId }
      });

      if (!giftCard) {
        throw new AppError(`Gift card with ID ${giftCardId} not found`, 404);
      }

      totalPrice += giftCard.price;
    }
    // add price for qr code
    // totalPrice += 10;


    // Create the order
    const order = await tx.order.create({
      data: {
        totalPrice,
        message,
        qrCode,
        senderName,
        senderEmail,
        recipientName,
        recipientEmail,
        deliveryAddress,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        annonimous,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        userId,
        giftCardId,
        orderItems: {
          create: orderItemsData
        }
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        giftCard: true
      }
    });

  
    return order;
  });
};

/**
 * Process payment for an order
 */
const processPayment = async (orderId, paymentData) => {
  const { paymentMethodId } = paymentData;

  // Find the order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true
    }
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.paymentStatus === 'PAID') {
    throw new AppError('Order has already been paid', 400);
  }

  try {
    let customerId;
    
    // Get customer ID from user or create a new customer
    if (order.user && order.user.stripeCustomerId) {
      customerId = order.user.stripeCustomerId;
    } else {
      // Create a new customer for guest checkout
      const customer = await stripe.customers.create({
        email: order.senderEmail,
        name: order.senderName
      });
      customerId = customer.id;
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalPrice * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      description: `Order #${order.id}`,
      metadata: {
        orderId: order.id
      }
    });

    // Update order with payment information
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: 'STRIPE',
        paymentId: paymentIntent.id,
        status: 'PROCESSING'
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        giftCard: true
      }
    });

    return updatedOrder;
  } catch (error) {
    console.error('Payment processing error:', error);
    throw new AppError(`Payment failed: ${error.message}`, 400);
  }
};

/**
 * Get order by ID
 */
const getOrderById = async (orderId, userId = null) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          product: true
        }
      },
      giftCard: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // If userId is provided, check if the order belongs to the user
  if (userId && order.userId !== userId) {
    throw new AppError('You are not authorized to view this order', 403);
  }

  return order;
};

/**
 * Get all orders (admin)
 */
const getAllOrders = async (filters = {}) => {
  const { 
    status, 
    paymentStatus, 
    startDate, 
    endDate, 
    page = 1, 
    limit = 10 
  } = filters;

  const skip = (page - 1) * limit;
  
  // Build where condition
  const where = {};
  
  if (status) {
    where.status = status;
  }
  
  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }
  
  // Date range filter
  if (startDate || endDate) {
    where.createdAt = {};
    
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  // Get total count for pagination
  const total = await prisma.order.count({ where });
  
  // Get orders
  const orders = await prisma.order.findMany({
    where,
    include: {
      orderItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: true
            }
          }
        }
      },
      giftCard: {
        select: {
          id: true,
          name: true,
          price: true,
          image: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    skip,
    take: Number(limit)
  });

  return {
    orders,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get user orders
 */
const getUserOrders = async (userId, filters = {}) => {
  const { status, page = 1, limit = 10 } = filters;
  
  const skip = (page - 1) * limit;
  
  // Build where condition
  const where = { userId };
  
  if (status) {
    where.status = status;
  }

  // Get total count for pagination
  const total = await prisma.order.count({ where });
  
  // Get orders
  const orders = await prisma.order.findMany({
    where,
    include: {
      orderItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: true
            }
          }
        }
      },
      giftCard: {
        select: {
          id: true,
          name: true,
          price: true,
          image: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    skip,
    take: Number(limit)
  });

  return {
    orders,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Update order status (admin)
 */
const updateOrderStatus = async (orderId, statusData) => {
  const { status } = statusData;
  
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });
  
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  
  // Validate status transition
  const validTransitions = {
    PENDING: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [],
    CANCELLED: []
  };
  
  if (!validTransitions[order.status].includes(status)) {
    throw new AppError(`Cannot change order status from ${order.status} to ${status}`, 400);
  }
  
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: {
      orderItems: {
        include: {
          product: true
        }
      },
      giftCard: true
    }
  });
  
  return updatedOrder;
};

/**
 * Cancel order
 */
const cancelOrder = async (orderId, userId = null) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });
  
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  
  // Check if user is authorized to cancel the order
  if (userId && order.userId !== userId) {
    throw new AppError('You are not authorized to cancel this order', 403);
  }
  
  // Check if order can be cancelled
  if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
    throw new AppError(`Cannot cancel order with status ${order.status}`, 400);
  }
  
  // If order is paid, initiate refund
  if (order.paymentStatus === 'PAID' && order.paymentId) {
    try {
      await stripe.refunds.create({
        payment_intent: order.paymentId
      });
    } catch (error) {
      console.error('Refund error:', error);
      throw new AppError(`Failed to process refund: ${error.message}`, 500);
    }
  }
  
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { 
      status: 'CANCELLED',
      paymentStatus: order.paymentStatus === 'PAID' ? 'REFUNDED' : 'CANCELLED'
    },
    include: {
      orderItems: {
        include: {
          product: true
        }
      },
      giftCard: true
    }
  });
  
  return updatedOrder;
};

/**
 * Get order statistics (admin)
 */
const getOrderStats = async () => {
  // Get total orders count by status
  const statusCounts = await prisma.order.groupBy({
    by: ['status'],
    _count: true
  });
  
  // Get total revenue
  const revenue = await prisma.order.aggregate({
    where: {
      paymentStatus: 'PAID'
    },
    _sum: {
      totalPrice: true
    }
  });
  
  // Get recent orders
  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      orderItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      user: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  
  // Format status counts
  const formattedStatusCounts = {};
  statusCounts.forEach(item => {
    formattedStatusCounts[item.status] = item._count;
  });
  
  return {
    totalOrders: await prisma.order.count(),
    statusCounts: formattedStatusCounts,
    totalRevenue: revenue._sum.totalPrice || 0,
    recentOrders
  };
};

const OrderService = {
  createOrder,
  processPayment,
  getOrderById,
  getAllOrders,
  getUserOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
};

module.exports = { OrderService };
