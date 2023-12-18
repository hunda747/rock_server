// index.js

const express = require('express');
const app = express();
const port = 5500;

const { Model } = require('./config/dbconfig');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bet = require('./routes/bet');
const shopOwnersRoutes = require('./routes/shopOwnerRoutes');
const shopRoutes = require('./routes/shopRoutes');
const cashierRoutes = require('./routes/cashierRoutes');

const adminController = require('./controllers/AdminController');

// Middleware to parse JSON requests
app.use(express.json());

app.get('/', async (req, res) => {
  res.json('welcome');
});
app.use('/bet', bet);
// app.get('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/shop-owners', adminController.verifyAccessToken, shopOwnersRoutes);
app.use('/shop', adminController.verifyAccessToken, shopRoutes);
app.use('/cashiers', adminController.verifyAccessToken, cashierRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
