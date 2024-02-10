// subAgentController.js
const SubAgent = require('../models/subAgent'); // Import your SubAgent model
const SubAgentShop = require('../models/subAgentShop'); // Import your SubAgent model
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const AuthController = require('./AuthController');

// Create a new sub-agent
const createSubAgent = async (req, res) => {
  const adminData = req.body;
  try {
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    adminData.password = hashedPassword;

    const shops = adminData?.shops || [];
    delete adminData.shops;

    const subAgent = await SubAgent.query().insert(adminData);
    shops.map(async (item) => {
      console.log(item);
      console.log('fetch', item);
      const subAgentShop = await SubAgentShop.query().insert({
        "shopId": item,
        "subAgentId": subAgent.id
      })
    })

    res.status(201).json(subAgent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get all sub-agents
const getAllSubAgents = async (req, res) => {
  try {
    const subAgents = await SubAgent.query().withGraphFetched('sub_agent_shops').withGraphFetched('sub_agent_shops.[shop]');

    res.json(subAgents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get a specific sub-agent by ID
const getSubAgentById = async (req, res) => {
  const { id } = req.params;
  try {
    const subAgent = await SubAgent.query().findById(id);
    if (!subAgent) {
      return res.status(404).json({ error: 'Sub-agent not found' });
    }
    res.json(subAgent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get a specific shop owner by ID
const getSubAgentByShopOwner = async (req, res) => {
  const { id } = req.params;
  try {
    const subAgent = await SubAgent.query().where({ shopOwnerId: id });
    if (!subAgent) {
      return res.status(404).json({ error: 'Sub-agent not found' });
    }
    res.json(subAgent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getCashiersBySubAgentId = async (req, res) => {
  const { subAgentId } = req.params;
  try {
    const subAgent = await SubAgent.query().findById(subAgentId).withGraphFetched('owner.[shops.cashiers]').withGraphFetched('owner.[shops]');

    if (subAgent) {
      const cashiers = subAgent.owner.shops.flatMap(shop => {
        return shop.cashiers.map(cashier => ({
          ...cashier,
          shop: shop // Include shop information in the response
        }));
      });
      res.json(cashiers);
    } else {
      res.status(404).json({ error: "Sub-agent not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Update a sub-agent by ID
const updateSubAgentById = async (req, res) => {
  const { id } = req.params;
  const { name, username, shops } = req.body;
  console.log(shops);
  console.log(shops.length);
  console.log(shops && shops.length);
  try {
    const subAgent = await SubAgent.query().patchAndFetchById(id, { name: name, username: username });
    shops.map(async (item) => {
      console.log(item);
      console.log('fetch', item);
      const subAgentShop = await SubAgentShop.query().insert({
        "shopId": item,
        "subAgentId": subAgent.id
      })
    })

    if (!subAgent) {
      return res.status(404).json({ error: 'Sub-agent not found' });
    }
    res.json(subAgent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete a sub-agent by ID
const deleteSubAgentById = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedCount = await SubAgent.query().deleteById(id);
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Sub-agent not found' });
    }
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


function generateAccessToken(adminId) {
  return jwt.sign({ adminId }, 'your_access_secret_key', { expiresIn: '15m' });
}

function generateRefreshToken() {
  return uuidv4();
}

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await SubAgent.query().findOne({ username });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens upon successful login
    const accessToken = generateAccessToken(admin.id);
    const refreshToken = generateRefreshToken();

    // Store the refresh token (you may want to store it securely in a database)
    // For demonstration purposes, we're just attaching it to the response header
    res.header('Refresh-Token', refreshToken);

    res.json({ accessToken, refreshToken, admin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

const changePassword = (req, res) => {
  req.model = SubAgent; // Set the model for the AuthController
  AuthController.changePassword(req, res);
}

const verifyAccessToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token not provided' });
  }

  jwt.verify(token, 'your_access_secret_key', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid access token' });
    }

    req.adminId = decoded.adminId;
    next();
  });
}

const verifyRefreshToken = (refreshToken) => {
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

module.exports = {
  createSubAgent,
  getAllSubAgents,
  getSubAgentById,
  getSubAgentByShopOwner,
  updateSubAgentById,
  deleteSubAgentById,
  getCashiersBySubAgentId,
  changePassword,
  login
};
