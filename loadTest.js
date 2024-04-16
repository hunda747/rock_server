const axios = require('axios');

let gameNumber = 128954; // Initial game number

async function sendRequest() {
  // Increment game number
  gameNumber++;

  // API endpoint
  const url = 'http://localhost:8800/game/getResult';

  // Request body
  const body = {
    gameNumber: gameNumber,
    shopId: 'shop'
  };

  try {
    console.log('send request');
    // Send POST request with a timeout of 5 seconds
    const response = await axios.post(url, body, {
      timeout: 5000 // Timeout in milliseconds (5 seconds)
    });

    // Check response status
    if (response) {
      console.log('Response:', response.data);
    } else {
      console.error('Request failed with status:', response);
    }
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out');
    } else {
      console.error('Error:', error);
    }
  }
}

const runTesting = async (req, res, next) => {
  for (let i = 0; i < 2; i++) {
    // Example usage
    await sendRequest();
  }
  return res.status('done testing');
}

module.exports = { runTesting }
