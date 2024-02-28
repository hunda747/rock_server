// routes/shopOwners.js
const express = require('express');
const adminController = require('../controllers/AdminController');
const { authenticateToken, checkUserRole, authenticateRefreshToken } = require('../middleware/authHandler');

const router = express.Router();

router.get('/', authenticateToken, checkUserRole(['admin']), adminController.getAll);
router.get('/:id', adminController.getById);
router.post('/', adminController.create);
router.post('/login', adminController.login);
router.post('/changePassword', adminController.changePassword);
router.post('/refresh', authenticateRefreshToken, checkUserRole(['admin']), adminController.refreshToken);
router.put('/:id', adminController.update);
router.delete('/:id', adminController.delete);

module.exports = router;
