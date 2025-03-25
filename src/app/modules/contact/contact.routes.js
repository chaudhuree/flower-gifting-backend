const express = require('express');
const auth = require('../../middlewares/auth');
const { RoleEnum } = require('@prisma/client');
const {
  createContact,
  getAllContacts,
  getContactById,
  deleteContact,
  updateSeenStatus,
  getContactStats,
  getUnreadContacts,
  markAllAsRead
} = require('./contact.controller');

const router = express.Router();

// Public route for creating contact
router.post('/create', createContact);

// Admin routes - Fixed order with specific routes first
router.get('/all-contacts', auth(RoleEnum.ADMIN), getAllContacts);
router.get('/unread', auth(RoleEnum.ADMIN), getUnreadContacts);
router.get('/stats', auth(RoleEnum.ADMIN), getContactStats);
router.post('/mark-all-read', auth(RoleEnum.ADMIN), markAllAsRead); // Changed to POST and moved before /:id routes

// Routes with parameters should come last
router.patch('/:id/seen', auth(RoleEnum.ADMIN), updateSeenStatus);
router.get('/:id', auth(RoleEnum.ADMIN), getContactById);
router.delete('/:id', auth(RoleEnum.ADMIN), deleteContact);

module.exports = router; 