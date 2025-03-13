const catchAsync = require('../../utils/catchAsync');
const sendResponse = require('../../utils/sendResponse');
const { ProductService } = require('./product.service');

const createProduct = catchAsync(async (req, res) => {
  const result = await ProductService.createProduct(req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Product created successfully',
    data: result,
  });
});

const getAllProducts = catchAsync(async (req, res) => {
  const result = await ProductService.getAllProducts(req.query);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Products retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getProductById = catchAsync(async (req, res) => {
  const result = await ProductService.getProductById(req.params.id);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Product retrieved successfully',
    data: result,
  });
});

const updateProduct = catchAsync(async (req, res) => {
  const result = await ProductService.updateProduct(req.params.id, req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Product updated successfully',
    data: result,
  });
});

const deleteProduct = catchAsync(async (req, res) => {
  await ProductService.deleteProduct(req.params.id);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Product deleted successfully',
  });
});

const addReview = catchAsync(async (req, res) => {
  const { id: productId } = req.params;
  const userId = req.user.id;
  
  const result = await ProductService.addReview(productId, userId, req.body);
  
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Review added successfully',
    data: result,
  });
});

const getProductReviews = catchAsync(async (req, res) => {
  const result = await ProductService.getProductReviews(req.params.id);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Reviews retrieved successfully',
    data: result,
  });
});

const getRelatedProducts = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { limit } = req.query;
  
  const result = await ProductService.getRelatedProducts(id, limit);
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Related products retrieved successfully',
    data: result,
  });
});

const getFilterOptions = catchAsync(async (req, res) => {
  const result = await ProductService.getFilterOptions();
  
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Filter options retrieved successfully',
    data: result,
  });
});



const ProductController = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addReview,
  getProductReviews,
  getRelatedProducts,
  getFilterOptions
};

module.exports = { ProductController }; 