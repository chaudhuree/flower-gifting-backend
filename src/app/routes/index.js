const express = require('express');
const router = express.Router();
const userRoutes = require('../modules/user/user.routes');
const productRoutes = require('../modules/product/product.routes');
const giftCardRoutes = require('../modules/giftcard/giftcard.routes');
const fileRoutes = require('../modules/file/file.routes');
const orderRoutes = require('../modules/order/order.routes');

const modulesRoutes = [
    {
        path: '/users',
        route: userRoutes
    },
    {
        path: '/products',
        route: productRoutes
    },
    {
        path: '/gift-cards',
        route: giftCardRoutes
    },
    {
        path: '/files',
        route: fileRoutes
    },
    {
        path: '/orders',
        route: orderRoutes
    }
]

modulesRoutes.forEach(route => {
    router.use(route.path, route.route);
})

module.exports = router;
