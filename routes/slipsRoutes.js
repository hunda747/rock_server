// routes/index.js

const express = require('express');
const slipController = require('../controllers/SlipController');

const router = express.Router();

// Slips Routes
router.get('/slips', slipController.getAllSlips);
router.get('/slips/:id', slipController.getSlipById);
router.post('/slips', slipController.createSlip);
router.put('/slips/:id', slipController.updateSlip);
router.delete('/slips/:id', slipController.deleteSlip);

module.exports = router;
