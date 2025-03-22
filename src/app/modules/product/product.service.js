const prisma = require('../../utils/prisma');
const AppError = require('../../errors/AppError');

const createProduct = async (productData) => {
  const result = await prisma.product.create({
    data: productData
  });

  return result;
};

const getAllProducts = async (query) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    category,
    occasion,
    flowerType,
    minPrice,
    maxPrice,
    search
  } = query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Build filter conditions
  const whereConditions = {};
  
  if (category) {
    whereConditions.category = category;
  }
  
  if (occasion) {
    whereConditions.occasions = {
      has: occasion
    };
  }
  
  if (flowerType) {
    whereConditions.flowerType = flowerType;
  }
  
  // Fix price filtering logic
  if (minPrice !== undefined || maxPrice !== undefined) {
    whereConditions.price = {};
    
    // Only add gte if minPrice is a valid number
    if (minPrice !== undefined && !isNaN(parseFloat(minPrice))) {
      whereConditions.price.gte = parseFloat(minPrice);
    }
    
    // Only add lte if maxPrice is a valid number
    if (maxPrice !== undefined && !isNaN(parseFloat(maxPrice))) {
      whereConditions.price.lte = parseFloat(maxPrice);
    }
    
    // Remove price condition if both values are invalid
    if (Object.keys(whereConditions.price).length === 0) {
      delete whereConditions.price;
    }
  }
  
  if (search) {
    whereConditions.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Get products with pagination
  const products = await prisma.product.findMany({
    where: whereConditions,
    skip,
    take,
    orderBy: {
      [sortBy]: sortOrder
    },
    include: {
      reviews: {
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  // Get total count for pagination
  const total = await prisma.product.count({ where: whereConditions });

  return {
    meta: {
      page: parseInt(page),
      limit: parseInt(limit),
      total
    },
    data: products
  };
};

const getProductById = async (productId) => {
  const product = await prisma.product.findUnique({
    where: {
      id: productId
    },
    include: {
      reviews: {
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return product;
};

const updateProduct = async (productId, updateData) => {
  const product = await prisma.product.findUnique({
    where: {
      id: productId
    }
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const result = await prisma.product.update({
    where: {
      id: productId
    },
    data: updateData
  });

  return result;
};

const deleteProduct = async (productId) => {
  const product = await prisma.product.findUnique({
    where: {
      id: productId
    }
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  await prisma.product.delete({
    where: {
      id: productId
    }
  });

  return null;
};

const addReview = async (productId, userId, reviewData) => {
  const product = await prisma.product.findUnique({
    where: {
      id: productId
    },
    include: {
      reviews: true
    }
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check if user already reviewed this product
  const existingReview = await prisma.review.findFirst({
    where: {
      productId,
      userId
    }
  });

  if (existingReview) {
    throw new AppError('You have already reviewed this product', 400);
  }

  // Create the review
  const review = await prisma.review.create({
    data: {
      rating: reviewData.rating,
      comment: reviewData.comment,
      userId,
      productId
    },
    include: {
      user: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  // Update product rating
  const allReviews = [...product.reviews, { rating: reviewData.rating }];
  const averageRating = allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length;

  await prisma.product.update({
    where: {
      id: productId
    },
    data: {
      rating: averageRating
    }
  });

  return review;
};

const getProductReviews = async (productId) => {
  const product = await prisma.product.findUnique({
    where: {
      id: productId
    }
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const reviews = await prisma.review.findMany({
    where: {
      productId
    },
    include: {
      user: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return reviews;
};

const getRelatedProducts = async (productId, limit = 4) => {
  const product = await prisma.product.findUnique({
    where: {
      id: productId
    },
    select: {
      id: true,
      category: true,
      occasions: true,
      flowerType: true
    }
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Find products with similar attributes, excluding the current product
  const whereConditions = {
    id: {
      not: productId
    },
    OR: []
  };

  // Add category match condition
  if (product.category) {
    whereConditions.OR.push({ category: product.category });
  }

  // Add occasions match condition - find products that share at least one occasion
  if (product.occasions && product.occasions.length > 0) {
    whereConditions.OR.push({ 
      occasions: {
        hasSome: product.occasions
      }
    });
  }

  // Add flowerType match condition
  if (product.flowerType) {
    whereConditions.OR.push({ flowerType: product.flowerType });
  }

  const relatedProducts = await prisma.product.findMany({
    where: whereConditions,
    take: parseInt(limit),
    orderBy: {
      rating: 'desc'
    },
    include: {
      reviews: {
        select: {
          rating: true
        }
      }
    }
  });

  return relatedProducts;
};

const getFilterOptions = async () => {
  // Get unique categories
  const categoriesResult = await prisma.product.findMany({
    select: {
      category: true
    },
    distinct: ['category']
  });
  const categories = categoriesResult.map(item => item.category);

  // Get all occasions from all products
  const productsWithOccasions = await prisma.product.findMany({
    select: {
      occasions: true
    }
  });
  
  // Flatten the array of arrays and get unique values
  const occasions = [...new Set(
    productsWithOccasions
      .flatMap(product => product.occasions)
      .filter(Boolean)
  )];

  // Get unique flower types
  const flowerTypesResult = await prisma.product.findMany({
    select: {
      flowerType: true
    },
    distinct: ['flowerType'],
    where: {
      flowerType: {
        not: null
      }
    }
  });
  const flowerTypes = flowerTypesResult.map(item => item.flowerType).filter(Boolean);

  // Get price range
  const priceRange = await prisma.$queryRaw`
    SELECT 
      MIN(price) as minPrice, 
      MAX(price) as maxPrice 
    FROM products
  `;

  return {
    categories,
    occasions,
    flowerTypes,
    priceRange: priceRange[0]
  };
};

const ProductService = {
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

module.exports = { ProductService }; 