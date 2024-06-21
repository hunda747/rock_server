const Queue = require('bull');
const { generateDailyReport } = require('../controllers/DailyReportController');
const reportQueue = new Queue('reportQueue', 'redis://127.0.0.1:6379');

// Function to add a job to the queue
const addReportJob = async (shopId, reportDate) => {
  console.log("adding job ", shopId, reportDate);
  await reportQueue.add({ shopId, reportDate });
};

reportQueue.process(10, async (job) => { // '10' denotes concurrency level
  const { shopId, reportDate } = job.data;
  console.log("start job for shop ", shopId);
  await generateDailyReport(shopId, reportDate);
});

module.exports = { addReportJob }