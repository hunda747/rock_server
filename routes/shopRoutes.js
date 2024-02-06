// routes/shops.js
const express = require('express');
const shopController = require('../controllers/ShopController');

const router = express.Router();

router.get('/', shopController.getAll);
router.get('/getByShopowner', shopController.getByShopowner);
router.get('/:id', shopController.getById);
router.post('/', shopController.create);
router.put('/:id', shopController.update);
router.delete('/:id', shopController.delete);

module.exports = router;
