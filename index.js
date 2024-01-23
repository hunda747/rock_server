// index.js

const express = require('express');
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
const gameRoutes = require('./routes/gameRoutes');
const slipRoutes = require('./routes/slipsRoutes');
const dailyReportRoutes = require('./routes/dailyReportRoutes');
const adminController = require('./controllers/AdminController');
const errorHandler = require('./middleware/errorHandlerMiddleware');

var schedule = require('node-schedule');  
const { generateDailyReport, getCurrentDate } = require('./controllers/DailyReportController');

// Middleware to parse JSON requests
app.use(express.json());

// Use cors middleware
app.use(cors({ origin: '*' }));

// schedule.scheduleJob('0 44 23 * * * ', async function (){
schedule.scheduleJob('0 50 16 * * * ', async function (){
  console.log('The answer to life, the universe, and everything!');
  const todayData = await generateDailyReport(getCurrentDate());
  console.log('Today report is generated!');

});

app.get('/', async (req, res) => {
  res.json('welcome');
});
app.use('/bet', bet);
app.use('/bettest', bettest);
// app.get('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/shop-owners', shopOwnersRoutes);
app.use('/shop', shopRoutes);
app.use('/cashiers', cashierRoutes);
app.use('/game', gameRoutes);
app.use('/slip', slipRoutes);
app.use('/dailyReport', dailyReportRoutes);


app.use(errorHandler)

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
