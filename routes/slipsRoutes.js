// routes/index.js

const express = require('express');
const slipController = require('../controllers/SlipController');

const router = express.Router();

// Slips Routes
router.get('/', slipController.getAllSlips);
router.get('/:id', slipController.getSlipById);
router.post('/', slipController.createSlip);
router.put('/:id', slipController.updateSlip);
router.delete('/:id', slipController.deleteSlip);

module.exports = router;
