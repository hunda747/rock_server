// routes/shops.js
const express = require('express');
const { createDailyReport,
  getDailyReports,
  getDailyReportById,
  generateShopReport,
  generateCashierReport,
  generateShopAgentReport,
  generateShopCount,
  deleteDailyReport, } = require('../controllers/DailyReportController');

const router = express.Router();

router.post('/generateShopReport', generateShopReport);
router.post('/generateCashierReport', generateCashierReport);
router.post('/generateShopAgentReport', generateShopAgentReport);
router.get('/generateShopCount', generateShopCount);
router.get('/', getDailyReports);
router.get('/:id', getDailyReportById);
router.post('/', createDailyReport);
router.delete('/:id', deleteDailyReport);

module.exports = router;