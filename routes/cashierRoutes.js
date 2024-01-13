// routes/cashiers.js
const express = require('express');
const cashierController = require('../controllers/CashierController');

const router = express.Router();

router.get('/', cashierController.getAll);
router.get('/:id', cashierController.getById);
router.post('/', cashierController.create);
router.post('/extendCashierLimit', cashierController.extendCashierLimit);
router.put('/:id', cashierController.update);
router.delete('/:id', cashierController.delete);
router.post('/login', cashierController.login);
router.post('/changePassword', cashierController.changePassword);
router.post('/refresh', cashierController.refreshToken);

module.exports = router;
