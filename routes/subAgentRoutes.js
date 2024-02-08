// subAgentRoutes.js
const express = require('express');
const router = express.Router();
const subAgentController = require('../controllers/SubAgentController');

// Routes for sub-agents
router.post('/', subAgentController.createSubAgent);
router.get('/', subAgentController.getAllSubAgents);
router.get('/:id', subAgentController.getSubAgentById);
router.put('/:id', subAgentController.updateSubAgentById);
router.delete('/:id', subAgentController.deleteSubAgentById);

module.exports = router;