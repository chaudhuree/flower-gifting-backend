const express = require('express');
const { UserController } = require('./user.controller');
const auth = require('../../middlewares/auth');
const { RoleEnum } = require('@prisma/client');

const router = express.Router();

// Public routes
router.post('/register', UserController.createUser);
router.post('/login', UserController.loginUser);
router.post('/forgot-password', UserController.forgotPassword);
router.post('/reset-password', UserController.resetPassword);

// Protected routes
router.patch('/profile', auth(), UserController.updateProfile);
router.patch('/change-password', auth(), UserController.changePassword);
router.patch('/:id/role', auth(RoleEnum.ADMIN), UserController.updateRole);
router.delete('/:id', auth(RoleEnum.ADMIN), UserController.deleteUser);

module.exports = router;
