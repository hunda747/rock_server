// routes/index.js

const express = require('express');
const gameController = require('../controllers/GameController');

const router = express.Router();

// Games Routes
router.get('/', gameController.getAllGames);
router.get('/spinOpen', gameController.getLastPlayedGameSpin);
router.get('/spinResult', gameController.getCurrentGameResultSpin);
// router.get('/getSpinRecentResult', gameController.getSpinRecentResult);
router.get('/:id', gameController.getGameById);
router.post('/', gameController.createGame);
router.post('/getInitial', gameController.getLastPlayedGame);
router.post('/getResult/:gameNumber', gameController.getCurrentGameResult);
router.get('/getPreviousResult/:gameNumber', gameController.getGameRusult);
// router.post('/calculate/:gameNumber', gameController.calculateWiningNumbers);
router.put('/:id', gameController.updateGame);
router.delete('/:id', gameController.deleteGame);

module.exports = router;
