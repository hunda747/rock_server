// controllers/ShopController.js
const Shop = require('../models/shop');

class ShopController {
  async getAll(req, res) {
    try {
      const shops = await Shop.query().withGraphFetched('owner');
      res.json(shops);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getById(req, res) {
    const { id } = req.params;
    try {
      const shop = await Shop.query().findById(id).withGraphFetched('owner');
      if (shop) {
        res.json(shop);
      } else {
        res.status(404).json({ error: 'Shop not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async create(req, res) {
    const shopData = req.body;

    // Validate the status field
    const validStatusValues = ['active', 'inactive', 'pending'];
    if (!validStatusValues.includes(shopData.status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    try {
      const newShop = await Shop.query().insert(shopData);
      res.json(newShop);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async update(req, res) {
    const { id } = req.params;
    const updatedData = req.body;
    try {
      const updatedShop = await Shop.query().patchAndFetchById(id, updatedData);
      if (updatedShop) {
        res.json(updatedShop);
      } else {
        res.status(404).json({ error: 'Shop not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async delete(req, res) {
    const { id } = req.params;
    try {
      const deletedCount = await Shop.query().deleteById(id);
      if (deletedCount > 0) {
        res.json({ message: 'Shop deleted successfully' });
      } else {
        res.status(404).json({ error: 'Shop not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = new ShopController();
