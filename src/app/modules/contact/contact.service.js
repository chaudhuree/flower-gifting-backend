const prisma = require('../../utils/prisma');
const AppError = require('../../errors/AppError');

const createContact = async (contactData) => {
  const { name, email, message } = contactData;

  if (!name || !email || !message) {
    throw new AppError('Name, email and message are required', 400);
  }

  const contact = await prisma.contact.create({
    data: {
      name,
      email,
      message
    }
  });

  return contact;
};

const getAllContacts = async (query) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search
  } = query;

  // Calculate skip value for pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Build where condition for search
  const whereCondition = {};
  if (search) {
    whereCondition.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { message: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Build orderBy condition
  const orderBy = {};
  orderBy[sortBy] = sortOrder;

  // Get total count for pagination
  const total = await prisma.contact.count({
    where: whereCondition
  });

  // Get paginated data
  const contacts = await prisma.contact.findMany({
    where: whereCondition,
    orderBy,
    skip,
    take: Number(limit)
  });

  // Calculate pagination info
  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    data: contacts,
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

const getContactById = async (id) => {
  const contact = await prisma.contact.findUnique({
    where: { id }
  });

  if (!contact) {
    throw new AppError('Contact not found', 404);
  }

  return contact;
};

const deleteContact = async (id) => {
  const contact = await prisma.contact.findUnique({
    where: { id }
  });

  if (!contact) {
    throw new AppError('Contact not found', 404);
  }

  await prisma.contact.delete({
    where: { id }
  });

  return contact;
};

const updateSeenStatus = async (id) => {
  const contact = await prisma.contact.findUnique({
    where: { id }
  });

  if (!contact) {
    throw new AppError('Contact not found', 404);
  }

  const updatedContact = await prisma.contact.update({
    where: { id },
    data: {
      seen: true
    }
  });

  return updatedContact;
};

const getContactStats = async () => {
  const stats = await prisma.$transaction([
    // Total contacts
    prisma.contact.count(),
    // Unread contacts
    prisma.contact.count({
      where: { seen: false }
    }),
    // Today's contacts
    prisma.contact.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    }),
    // Last 7 days contacts
    prisma.contact.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    })
  ]);

  return {
    total: stats[0],
    unread: stats[1],
    today: stats[2],
    lastSevenDays: stats[3]
  };
};

const getUnreadContacts = async (query) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query;

  const skip = (Number(page) - 1) * Number(limit);
  const whereCondition = { seen: false };

  const total = await prisma.contact.count({
    where: whereCondition
  });

  const contacts = await prisma.contact.findMany({
    where: whereCondition,
    orderBy: { [sortBy]: sortOrder },
    skip,
    take: Number(limit)
  });

  return {
    data: contacts,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      hasNextPage: page < Math.ceil(total / Number(limit)),
      hasPreviousPage: page > 1
    }
  };
};

const markAllAsRead = async () => {
  await prisma.contact.updateMany({
    where: { seen: false },
    data: { seen: true }
  });

  return { message: 'All contacts marked as read' };
};

module.exports = {
  createContact,
  getAllContacts,
  getContactById,
  deleteContact,
  updateSeenStatus,
  getContactStats,
  getUnreadContacts,
  markAllAsRead
}; 