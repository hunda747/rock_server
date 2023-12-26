// controllers/CashierController.js
const Cashier = require('../models/cashier');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const AuthController = require('./AuthController');

class CashierController {
  constructor() {
    this.generateAccessToken = this.generateAccessToken.bind(this);
    this.generateRefreshToken = this.generateRefreshToken.bind(this);
    this.login = this.login.bind(this);
    this.verifyAccessToken = this.verifyAccessToken.bind(this);
    // ... (other bindings as needed)
  }

  async getAll(req, res) {
    try {
      const cashiers = await Cashier.query();
      res.json(cashiers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getById(req, res) {
    const { id } = req.params;
    try {
      const cashier = await Cashier.query().findById(id).withGraphFetched('shop');
      if (cashier) {
        res.json(cashier);
      } else {
        res.status(404).json({ error: 'Cashier not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async create(req, res) {
    const cashierData = req.body;

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(cashierData.password, 10);
    cashierData.password = hashedPassword;

    try {
      const newCashier = await Cashier.query().insert(cashierData);
      res.json(newCashier);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async update(req, res) {
    const { id } = req.params;
    const updatedData = req.body;
    try {
      const updatedCashier = await Cashier.query().patchAndFetchById(id, updatedData);
      if (updatedCashier) {
        res.json(updatedCashier);
      } else {
        res.status(404).json({ error: 'Cashier not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async delete(req, res) {
    const { id } = req.params;
    try {
      const deletedCount = await Cashier.query().deleteById(id);
      if (deletedCount > 0) {
        res.json({ message: 'Cashier deleted successfully' });
      } else {
        res.status(404).json({ error: 'Cashier not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  generateAccessToken(cashierId) {
    return jwt.sign({ cashierId }, 'your_access_secret_key', { expiresIn: '15m' });
  }

  generateRefreshToken() {
    return uuidv4();
  }

  async login(req, res) {
    const { username, password } = req.body;
    console.log(username, password);
    try {
      const cashier = await Cashier.query().findOne({ username });

      if (!cashier || !(await bcrypt.compare(password, cashier.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      console.log('found', cashier);

      // Generate tokens upon successful login
      const accessToken = this.generateAccessToken(cashier.id);
      const refreshToken = this.generateRefreshToken();

      // Store the refresh token (you may want to store it securely in a database)
      // For demonstration purposes, we're just attaching it to the response header
      res.header('Refresh-Token', refreshToken);

      res.json({ accessToken, refreshToken, id: cashier.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async changePassword(req, res) {
    req.model = Cashier; // Set the model for the AuthController
    AuthController.changePassword(req, res);
  }

  // Middleware to verify the access token
  verifyAccessToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token not provided' });
    }

    jwt.verify(token, 'your_access_secret_key', (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid access token' });
      }

      req.cashierId = decoded.cashierId;
      next();
    });
  }

  // controllers/CashierController.js
  async refreshToken(req, res) {
    const { refreshToken } = req.body;

    try {
      // Verify the refresh token
      const decodedRefreshToken = this.verifyRefreshToken(refreshToken);

      if (!decodedRefreshToken) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // Generate a new access token
      const newAccessToken = this.generateAccessToken(decodedRefreshToken.cashierId);

      res.json({ accessToken: newAccessToken });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Verify the refresh token
  verifyRefreshToken(refreshToken) {
    try {
      // You may want to store and verify the refresh token securely
      // For demonstration purposes, we're just verifying it using jwt.verify
      const decoded = jwt.verify(refreshToken, 'your_refresh_secret_key');
      return decoded;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}

module.exports = new CashierController();
