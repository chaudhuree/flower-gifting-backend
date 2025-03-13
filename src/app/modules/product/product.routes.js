const express = require('express');
const { ProductController } = require('./product.controller');
const auth = require('../../middlewares/auth');
const { RoleEnum } = require('@prisma/client');

const router = express.Router();

// Public routes
/**
 * @route GET /products
 * @description Get all products with filtering options
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10)
 * @query {string} sortBy - Field to sort by (default: createdAt)
 * @query {string} sortOrder - Sort order (asc/desc, default: desc)
 * @query {string} category - Filter by category
 * @query {string} occasion - Filter by occasion (will match products that have this occasion in their occasions array)
 * @query {string} flowerType - Filter by flower type
 * @query {number} minPrice - Filter by minimum price
 * @query {number} maxPrice - Filter by maximum price
 * @query {string} search - Search in name and description
 */
router.get('/', ProductController.getAllProducts);
router.get('/:id', ProductController.getProductById);
router.get('/:id/reviews', ProductController.getProductReviews);
router.get('/:id/related', ProductController.getRelatedProducts);

// Protected routes
router.post('/', auth(RoleEnum.ADMIN), ProductController.createProduct);
router.patch('/:id', auth(RoleEnum.ADMIN), ProductController.updateProduct);
router.delete('/:id', auth(RoleEnum.ADMIN), ProductController.deleteProduct);

// User can add review
router.post('/:id/reviews', auth(), ProductController.addReview);

module.exports = router; 