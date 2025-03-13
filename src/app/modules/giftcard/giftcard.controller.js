const catchAsync = require('../../utils/catchAsync');
const sendResponse = require('../../utils/sendResponse');
const { GiftCardService } = require('./giftcard.service');

const createGiftCard = catchAsync(async (req, res) => {
  const result = await GiftCardService.createGiftCard(req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Gift card created successfully',
    data: result,
  });
});

const getAllGiftCards = catchAsync(async (req, res) => {
  const result = await GiftCardService.getAllGiftCards(req.query);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Gift cards retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getGiftCardById = catchAsync(async (req, res) => {
  const result = await GiftCardService.getGiftCardById(req.params.id);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Gift card retrieved successfully',
    data: result,
  });
});

const updateGiftCard = catchAsync(async (req, res) => {
  const result = await GiftCardService.updateGiftCard(req.params.id, req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Gift card updated successfully',
    data: result,
  });
});

const deleteGiftCard = catchAsync(async (req, res) => {
  await GiftCardService.deleteGiftCard(req.params.id);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Gift card deleted successfully',
  });
});

const GiftCardController = {
  createGiftCard,
  getAllGiftCards,
  getGiftCardById,
  updateGiftCard,
  deleteGiftCard
};

module.exports = { GiftCardController }; 