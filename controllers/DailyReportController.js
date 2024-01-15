const DailyReport = require('../models/dailyReport');
const Cashier = require('../models/cashier');
const Slip = require('../models/slip');

const createDailyReport = async (req, res) => {
  try {
    const { reportDate } = req.body;
    // Modify this part based on the parameters you want to use for report generation
    // const currentDate = new Date();
    // const reportDate = currentDate.toISOString().split('T')[0]; // Extract YYYY-MM-DD

    // Use the report generation logic here
    const generatedReport = await generateDailyReport(reportDate, res);

    if (generatedReport) {
      res.status(201).json({ message: `Report for ${reportDate} is generated!` });
    } else {
      res.status(400).send("error")
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const generateDailyReport = async (reportDate, res) => {
  try {
    // Fetch all cashiers
    const cashiers = await Cashier.query().select('id', 'shopId').withGraphFetched('shop');
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    // console.log(cashiers);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Loop through each cashier and generate a report
    const dailyReports = await Promise.all(
      cashiers.map(async (cashier) => {
        const existingReport = await DailyReport.query()
          .where({
            reportDate,
            cashierId: cashier.id,
          })
          .first();

        const cashierReport = await Cashier.query()
          .findById(cashier.id)
          .withGraphFetched('[slips]')
          .modifyGraph('slips', (builder) => {
            builder.where('created_at', '>=', startOfDay);
            builder.where('created_at', '<=', endOfDay);
            builder.select(
              Slip.raw('COUNT(*) as tickets'),
              Slip.raw('SUM(totalStake) as stake'),
              Slip.raw('SUM(CASE WHEN status = "redeemed" THEN netWinning ELSE 0 END) as payout'),
              Slip.raw('COUNT(CASE WHEN status = "redeemed" AND netWinning > 0 THEN 1 END) as payoutCount'),
              Slip.raw('SUM(CASE WHEN status = "redeem" THEN netWinning ELSE 0 END) as unclaimed'),
              Slip.raw('COUNT(CASE WHEN status = "redeem" AND netWinning > 0 THEN 1 END) as unclaimedCount'),
              Slip.raw('SUM(CASE WHEN status = "canceled" THEN totalStake ELSE 0 END) as revoked'),
              Slip.raw('COUNT(CASE WHEN status = "canceled" THEN 1 END) as revokedCount')
            );
          });
        // Extract the relevant data from the cashier report
        // console.log('report: ', cashierReport.slips[0]);
        const {
          tickets = 0,
          stake = 0,
          payout = 0,
          payoutCount = 0,
          unclaimed = 0,
          unclaimedCount = 0,
          revoked = 0,
          revokedCount = 0,
        } = cashierReport.slips[0] || {}; // Assuming there is always one slip entry

        if (existingReport) {
          const updateDailyReport = await DailyReport.query().patchAndFetchById(existingReport.id, {
            reportDate,
            cashierId: cashier.id,
            shopId: cashier.shopId,
            shopOwnerId: cashier.shopOwnerId,
            totalTickets: tickets,
            totalStake: stake,
            totalPayout: payout,
            totalPayoutCount: payoutCount,
            totalUnclaimed: unclaimed,
            totalUnclaimedCount: unclaimedCount,
            totalRevoked: revoked,
            totalRevokedCount: revokedCount,
            totalGGR: (parseInt(stake) - parseInt(payout) - parseInt(revoked)),
            totalNetBalance: (parseInt(stake) - parseInt(payout) - parseInt(unclaimed) - parseInt(revoked)),
          });

          return updateDailyReport;
          // return res.status(400).json({ error: "The report for this date is already generated! " })
        } else {
          // Create an entry in the 'daily_reports' table
          const newDailyReport = await DailyReport.query().insert({
            reportDate,
            cashierId: cashier.id,
            shopId: cashier.shopId,
            shopOwnerId: cashier.shopOwnerId,
            totalTickets: tickets,
            totalStake: stake,
            totalPayout: payout,
            totalPayoutCount: payoutCount,
            totalUnclaimed: unclaimed,
            totalUnclaimedCount: unclaimedCount,
            totalRevoked: revoked,
            totalRevokedCount: revokedCount,
            totalGGR: (parseInt(stake) - parseInt(payout) - parseInt(revoked)),
            totalNetBalance: (parseInt(stake) - parseInt(payout) - parseInt(unclaimed) - parseInt(revoked)),
          });
          return newDailyReport;
        }


      })
    );

    return dailyReports;
  } catch (error) {
    console.error(error);
    throw error; // Rethrow the error for handling at a higher level
  }
};

const reportForCashier = async (cashier, reportDate) => {

  const startOfDay = new Date(reportDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(reportDate);
  endOfDay.setHours(23, 59, 59, 999);

  const cashierReport = await Cashier.query()
    .findById(cashier.id)
    .withGraphFetched('[slips]')
    .modifyGraph('slips', (builder) => {
      builder.where('created_at', '>=', startOfDay);
      builder.where('created_at', '<=', endOfDay);
      builder.select(
        Slip.raw('COUNT(*) as tickets'),
        Slip.raw('SUM(totalStake) as stake'),
        Slip.raw('SUM(CASE WHEN status = "redeemed" THEN netWinning ELSE 0 END) as payout'),
        Slip.raw('COUNT(CASE WHEN status = "redeemed" THEN netWinning ELSE 0 END) as payoutCount'),
        Slip.raw('SUM(CASE WHEN status = "redeem" THEN netWinning ELSE 0 END) as unclaimed'),
        Slip.raw('COUNT(CASE WHEN status = "redeem" AND netWinning > 0 THEN 1 ELSE NULL END) as unclaimedCount'),
        Slip.raw('SUM(CASE WHEN status = "canceled" THEN totalStake ELSE 0 END) as revoked'),
        Slip.raw('COUNT(CASE WHEN status = "canceled" THEN 1 END) as revokedCount')
      );
    });

  // Extract the relevant data from the cashier report
  console.log(cashierReport.slips[0]);
  return cashierReport.slips[0];
}


const getDailyReports = async (req, res) => {
  try {
    const dailyReports = await DailyReport.query();

    res.status(200).json(dailyReports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getDailyReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const dailyReport = await DailyReport.query().findById(id);

    if (dailyReport) {
      res.status(200).json(dailyReport);
    } else {
      res.status(404).json({ error: 'Daily Report not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const updateDailyReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { reportDate } = req.body;

    // const updatedDailyReport = await DailyReport.query().patchAndFetchById(id, updatedFields);
    const updatedDailyReport = generateDailyReportUpdates(reportDate, res);

    if (updatedDailyReport) {
      res.status(200).json({ message: updatedDailyReport });
    } else {
      res.status(404).json({ error: 'Daily Report not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const generateDailyReportUpdates = async (reportDate, res) => {
  try {
    console.log(reportDate);
    // Fetch all cashiers
    const cashiers = await DailyReport.query().where('reportDate', reportDate).select('id', 'shopId');
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Loop through each cashier and generate a report
    const dailyReports = await Promise.all(
      cashiers.map(async (cashier) => {
        const cashierReport = reportForCashier(cashier, reportDate);
        console.log('cash', cashierReport);
        const {
          tickets = 0,
          stake = 0,
          payout = 0,
          payoutCount = 0,
          unclaimed = 0,
          unclaimedCount = 0,
          revoked = 0,
          revokedCount = 0,
        } = cashierReport || {}; // Assuming there is always one slip entry

        // Check if there is an existing record for the cashier on the specified date
        const existingReport = await DailyReport.query()
          .where({
            reportDate,
            cashierId: cashier.id,
          })
          .first();

        if (existingReport) {
          // console.log('id', existingReport);
          console.log(tickets);
          // Create an entry in the 'daily_reports' table
          const newDailyReport = await DailyReport.query().patchAndFetchById(existingReport.id, {
            reportDate,
            cashierId: cashier.id,
            shopId: cashier.shopId,
            totalTickets: tickets,
            totalStake: stake,
            totalPayout: payout,
            totalPayoutCount: payoutCount,
            totalUnclaimed: unclaimed,
            totalUnclaimedCount: unclaimedCount,
            totalRevoked: revoked,
            totalRevokedCount: revokedCount,
            totalGGR: (parseInt(stake) - parseInt(payout) - parseInt(revoked)),
            totalNetBalance: (parseInt(stake) - parseInt(payout) - parseInt(unclaimed) - parseInt(revoked)),
          });
          console.log(newDailyReport);
          return newDailyReport;
        }

        return true;
      })
    );

    return dailyReports;
  } catch (error) {
    console.error(error);
    throw error; // Rethrow the error for handling at a higher level
  }
};

const deleteDailyReport = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCount = await DailyReport.query().deleteById(id);

    if (deletedCount > 0) {
      res.status(204).end();
    } else {
      res.status(404).json({ error: 'Daily Report not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  createDailyReport,
  getDailyReports,
  getDailyReportById,
  updateDailyReport,
  deleteDailyReport,
};
