// controllers/slipController.js

const Slip = require('../models/slip');

const slipController = {
  getAllSlips: async (req, res, next) => {
    try {
      const slips = await Slip.query();
      res.json(slips);
    } catch (error) {
      next(error);
    }
  },

  getSlipById: async (req, res, next) => {
    const { id } = req.params;

    try {
      const slip = await Slip.query().findById(id);
      if (slip) {
        res.json(slip);
      } else {
        res.status(404).json({ error: 'Slip not found' });
      }
    } catch (error) {
      next(error);
    }
  },

  createSlip: async (req, res, next) => {
    const { body } = req;

    try {
      const slip = await Slip.query().insert(body);
      res.status(201).json(slip);
    } catch (error) {
      next(error);
    }
  },

  updateSlip: async (req, res, next) => {
    const { id } = req.params;
    const { body } = req;

    try {
      const updatedSlip = await Slip.query().patchAndFetchById(id, body);
      if (updatedSlip) {
        res.json(updatedSlip);
      } else {
        res.status(404).json({ error: 'Slip not found' });
      }
    } catch (error) {
      next(error);
    }
  },

  deleteSlip: async (req, res, next) => {
    const { id } = req.params;

    try {
      const deletedSlip = await Slip.query().deleteById(id);
      if (deletedSlip) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: 'Slip not found' });
      }
    } catch (error) {
      next(error);
    }
  },
};

module.exports = slipController;
