// routes/index.js

const express = require('express');
const gameController = require('../controllers/GameController');

const router = express.Router();

// Games Routes
router.get('/', gameController.getAllGames);
router.get('/searchGame', gameController.searchGame);
router.get('/:id', gameController.getGameById);
router.post('/', gameController.createGame);
// router.get('/getSpinRecentResult', gameController.getSpinRecentResult);
router.post('/getInitial', gameController.getLastPlayedGame);
router.post('/getResult', gameController.getCurrentGameResult);
router.post('/spinOpen', gameController.getLastPlayedGameSpin);
router.post('/spinResult', gameController.getCurrentGameResultSpin);
router.get('/getPreviousResult/:gameNumber/:shop', gameController.getGameRusult);
// router.post('/calculate/:gameNumber', gameController.calculateWiningNumbers);
router.put('/:id', gameController.updateGame);
router.delete('/:id', gameController.deleteGame);

module.exports = router;
