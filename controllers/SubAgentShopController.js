// subAgentShopController.js
const SubAgentShop = require('../models/subAgentShop'); // Import your SubAgentShop model

// Create a new record connecting a sub-agent with a shop
const createSubAgentShop = async (req, res) => {
  try {
    const subAgentShop = await SubAgentShop.query().insert(req.body);
    res.status(201).json(subAgentShop);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get all records connecting sub-agents with shops
const getAllSubAgentShops = async (req, res) => {
  try {
    const subAgentShops = await SubAgentShop.query();
    res.json(subAgentShops);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get a specific record by ID
const getSubAgentShopById = async (req, res) => {
  const { id } = req.params;
  try {
    const subAgentShop = await SubAgentShop.query().findById(id).withGraphFetched('shop').withGraphFetched('subAgent');
    if (!subAgentShop) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(subAgentShop);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getShopsBySubAgentId = async (req, res) => {
  const { subAgentId } = req.params;
  try {
    const subAgentShops = await SubAgentShop.query()
      .where('subAgentId', subAgentId)
      .withGraphFetched('shop'); // Assuming 'shop' is the relationship name

    if (subAgentShops.length > 0) {
      // console.log(subAgentShops);
      const shops = subAgentShops.map((subAgentShop) => subAgentShop.shop);
      res.json(shops);
    } else {
      res.status(404).json({ error: "No shops found for the specified sub-agent ID" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Update a record by ID
const updateSubAgentShopById = async (req, res) => {
  const { id } = req.params;
  try {
    const subAgentShop = await SubAgentShop.query().patchAndFetchById(id, req.body);
    if (!subAgentShop) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(subAgentShop);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete a record by ID
const deleteSubAgentShopById = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedCount = await SubAgentShop.query().deleteById(id);
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  createSubAgentShop,
  getAllSubAgentShops,
  getSubAgentShopById,
  getShopsBySubAgentId,
  updateSubAgentShopById,
  deleteSubAgentShopById,
};
