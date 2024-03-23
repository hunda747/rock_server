// routes/index.js

const express = require('express');
const gameController = require('../controllers/GameController');
const { Mutex } = require('async-mutex');
const gameMutex = new Mutex();
const router = express.Router();

// const ensureUnlocked = async (req, res, next) => {
//   const release = await acquireLockWithTimeout(gameMutex, 5000);
//   req.on("end", release);
//   next();
// }
// const acquireLockWithTimeout = async (mutex, timeout) => {
//   return new Promise((resolve, reject) => {
//     const timer = setTimeout(() => {
//       reject(new Error('Timeout while acquiring lock'));
//     }, timeout);

//     mutex.acquire().then((release) => {
//       clearTimeout(timer);
//       resolve(release);
//     }).catch((error) => {
//       clearTimeout(timer);
//       reject(error);
//     });
//   });
// };

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
