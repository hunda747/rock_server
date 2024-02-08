// subAgentController.js
const SubAgent = require('../models/subAgent'); // Import your SubAgent model

// Create a new sub-agent
const createSubAgent = async (req, res) => {
  try {
    const subAgent = await SubAgent.query().insert(req.body);
    res.status(201).json(subAgent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get all sub-agents
const getAllSubAgents = async (req, res) => {
  try {
    const subAgents = await SubAgent.query();
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
    const subAgent = await SubAgent.query().where({shopOwnerId: id});
    if (!subAgent) {
      return res.status(404).json({ error: 'Sub-agent not found' });
    }
    res.json(subAgent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update a sub-agent by ID
const updateSubAgentById = async (req, res) => {
  const { id } = req.params;
  try {
    const subAgent = await SubAgent.query().patchAndFetchById(id, req.body);
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

module.exports = {
  createSubAgent,
  getAllSubAgents,
  getSubAgentById,
  getSubAgentByShopOwner,
  updateSubAgentById,
  deleteSubAgentById,
};
