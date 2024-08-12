const logger = require("../logger");
const Game = require("../models/game")

const CYCLELENGTH = 15;
const INITIALCOMMISSIONRATE = 80;
const MINIMUMCOMMISSION = 5;

function getStartAndEndOfDay(timezoneOffset = 0) {
  const reportDate = new Date().toISOString().substr(0, 10);
  const startOfDay = new Date(`${reportDate}T00:00:00.000Z`);
  startOfDay.setMinutes(startOfDay.getMinutes() - timezoneOffset);
  const endOfDay = new Date(`${reportDate}T23:59:59.999Z`);
  endOfDay.setMinutes(endOfDay.getMinutes() - timezoneOffset);

  return {
    startOfDay: startOfDay,
    endOfDay: endOfDay
  };
}

const checkRepeatNumber = async (trx, gameType, shopId, newGameNumber, dblock) => {
  await trx.raw(`CREATE TABLE IF NOT EXISTS ${dblock} (game_number VARCHAR(255) PRIMARY KEY); `);
  const lockAcquired = await trx.raw(`
    INSERT INTO ${dblock} (game_number) VALUES ('${getTodayDate() + '_' + gameType + '_' + shopId.toString() + '_' + (newGameNumber).toString()}');
  `).catch(error => {
    console.log(error);
    return []; // Return an empty array to indicate failure
  });

  if (lockAcquired.length === 0) {
    logger.error(`${dblock} Failed to acquire lock for game: ${newGameNumber} in SHop: ${shopId}`);
    throw new Error("Conflict detected. Please try again."); // Throw an error to stop execution
  } else {
    return true;
  }
}

const getLastGamePlayed = async (gameType, shopId) => {
  const { startOfDay, endOfDay } = getStartAndEndOfDay(0);
  return await Game.query()
    .andWhere("gameType", gameType)
    .andWhere("created_at", ">=", startOfDay)
    .andWhere("created_at", "<=", endOfDay)
    .andWhere("shopId", shopId)
    .orderBy("id", "desc")
    .limit(1)
    .first();
}

const getTodayDate = () => {
  var currentDate = new Date().toISOString();

  // Format the date into YYYYMMDD format
  return currentDate.substring(0, 10);
}

const randomizeMinusCommissionRound = (cycleLength) => {
  return Math.floor(Math.random() * (cycleLength / 2)) + Math.floor(cycleLength / 2);
}

module.exports = { getStartAndEndOfDay, checkRepeatNumber, getLastGamePlayed, getTodayDate, randomizeMinusCommissionRound, CYCLELENGTH, INITIALCOMMISSIONRATE, MINIMUMCOMMISSION }