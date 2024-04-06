const Ticket = require('../models/slip')
const Cashier = require('../models/cashier')
const oddsTable = require("../odd/kiron");

const calculateWiningNumbers = async (gameNumber, winningNumbers, winner) => {
  // const { gameNumber } = req.params;
  // let winningNumbers = [25, 62, 47, 8, 27, 36, 35, 10, 20, 30];
  // console.log(nums);
  try {
    const tickets = await Ticket.query()
      .where("gameId", gameNumber)
      .whereNot("status", "canceled");

    if (!tickets) {
      return false;
    }
    // Iterate through each ticket
    for (const ticket of tickets) {
      const ticketPicks = JSON.parse(ticket.numberPick);

      // Initialize variables for each ticket
      let ticketWin = 0;
      let ticketMinWin = 0;
      let ticketMaxWin = 0;

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
        // redeemDate: "2024-03-27 18:36:22",
        // redeemCashierId: 101
      });

      console.log("total win:", ticketWin);
    }

    calculateCashierWinnings(gameNumber, tickets);
  } catch (err) {
    console.log(err);
  }
};

const calculateSlipWiningNumbers = async (
  gameNumber,
  winningNumbers,
  winner
) => {

  try {
    const tickets = await Ticket.query()
      .where("gameId", gameNumber)
      .whereNot("status", "canceled");

    if (!tickets) {
      return false;
    }
    // Iterate through each ticket
    for (const ticket of tickets) {
      const ticketPicks = JSON.parse(ticket.numberPick);

      // Initialize variables for each ticket
      let ticketWin = 0;
      let ticketMinWin = 0;
      let ticketMaxWin = 0;

      for (const pick of ticketPicks) {
        const numberOfSelections = pick.val.length;
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
          if (pick.val.map(Number).includes(winningNumbers)) {
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

  } catch (err) {
    console.log(err);
  }
};

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

module.exports = {
  calculateWiningNumbers,
  calculateSlipWiningNumbers
}