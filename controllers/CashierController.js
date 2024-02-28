// controllers/CashierController.js
const Cashier = require("../models/cashier");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const AuthController = require("./AuthController");
const ShopOwner = require("../models/ShopOwner");
const Slip = require("../models/slip");

const moment = require("moment");
const Shop = require("../models/shop");

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
      const cashiers = await Cashier.query().withGraphFetched("shop");
      res.json(cashiers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async getById(req, res) {
    const { id } = req.params;
    try {
      const cashier = await Cashier.query()
        .findById(id)
        .withGraphFetched("shop");
      if (cashier) {
        res.json(cashier);
      } else {
        res.status(404).json({ error: "Cashier not found" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async getByShopowner(req, res) {
    const { id } = req.params;
    try {
      const cashier = await Cashier.query().withGraphFetched("shop")
        .joinRelated('shop')
        .where('shop.shopOwnerId', id);

      if (cashier) {
        res.json(cashier);
      } else {
        res.status(404).json({ error: "Cashier not found" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async create(req, res) {
    const cashierData = req.body;

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(cashierData.password, 10);
    cashierData.password = hashedPassword;
    const shopLimit = await Shop.query().findById(cashierData.shopId);
    cashierData.cashierLimit = shopLimit.cashierLimit;

    try {
      const newCashier = await Cashier.query().insert(cashierData);
      res.json(newCashier);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async addCashier(req, res) {
    const cashierData = req.body;

    // Find the last cashier for the selected shop
    const lastCashier = await Cashier.query()
      .where("shopId", cashierData.shopId)
      .orderBy("id", "desc")
      .withGraphFetched('shop')
      .first();
    let nextCashierNumber = 1; // Default if no previous cashiers found

    if (lastCashier) {
      // Extract the cashier number from the last cashier's username
      const lastCashierNumber = parseInt(
        lastCashier.username.split(".c")[1],
        10
      );
      nextCashierNumber = lastCashierNumber + 1;
    }

    try {
      const hashedCashPassword = await bcrypt.hash("123456", 10);
      for (let index = 0; index < cashierData.cashNo; index++) {
        try {
          const newCashier = await Cashier.query().insert({
            shopId: cashierData.shopId,
            name: `${cashierData.username}.c${nextCashierNumber}`,
            username: `${cashierData.username}.c${nextCashierNumber}`,
            password: hashedCashPassword,
            cashierLimit: lastCashier.shop.cashierLimit
          });
          nextCashierNumber++;
          // res.json(newCashier);
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: "Internal Server Error" });
        }
      }
      res.json({ message: "Added the cashiers" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async update(req, res) {
    const { id } = req.params;
    const updatedData = req.body;
    try {
      const updatedCashier = await Cashier.query().patchAndFetchById(
        id,
        updatedData
      );
      if (updatedCashier) {
        res.json(updatedCashier);
      } else {
        res.status(404).json({ error: "Cashier not found" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async delete(req, res) {
    const { id } = req.params;
    try {
      const deletedCount = await Cashier.query().deleteById(id);
      if (deletedCount > 0) {
        res.json({ message: "Cashier deleted successfully" });
      } else {
        res.status(404).json({ error: "Cashier not found" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  generateAccessToken(cashierId) {
    return jwt.sign({ cashierId }, "your_access_secret_key", {
      expiresIn: "15m",
    });
  }

  generateRefreshToken() {
    return uuidv4();
  }

  async login(req, res) {
    const { username, password } = req.body;
    console.log(username, password);
    try {
      const cashier = await Cashier.query()
        .findOne({ username })
        .withGraphFetched("shop");
      // console.log(cashier);
      if (!cashier || !(await bcrypt.compare(password, cashier.password))) {
        return res
          .status(400)
          .json({ error: "Incorrect Password", status: "error" });
      }
      if (!cashier.status) {
        return res
          .status(403)
          .json({ error: "Account is Inactive", status: "error" });
      }
      if (cashier.firstLogin) {
        return res
          .status(403)
          .json({ error: "Change password", status: "new", id: cashier.id });
      }
      if (cashier.shop.status === "inactive") {
        return res
          .status(403)
          .json({ error: "Shop is Inactive", status: "error" });
      }
      const shopowner = await ShopOwner.query()
        .findById(cashier.shop.shopOwnerId)
        .select("status");
      if (!shopowner.status) {
        return res
          .status(403)
          .json({ error: "Shop owner is Inactive", status: "error" });
      }
      // if (cashier.cashierLimit < await (generateReport(cashier.id))) {
      if (cashier.cashierLimit < cashier.netWinning) {
        return res
          .status(403)
          .json({
            error: "Cashier limit reached. Please contact the admin.",
            status: "error",
          });
      }

      // Generate tokens upon successful login
      const accessToken = await AuthController.generateAccessToken(cashier, 'cashier');
      const refreshToken = await AuthController.generateRefreshToken(cashier, 'cashier');

      // Store the refresh token (you may want to store it securely in a database)
      // For demonstration purposes, we're just attaching it to the response header
      res.header("Refresh-Token", refreshToken);

      res.json({
        accessToken,
        refreshToken,
        id: cashier.id,
        cashier: cashier,
        oddType: cashier.shop.oddType,
        status: "success",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async changePassword(req, res) {
    const { id } = req.params;
    const { newPassword } = req.body;

    try {
      // Fetch the user from the database (either a shop owner or a cashier)
      const user = await Cashier.query().findById(id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password in the database
      await Cashier.query().patch({ password: hashedPassword }).where("id", id);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async changeOwnPassword(req, res) {
    const { id } = req.params;
    const { newPassword, oldPassword } = req.body;

    try {
      if (!newPassword || !oldPassword) {
        return res
          .status(404)
          .json({ error: "Please provide full information." });
      }

      // Fetch the user from the database (either a shop owner or a cashier)
      const user = await Cashier.query().findById(id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
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
      await Cashier.query()
        .patch({ password: hashedPassword, firstLogin: false })
        .where("id", id);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  // Middleware to verify the access token
  verifyAccessToken(req, res, next) {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token not provided" });
    }

    jwt.verify(token, "your_access_secret_key", (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: "Invalid access token" });
      }

      req.cashierId = decoded.cashierId;
      next();
    });
  }

  // controllers/CashierController.js
  async refreshToken(req, res) {
    const decodedRefreshToken = req.user;

    try {
      // Verify the refresh token
      // const decodedRefreshToken = this.verifyRefreshToken(refreshToken);

      if (!decodedRefreshToken) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      // Generate a new access token
      const newAccessToken = await AuthController.generateAccessToken(decodedRefreshToken, 'cashier');

      res.json({ accessToken: newAccessToken });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  // Verify the refresh token
  verifyRefreshToken(refreshToken) {
    try {
      // You may want to store and verify the refresh token securely
      // For demonstration purposes, we're just verifying it using jwt.verify
      const decoded = jwt.verify(refreshToken, "your_refresh_secret_key");
      return decoded;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async extendCashierLimit(req, res) {
    const { cashId } = req.query;

    if (!cashId) {
      return res.status(404).json({ error: "Missing cashier id!" });
    }

    const cashier = await Cashier.query()
      .findById(cashId)
      .withGraphFetched("shop");
    if (!cashier) {
      return res.status(404).json({ error: "Cashier not found!" });
    }
    const newLimit = cashier.cashierLimit + cashier.shop.cashierLimit;

    const updatedCashier = await Cashier.query().patchAndFetchById(cashId, {
      cashierLimit: newLimit,
    });
    if (updatedCashier) {
      res.json(updatedCashier);
    } else {
      res.status(404).json({ error: "Cashier not found" });
    }
  }

  async resetCashierLimit() {
    const cashiers = await Cashier.query().withGraphFetched("shop");
    cashiers.map(async (cashier) => {
      await Cashier.query().patchAndFetchById(cashier.id, {
        netWinning: 0,
        cashierLimit: cashier.shop.cashierLimit
      })
    })
  }
}

const generateReport = async (id) => {
  const currentDate = moment.utc();
  console.log(currentDate);
  const startOfDay = moment(currentDate).startOf("day").toDate();
  const endOfDay = moment(currentDate).endOf("day").toDate();
  // const startOfDay = new Date(currentDate);
  //   startOfDay.setHours(0, 0, 0, 0);
  //   // console.log(cashiers);
  //   const endOfDay = new Date(currentDate);
  //   endOfDay.setHours(23, 59, 59, 999);
  console.log(startOfDay);
  console.log(endOfDay);
  const cashierReport = await Cashier.query()
    .findById(id)
    .withGraphFetched("[slips]")
    .modifyGraph("slips", (builder) => {
      builder.where("created_at", ">=", startOfDay);
      builder.where("created_at", "<=", endOfDay);
      builder.select(
        Slip.raw("SUM(totalStake) as stake"),
        Slip.raw(
          'SUM(CASE WHEN status = "redeemed" THEN netWinning ELSE 0 END) as payout'
        ),
        Slip.raw(
          'SUM(CASE WHEN status = "redeem" THEN netWinning ELSE 0 END) as unclaimed'
        ),
        Slip.raw(
          'SUM(CASE WHEN status = "canceled" THEN totalStake ELSE 0 END) as revoked'
        )
      );
    });
  // console.log(cashierReport);
  const {
    stake = 0,
    payout = 0,
    unclaimed = 0,
    revoked = 0,
  } = cashierReport.slips[0] || {};
  const net = parseInt(stake) - parseInt(payout) - parseInt(unclaimed) - parseInt(revoked)
  console.log('id', net);
  return net;
};

module.exports = new CashierController();
