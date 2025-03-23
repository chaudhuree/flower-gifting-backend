const prisma = require('../../utils/prisma');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AppError = require('../../errors/AppError');

const formatPrices = (prices) => {
  return prices.data.map(price => ({
    priceId: price.id,
    nickname: price.nickname,
    interval: price.recurring.interval,
    intervalCount: price.recurring.interval_count,
    amount: price.unit_amount / 100 // Convert cents to dollars
  }));
};

const getPackages = async () => {
  const packages = await prisma.package.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  // Fetch prices for each package from Stripe
  const packagesWithPrices = await Promise.all(
    packages.map(async (pkg) => {
      const prices = await stripe.prices.list({
        product: pkg.stripeProductId,
        active: true
      });
      
      const formattedPrices = formatPrices(prices);
      
      return {
        ...pkg,
        prices: formattedPrices
      };
    })
  );
  
  return packagesWithPrices;
};

const createPackage = async (packageData) => {
  const { name, description, basePrice, stripeProductId, image } = packageData;
  
  // Validate stripe product ID exists
  try {
    await stripe.products.retrieve(stripeProductId);
  } catch (error) {
    throw new AppError('Invalid Stripe Product ID', 400);
  }
  
  // Create package in database
  const newPackage = await prisma.package.create({
    data: {
      name,
      description,
      basePrice: parseFloat(basePrice),
      stripeProductId,
      image
    }
  });
  
  return newPackage;
};

const getPackageById = async (id) => {  
  const package = await prisma.package.findUnique({
    where: { id }
  });
  // fetch prices for the package from stripe
  const prices = await stripe.prices.list({
    product: package.stripeProductId,
    active: true
  });
  const formattedPrices = formatPrices(prices);
  package.prices = formattedPrices;

  return {
    ...package,
    prices: formattedPrices
  };
};


module.exports = {
  getPackages,
  createPackage,
  getPackageById
}; 