const Queue = require('bull');
const { generateDailyReport } = require('../controllers/DailyReportController');
const reportQueue = new Queue('reportQueue', 'redis://127.0.0.1:6379');

// Function to add a job to the queue
const addReportJob = async (shopId, reportDate) => {
  console.log("adding job ", shopId, reportDate);
  // Add a job to the queue for generating the daily report asynchronously
  reportQueue.add({ shopId, reportDate }).catch(err => {
    console.error(`Failed to add job for shopId: ${shopId} on ${reportDate}`, err);
  });
};

reportQueue.process(async (job) => {
  const { shopId, reportDate } = job.data;
  console.log("start job for shop ", shopId);
  try {
    await generateDailyReport(reportDate, shopId);
    // const report = await generateDailyReport(shopId, reportDate);
    // return report;
  } catch (error) {
    throw new Error(error);
  }
});

reportQueue.on('completed', (job) => {
  console.log(`Job completed with result`);
});

reportQueue.on('failed', (job, err) => {
  console.log(`Job failed with error ${err}`);
});

module.exports = { addReportJob }