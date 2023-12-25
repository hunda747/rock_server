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
const adminController = require('./controllers/AdminController');

// Middleware to parse JSON requests
app.use(express.json());

// Use cors middleware
app.use(cors());

app.get('/', async (req, res) => {
  res.json('welcome');
});
app.use('/bet', bet);
app.use('/bettest', bettest);
// app.get('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/shop-owners', adminController.verifyAccessToken, shopOwnersRoutes);
app.use('/shop', adminController.verifyAccessToken, shopRoutes);
app.use('/cashiers', adminController.verifyAccessToken, cashierRoutes);
app.use('/game', gameRoutes);
app.use('/slip', adminController.verifyAccessToken, slipRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
