const Ticket = require('../models/slip')
const Cashier = require('../models/cashier')
const oddsTable = require("../odd/kiron");
const { getCurrentDate } = require('../controllers/DailyReportController');
const addReportJob = require('../util/queue');

const calculateWiningNumbers = async (gameNumber, winningNumbers, winner, shopId) => {
  try {
    const tickets = await Ticket.query()
      .where("gameId", gameNumber)
      .whereNot("status", "canceled");
    if (!tickets) {
      return false;
    }

    // Iterate through each ticket
    for (const ticket of tickets) {
      await calculateSingleKenoTicketWinning(ticket, winningNumbers, winner);
    }

    addReportJob(shopId, getCurrentDate());
    // calculateCashierWinnings(gameNumber, tickets);
  } catch (err) {
    console.log(err);
  }
};
const calculateSingleKenoTicketWinning = async (ticket, winningNumbers, winner) => {
  const ticketPicks = JSON.parse(ticket.numberPick);
  // Initialize variables for each ticket
  let ticketWin = 0;

  for (const pick of ticketPicks) {
    const numberOfSelections = pick.selection.length;
    // console.log("nums:", pick.selection);
    // console.log("nums:", pick.selection[0]);
    // Retrieve the odds table for the specific selection
    if (typeof pick?.selection[0] === "string") {
      if (winner === "evens" && pick?.selection[0] === winner) {
        ticketWin += pick.stake * 4;
      } else if (pick?.selection[0] === winner) {
        ticketWin += pick.stake * 2;
      }
    } else {
      const oddsEntry = oddsTable[ticket.oddType][numberOfSelections];

      const actualWinnings = countCorrectGuesses(
        pick.selection,
        winningNumbers
      );
      // console.log("wins:", actualWinnings);
      if (oddsEntry && actualWinnings) {
        const modd = oddsEntry[actualWinnings - 1];
        // console.log("mod", modd);
        // Calculate the stake for the current pick based on the odds table
        // console.log("amount", pick.stake * Object.values(modd)[0]);
        ticketWin += pick.stake * Object.values(modd)[0];
      }
    }
  }
  const updatedTicket = await Ticket.query().patchAndFetchById(ticket.id, {
    netWinning: ticketWin,
    status: "redeem",
  });

  console.log("total win:", ticketWin);
};

const calculateSlipWiningNumbers = async (gameNumber, winningNumbers, winner) => {
  try {
    const tickets = await Ticket.query()
      .where("gameId", gameNumber)
      .whereNot("status", "canceled");

    if (!tickets) {
      return false;
    }
    // Iterate through each ticket
    for (const ticket of tickets) {
      await calculateSingleSpinTicketWinning(ticket, winningNumbers, winner);
    }

  } catch (err) {
    console.log(err);
  }
};
const calculateSingleSpinTicketWinning = async (ticket, winningNumbers, winner) => {
  const ticketPicks = JSON.parse(ticket.numberPick);

  // Initialize variables for each ticket
  let ticketWin = 0;
  let ticketMinWin = 0;
  let ticketMaxWin = 0;

  for (const pick of ticketPicks) {
    // Retrieve the odds table for the specific selection
    if (pick.market === "OddEven") {
      if (pick?.val[0] == winner?.oddEven) {
        ticketWin += pick.stake * pick.odd;
      }
    } else if (pick.market === "Color") {
      if (pick.val[0] == winner?.color) {
        ticketWin += pick.stake * pick.odd;
      }
    } else {
      // console.log("numbers", winningNumbers);
      // if(pick.val.includes(winningNumbers)){
      if (pick?.val.map(Number).includes(winningNumbers)) {
        ticketWin += pick.stake * pick.odd;
      }
    }
  }
  const updatedTicket = await Ticket.query().patchAndFetchById(ticket.id, {
    netWinning: ticketWin,
    status: "redeem",
  });

  console.log("total win:", ticketWin);
}

const calculateCashierWinnings = async (gameNumber, tickets) => {
  try {
    // Collect unique cashier IDs
    const uniqueCashierIds = [
      ...new Set(tickets.map((ticket) => ticket.cashierId)),
    ];

    for (const cashierId of uniqueCashierIds) {
      const tickets = await Ticket.query()
        .where("cashierId", cashierId)
        .where("gameId", gameNumber)
        .whereNot("status", "canceled");

      let totalCashierWin = 0;
      let totalStakeWin = 0;

      for (const ticket of tickets) {
        totalCashierWin += parseInt(ticket.netWinning);
        totalStakeWin += parseInt(ticket.totalStake);
      }

      const existingNetWinning = (
        await Cashier.query().select("netWinning").where("id", cashierId)
      )[0]?.netWinning || 0;

      // Calculate the updated netWinning value
      const updatedNetWinning =
        existingNetWinning + (totalStakeWin - totalCashierWin);

      await Cashier.query()
        .patch({ netWinning: updatedNetWinning })
        .where("id", cashierId);
    }

  } catch (err) {
    console.log(err);
  }
};

function countCorrectGuesses(userSelection, winningNumbers) {
  // Implement logic to count the number of correct guesses between userSelection and winningNumbers
  const correctGuesses = userSelection.filter((num) =>
    winningNumbers.includes(num)
  ).length;
  return correctGuesses;
}

// Function to determine winning colors based on the drawn number
function determineWinningColors(drawnNumber) {
  return numberToColorMap[drawnNumber];
}

// Function to determine winners for all groups based on the drawn number
function determineAllWinners(drawnNumber) {
  const allWinners = {};
  // Check win option
  allWinners.win = drawnNumber;

  // Check color option
  const drawnColors = determineWinningColors(drawnNumber);
  allWinners.color = (drawnNumber === '0') ? '-' : drawnColors[0];

  // Check oddEven option
  allWinners.oddEven = (drawnNumber == '0') ? '-' : drawnNumber % 2 === 0 ? "EVN" : "ODD";

  return allWinners;
}

const numberToColorMap = {
  0: ["-", "-"],
  1: ["RED", "purple"],
  2: ["BLK", "orange"],
  3: ["RED", "white"],
  4: ["BLK", "orange"],
  5: ["RED", "purple"],
  6: ["BLK", "blue"],
  7: ["RED", "white"],
  8: ["BLK", "pink"],
  9: ["RED", "yellow"],
  10: ["BLK", "pink"],
  11: ["BLK", "pink"],
  12: ["RED", "white"],
  13: ["BLK", "blue"],
  14: ["RED", "yellow"],
  15: ["BLK", "orange"],
  16: ["RED", "purple"],
  17: ["BLK", "blue"],
  18: ["RED", "yellow"],
  19: ["RED", "orange"],
  20: ["BLK", "purple"],
  21: ["RED", "orange"],
  22: ["BLK", "yellow"],
  23: ["RED", "pink"],
  24: ["BLK", "purple"],
  25: ["RED", "blue"],
  26: ["BLK", "orange"],
  27: ["RED", "blue"],
  28: ["BLK", "white"],
  29: ["BLK", "yellow"],
  30: ["RED", "pink"],
  31: ["BLK", "yellow"],
  32: ["RED", "orange"],
  33: ["BLK", "purple"],
  34: ["RED", "blue"],
  35: ["BLK", "white"],
  36: ["RED", "pink"],
};

module.exports = {
  calculateWiningNumbers,
  calculateSlipWiningNumbers,
  determineAllWinners,
  calculateSingleKenoTicketWinning,
  calculateSingleSpinTicketWinning
}