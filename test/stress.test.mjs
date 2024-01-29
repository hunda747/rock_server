// test/createTicket.test.js

const axios = await import("axios");

describe("Ticket creation stress test", () => {
  it("should create multiple tickets", async () => {
    const numberOfTickets = 5; // Adjust the number based on your stress testing needs

    const slips = [
      {
        selection: [60, 44, 61],
        stake: 30,
        showstake: false,
        showstakeclicked: false,
      },
      {
        selection: [52, 47],
        stake: 70,
        showstake: false,
        showstakeclicked: false,
      },
      // Add more slips as needed
    ];

    // Loop to create multiple tickets
    for (let i = 0; i < numberOfTickets; i++) {
      const response = await axios.post(
        "https://backend.rockgamesretail.com/slip",
        {
          numberPick: slips,
          gameType: "keno",
          cashier: 2,
          shop: 1,
          shopOwner: 1,
        }
      );

      // Add assertions based on your application's response
      expect(response.status).toBe(201); // Adjust the status code based on your application
    }
  });
});
