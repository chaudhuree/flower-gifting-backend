const express = require('express');
const { GiftCardController } = require('./giftcard.controller');
const auth = require('../../middlewares/auth');
const { RoleEnum } = require('@prisma/client');

const router = express.Router();

// Public routes
router.get('/', GiftCardController.getAllGiftCards);
router.get('/:id', GiftCardController.getGiftCardById);

// Protected routes (admin only)
router.post('/', auth(RoleEnum.ADMIN), GiftCardController.createGiftCard);
router.patch('/:id', auth(RoleEnum.ADMIN), GiftCardController.updateGiftCard);
router.delete('/:id', auth(RoleEnum.ADMIN), GiftCardController.deleteGiftCard);

module.exports = router; 