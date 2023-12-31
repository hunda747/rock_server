// routes/index.js

const express = require('express');
const slipController = require('../controllers/SlipController');

const router = express.Router();

// Slips Routes
router.get('/', slipController.getAllSlips);
router.get('/getByGameNumber', slipController.getSlipByGamenumber);
router.get('/:id', slipController.getSlipById);
router.post('/', slipController.createSlip);
router.get('/getCashierReport/:cashierId', slipController.generateCashierReport);
router.get('/recallBetsReport/:cashierId', slipController.recallBetsReport);
router.put('/:id', slipController.updateSlip);
router.put('/cancelslip/:id/:gameNumber', slipController.cancelSlip);
router.put('/redeem/:id', slipController.redeemSlip);
router.delete('/:id', slipController.deleteSlip);

module.exports = router;
