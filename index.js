// index.js

const express = require('express');
const app = express();
const cluster = require('cluster');
const os = require('os');
// const port = 5500;

const bet = require('./routes/bet');
const cors = require('cors');
const bettest = require('./routes/bettest');

const { Model } = require('./config/dbconfig');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const shopOwnersRoutes = require('./routes/shopOwnerRoutes');
const cashierRoutes = require('./routes/cashierRoutes');
const shopRoutes = require('./routes/shopRoutes');
const subAgentRoutes = require('./routes/subAgentRoutes');
const subAgentShopRoutes = require('./routes/subAgentShopRoutes');
const gameRoutes = require('./routes/gameRoutes');
const slipRoutes = require('./routes/slipsRoutes');
const dailyReportRoutes = require('./routes/dailyReportRoutes');
const adminController = require('./controllers/AdminController');
const CashierController = require('./controllers/CashierController');
const errorHandler = require('./middleware/errorHandlerMiddleware');

// Use this
const logger = require('./logger');
const argv = process.argv.slice(2);
const https = require('https');
const fs = require('fs');

var schedule = require('node-schedule');
const { generateDailyReport, getCurrentDate } = require('./controllers/DailyReportController');
const { resetGameNumber } = require('./controllers/GameController');
const { scheduleGameResults, processJobFromQueue } = require('./util/resultQueue');
// const { sendRequest, runTesting } = require('./loadTest');


// Middleware to parse JSON requests
app.use(express.json());

// Use cors middleware
app.use(cors({ origin: '*' }));

// runTesting();
// schedule.scheduleJob('0 50 16 * * * ', async function (){

// schedule.scheduleJob({ hour: 6, minute: 5, second: 0, tz: 'Africa/Nairobi' }, async function () {
//   const reset = await resetGameNumber();
//   console.log('reset' + new Date().toLocaleString());
// })
schedule.scheduleJob({ hour: 23, minute: 44, second: 0, tz: 'Africa/Nairobi' }, async function () {
  // schedule.scheduleJob({ hour: 22, minute: 52, second: 0, tz: 'Africa/Nairobi' }, async function () {
  // console.log('The answer to life, the universe, and everything!');
  const todayData = await generateDailyReport(getCurrentDate());
  logger.info(`Today report is generated! ${new Date().toLocaleString()}`);
  const resetAll = await CashierController.resetCashierLimit()
});

// if (cluster.isMaster) {
//   scheduleGameResults()
// }

app.get('/', async (req, res) => {
  res.json('welcome');
});
// app.use('/bet', bet);
// app.use('/bettest', bettest);
// app.get('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/shop-owners', shopOwnersRoutes);
app.use('/sub-agents', subAgentRoutes);
app.use('/sub-agent-shops', subAgentShopRoutes);
app.use('/shop', shopRoutes);
app.use('/cashiers', cashierRoutes);
app.use('/game', gameRoutes);
app.use('/slip', slipRoutes);
// app.get('/test', runTesting);
app.use('/dailyReport', dailyReportRoutes);

app.use(errorHandler)


// const PORT = process.env.PORT || 8443;
// const HOST = '0.0.0.0'; // This line ensures it listens on all interfaces
// app.listen(PORT, HOST, () => {
//   console.log(`Server is running at http://localhost:${PORT}`);
// });

if (cluster.isMaster) {
  // Run as master
  scheduleGameResults()

  // Create multiple worker instances
  // const numCPUs = os.cpus().length;
  const numCPUs = process.env.NUMCPU || 4;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });

  const PORT = process.env.PORT || 8443;
  const HOST = '0.0.0.0'; // This line ensures it listens on all interfaces
  app.listen(PORT, HOST, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
  // const options = {
  //   key: fs.readFileSync(process.env.CRT_KEY),
  //   cert: fs.readFileSync(process.env.CRT_CRT)
  // };

  // const server = https.createServer(options, app);
  // server.listen(PORT, () => {
  //   console.log(`Server is running on port ${PORT}`);
  //   logger.info(`Server is running on port http://localhost:${PORT}`);
  // });
} else {
  console.log('worker up and down!!!!!!!!!!!!!!!! ', process.pid);
  // Run as worker
  processJobFromQueue()
}

// const PORT = process.env.PORT || 8444;
// const options = {
//   key: fs.readFileSync('9ed2b_a89dd_282bc574495f8c6d40d10ea0f3360f0d.key'),
//   cert: fs.readFileSync('www_logic_rookmatetech_com_9ed2b_a89dd_1726566409_d192f168b8e74e1b8d4dd6b71abba7c2.crt')
// };

// const server = https.createServer(options, app);
// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   logger.info(`Server is running on port http://localhost:${PORT}`);
// });
