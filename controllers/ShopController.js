// controllers/ShopController.js
const Shop = require("../models/shop");
const Cashier = require("../models/cashier");
const bcrypt = require("bcrypt");
const AuthController = require("./AuthController");

class ShopController {
  async getAll(req, res) {
    try {
      const shops = await Shop.query().withGraphFetched("owner");
      res.json(shops);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async getById(req, res) {
    const { id } = req.params;
    try {
      const shop = await Shop.query().findById(id).withGraphFetched("owner");
      if (shop) {
        res.json(shop);
      } else {
        res.status(404).json({ error: "Shop not found" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async getByShopowner(req, res) {
    const { id } = req.params;
    try {
      const shop = await Shop.query().where({ shopOwnerId: id }).withGraphFetched("owner");
      if (shop) {
        res.json(shop);
      } else {
        res.status(404).json({ error: "Shop not found" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async create(req, res, next) {
    const shopData = req.body;

    // // Validate the status field
    // const validStatusValues = ['active', 'inactive', 'pending'];
    // if (!validStatusValues.includes(shopData.status)) {
    //   return res.status(400).json({ error: 'Invalid status value' });
    // }
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash('123456', 10);

    try {
      const newShop = await Shop.query().insert({
        shopOwnerId: shopData.shopOwnerId,
        name: shopData.name,
        username: shopData.username,
        location: shopData.location,
        cashierLimit: 10000,
        password: hashedPassword
        // shopOwnerId shopData
      });

      const hashedCashPassword = await bcrypt.hash("123456", 10);
      for (let index = 0; index < shopData.cashNo; index++) {
        try {
          const newCashier = await Cashier.query().insert({
            shopId: newShop.id,
            name: `${newShop.username}.c${(index + 1)}`,
            username: `${newShop.username}.c${(index + 1)}`,
            password: hashedCashPassword,
            cashierLimit: 10000
          });
          // res.json(newCashier);
        } catch (error) {
          console.error(error);
        }
      }

      res.json(newShop);
    } catch (error) {
      // console.error(error);
      next(error);
      // res.status(500).json({ error: "Internal Server Error" });
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
        res.status(404).json({ error: "Shop not found" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async delete(req, res) {
    const { id } = req.params;
    try {
      const deletedCount = await Shop.query().deleteById(id);
      if (deletedCount > 0) {
        res.json({ message: "Shop deleted successfully" });
      } else {
        res.status(404).json({ error: "Shop not found" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async login(req, res) {
    const { username, password } = req.body;

    try {
      const shop = await Shop.query().findOne({ username });

      if (!shop || !(await bcrypt.compare(password, shop.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!shop.status) {
        return res.status(401).json({ error: "Shop owner is Blocked!" });
      }

      // Generate tokens upon successful login
      const accessToken = await AuthController.generateAccessToken(shop, 'shop');
      const refreshToken = await AuthController.generateRefreshToken(shop, 'shop');

      // Store the refresh token (you may want to store it securely in a database)
      // For demonstration purposes, we're just attaching it to the response header
      res.header("Refresh-Token", refreshToken);

      res.json({ accessToken, refreshToken, id: shop.id, shop });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async changePassword(req, res) {
    const { id, newPassword } = req.body;
    // console.log(id);
    try {
      // Fetch the user from the database (either a shop owner or a cashier)
      const user = await Shop.query().findById(id);

      if (!user) {
        return res.status(404).json({ error: "Shop not found" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password in the database
      await Shop.query()
        .patch({ password: hashedPassword })
        .where("id", id);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async changeOwnPassword(req, res) {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    // console.log(id);
    try {
      // Fetch the user from the database (either a shop owner or a cashier)
      const user = await Shop.query().findById(id);

      if (!user) {
        return res.status(404).json({ error: "Shop not found" });
      }

      // Check the old password
      const isOldPasswordValid = await bcrypt.compare(
        oldPassword,
        user.password
      );
      if (!isOldPasswordValid) {
        return res.status(401).json({ error: "Invalid old password" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      // Update the user's password in the database
      await Shop.query()
        .patch({ password: hashedPassword })
        .where("id", id);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async refreshToken(req, res) {
    const decodedRefreshToken = req.user;

    try {
      if (!decodedRefreshToken) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      // Generate a new access token
      const newAccessToken = await AuthController.generateAccessToken(
        decodedRefreshToken, 'shop'
      );

      res.json({ accessToken: newAccessToken });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
}

module.exports = new ShopController();
