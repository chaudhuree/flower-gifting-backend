const express = require('express');
const auth = require('../../middlewares/auth');
const { 
  createPackage,
  getPackages
} = require('./package.controller');

const router = express.Router();

router.post(
  '/create',
  auth('ADMIN'),
  createPackage
);

router.get(
  '/',
  getPackages
);

module.exports = router; 