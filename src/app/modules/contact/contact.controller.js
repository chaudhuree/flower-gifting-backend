const catchAsync = require('../../utils/catchAsync');
const sendResponse = require('../../utils/sendResponse');
const contactService = require('./contact.service');

const createContact = catchAsync(async (req, res) => {
  const result = await contactService.createContact(req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Contact message sent successfully',
    data: result
  });
});

const getAllContacts = catchAsync(async (req, res) => {
  const result = await contactService.getAllContacts(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Contacts retrieved successfully',
    meta: result.meta,
    data: result.data
  });
});

const getContactById = catchAsync(async (req, res) => {
  const result = await contactService.getContactById(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Contact retrieved successfully',
    data: result
  });
});

const deleteContact = catchAsync(async (req, res) => {
  const result = await contactService.deleteContact(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Contact deleted successfully',
    data: result
  });
});

const updateSeenStatus = catchAsync(async (req, res) => {
  const result = await contactService.updateSeenStatus(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Contact marked as seen',
    data: result
  });
});

const getContactStats = catchAsync(async (req, res) => {
  const result = await contactService.getContactStats();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Contact statistics retrieved successfully',
    data: result
  });
});

const getUnreadContacts = catchAsync(async (req, res) => {
  const result = await contactService.getUnreadContacts(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Unread contacts retrieved successfully',
    meta: result.meta,
    data: result.data
  });
});

const markAllAsRead = catchAsync(async (req, res) => {
  const result = await contactService.markAllAsRead();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'All contacts marked as read',
    data: result
  });
});

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