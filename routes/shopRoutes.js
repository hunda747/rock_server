// routes/shops.js
const express = require('express');
const shopController = require('../controllers/ShopController');
const { authenticateToken, checkUserRole, authenticateRefreshToken } = require('../middleware/authHandler');

const router = express.Router();

router.get('/', shopController.getAll);
router.get('/getByShopowner/:id', shopController.getByShopowner);
router.get('/:id', shopController.getById);
router.post('/', shopController.create);
router.put('/:id', shopController.update);
router.post('/login', shopController.login);
router.post('/changePassword', shopController.changePassword);
router.post('/changeOwnPassword/:id', shopController.changeOwnPassword);
router.post('/refresh', authenticateRefreshToken, checkUserRole(['shop']), shopController.refreshToken);
router.delete('/:id', shopController.delete);

module.exports = router;
