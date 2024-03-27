// index.js

const express = require('express');
const app = express();
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

const https = require('https');
const fs = require('fs');

// const options = {
//   key: fs.readFileSync('/root/a74fb_701b5_5736dbd729c291724b6a1d08f0995c64.key'),
//   cert: fs.readFileSync('/root/logic_rookmatetech_com_a74fb_701b5_1718755199_80fab4015b234552a7ff7bc8f8acb967.crt')
// };


var schedule = require('node-schedule');
const { generateDailyReport, getCurrentDate } = require('./controllers/DailyReportController');

// Middleware to parse JSON requests
app.use(express.json());

// Use cors middleware
app.use(cors({ origin: '*' }));

// schedule.scheduleJob('0 50 16 * * * ', async function (){
// schedule.scheduleJob('0 44 23 * * * ', async function (){
schedule.scheduleJob({ hour: 23, minute: 44, second: 0, tz: 'Africa/Nairobi' }, async function () {
  // schedule.scheduleJob({ hour: 22, minute: 52, second: 0, tz: 'Africa/Nairobi' }, async function () {
  // console.log('The answer to life, the universe, and everything!');
  const todayData = await generateDailyReport(getCurrentDate());
  logger.info(`Today report is generated! ${new Date().toLocaleString()}`);
  const resetAll = await CashierController.resetCashierLimit()
});

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
app.use('/dailyReport', dailyReportRoutes);


app.use(errorHandler)


// Create HTTPS server
// const PORT = process.env.PORT || 443;
const PORT = process.env.PORT || 8800;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
// const server = https.createServer(options, app);
// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   logger.info(`Server is running on port http://localhost:${PORT}`);
// });
