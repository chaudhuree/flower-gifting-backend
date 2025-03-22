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
  const packages = await prisma.package.findMany();
  
  // Fetch and format prices for each package
  const packagesWithPrices = await Promise.all(
    packages.map(async (pkg) => {
      const prices = await stripe.prices.list({
        product: pkg.stripeProductId,
        active: true
      });
      
      return {
        ...pkg,
        prices: formatPrices(prices)
      };
    })
  );
  
  return packagesWithPrices;
};

const createPackage = async (packageData) => {
  const { name, description, price, stripeProductId } = packageData;
  
  const package = await prisma.package.create({
    data: {
      name,
      description,
      price,
      stripeProductId
    }
  });
  
  return package;
};

// ... other service methods

module.exports = {
  getPackages,
  createPackage
}; 