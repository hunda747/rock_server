// routes/index.js

const express = require('express');
const { GameController } = require('../controllers/GameController');
const { checkLotteryResults } = require('../test/runagain');
const { Mutex } = require('async-mutex');
const gameMutex = new Mutex();
const router = express.Router();

// Games Routes
router.get('/', GameController.getAllGames);
router.get('/searchGame', GameController.searchGame);
router.get('/:id', GameController.getGameById);
router.post('/', GameController.createGame);
// router.get('/getSpinRecentResult', GameController.getSpinRecentResult);
router.post('/getInitial', GameController.getLastPlayedGame);
router.post('/getResult', GameController.getCurrentGameResult);
router.post('/spinOpen', GameController.getLastPlayedGameSpin);
router.post('/spinResult', GameController.getCurrentGameResultSpin);
router.post('/resetGameNumber', GameController.resetGameNumber);
router.post('/checkLotteryResults', checkLotteryResults);
router.get('/getPreviousResult/:gameNumber/:shop', GameController.getGameRusult);
// router.post('/calculate/:gameNumber', GameController.calculateWiningNumbers);
router.put('/:id', GameController.updateGame);
router.delete('/:id', GameController.deleteGame);

module.exports = router;
