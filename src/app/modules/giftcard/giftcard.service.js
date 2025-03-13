const prisma = require('../../utils/prisma');
const AppError = require('../../errors/AppError');

const createGiftCard = async (giftCardData) => {
  const result = await prisma.giftCard.create({
    data: giftCardData
  });

  return result;
};

const getAllGiftCards = async (query) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search
  } = query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Build filter conditions
  const whereConditions = {};
  
  if (search) {
    whereConditions.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Get gift cards with pagination
  const giftCards = await prisma.giftCard.findMany({
    where: whereConditions,
    skip,
    take,
    orderBy: {
      [sortBy]: sortOrder
    }
  });

  // Get total count for pagination
  const total = await prisma.giftCard.count({ where: whereConditions });

  return {
    meta: {
      page: parseInt(page),
      limit: parseInt(limit),
      total
    },
    data: giftCards
  };
};

const getGiftCardById = async (giftCardId) => {
  const giftCard = await prisma.giftCard.findUnique({
    where: {
      id: giftCardId
    }
  });

  if (!giftCard) {
    throw new AppError('Gift card not found', 404);
  }

  return giftCard;
};

const updateGiftCard = async (giftCardId, updateData) => {
  const giftCard = await prisma.giftCard.findUnique({
    where: {
      id: giftCardId
    }
  });

  if (!giftCard) {
    throw new AppError('Gift card not found', 404);
  }

  const result = await prisma.giftCard.update({
    where: {
      id: giftCardId
    },
    data: updateData
  });

  return result;
};

const deleteGiftCard = async (giftCardId) => {
  const giftCard = await prisma.giftCard.findUnique({
    where: {
      id: giftCardId
    }
  });

  if (!giftCard) {
    throw new AppError('Gift card not found', 404);
  }

  await prisma.giftCard.delete({
    where: {
      id: giftCardId
    }
  });

  return null;
};

const GiftCardService = {
  createGiftCard,
  getAllGiftCards,
  getGiftCardById,
  updateGiftCard,
  deleteGiftCard
};

module.exports = { GiftCardService }; 