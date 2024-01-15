// routes/shops.js
const express = require('express');
const { createDailyReport,
  getDailyReports,
  getDailyReportById,
  updateDailyReport,
  deleteDailyReport, } = require('../controllers/DailyReportController');

const router = express.Router();

router.get('/', getDailyReports);
router.get('/:id', getDailyReportById);
router.post('/', createDailyReport);
router.put('/:id', updateDailyReport);
router.delete('/:id', deleteDailyReport);

module.exports = router;