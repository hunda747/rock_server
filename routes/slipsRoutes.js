// routes/index.js

const express = require('express');
const slipController = require('../controllers/SlipController');

const router = express.Router();

// Slips Routes
router.post('/getSlip', slipController.getAllSlips);
router.get('/generateDetailCashierReport', slipController.generateDetailCashierReport);
router.get('/getByGameNumber', slipController.getSlipByGamenumber);
router.get('/:id', slipController.getSlipById);
router.get('/getCashierReport/:cashierId', slipController.generateCashierReport);
router.get('/recallBetsReport/:cashierId', slipController.recallBetsReport);
router.post('/', slipController.createSlip);
router.put('/:id', slipController.updateSlip);
router.put('/cancelslip/:id/:gameNumber', slipController.cancelSlip);
router.put('/redeem/:id', slipController.redeemSlip);
router.delete('/:id', slipController.deleteSlip);

module.exports = router;
