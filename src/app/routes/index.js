const express = require('express');
const router = express.Router();
const userRoutes = require('../modules/user/user.routes');
const productRoutes = require('../modules/product/product.routes');
const giftCardRoutes = require('../modules/giftcard/giftcard.routes');

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
    }
]

modulesRoutes.forEach(route => {
    router.use(route.path, route.route);
})

module.exports = router;
