// index.js

const express = require('express');
const serverless = require('serverless-http')
const app = express();
const port = 5500;

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
  console.log('The answer to life, the universe, and everything!');
  const todayData = await generateDailyReport(getCurrentDate());
  console.log('Today report is generated!');
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

// Start the server
// app.listen(port, () => {
//   console.log(`Server is running at http://localhost:${port}`);
// });
module.exports = app;
// module.exports.handler = serverless(app)