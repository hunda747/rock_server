// routes/shops.js
const express = require('express');
const { createDailyReport,
  getDailyReports,
  getDailyReportById,
  generateShopReport,
  generateCashierReport,
  deleteDailyReport, } = require('../controllers/DailyReportController');

const router = express.Router();

router.get('/generateShopReport', generateShopReport);
router.get('/generateCashierReport', generateCashierReport);
router.get('/', getDailyReports);
router.get('/:id', getDailyReportById);
router.post('/', createDailyReport);
router.delete('/:id', deleteDailyReport);

module.exports = router;