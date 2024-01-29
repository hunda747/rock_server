
// const chai = require('chai');
const app = await import('../index.js'); // Import your Express app
const chai = await import('chai');

const supertest = await import('supertest');
const request = supertest(app);
const { expect } = chai;


describe('Slip Controller', () => {
  it('should create multiple slips successfully', async () => {
    const slips = [
      {
        "selection": [60, 44, 61],
        "stake": 30,
        "showstake": false,
        "showstakeclicked": false
      },
      {
        "selection": [52, 47],
        "stake": 70,
        "showstake": false,
        "showstakeclicked": false
      },
      // Add more slips as needed
    ];

    const response = await request
      .post('/slip') // Adjust the route according to your API
      .send({
        "numberPick": slips,
        "gameType": "keno",
        "cashier": 2,
        "shop": 1,
        "shopOwner": 1
      });

    // Assuming your response format follows the structure you provided in your controller
    expect(response.status).to.equal(201);
    expect(response.body).to.have.property('err').to.equal('false');
    expect(response.body).to.have.property('errText').to.equal('okay');
    expect(response.body).to.have.property('id');
    expect(response.body).to.have.property('on');
    expect(response.body).to.have.property('gameType').to.equal('keno');
    expect(response.body).to.have.property('toWinMax');
    expect(response.body).to.have.property('toWinMin');
    expect(response.body).to.have.property('company').to.equal('chessbet');
    expect(response.body).to.have.property('code');
    expect(response.body).to.have.property('totalStake');
    expect(response.body).to.have.property('user');
    expect(response.body).to.have.property('showOwnerId');
    expect(response.body).to.have.property('agent').to.equal('agent');
    expect(response.body).to.have.property('by').to.equal('cashier');
  });

  // Add more tests for edge cases, errors, etc.
});
