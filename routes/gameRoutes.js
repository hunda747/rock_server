// routes/index.js

const express = require('express');
const gameController = require('../controllers/GameController');

const router = express.Router();

// Games Routes
router.get('/games', gameController.getAllGames);
router.get('/games/:id', gameController.getGameById);
router.post('/games', gameController.createGame);
router.put('/games/:id', gameController.updateGame);
router.delete('/games/:id', gameController.deleteGame);

module.exports = router;
