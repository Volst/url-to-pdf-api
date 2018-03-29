/* eslint-disable no-console */
const got = require('got');

const amount = process.argv[2] || 1;

const API_URL = 'http://localhost:9000/api/render/';
const API_KEY = '';

console.log('Testing amount:', amount);

for (let idx = 0; idx < amount; idx += 1) {
  got
    .post(API_URL, {
      body: JSON.stringify({
        url: 'https://file-serjbsyzif.now.sh/',
        goto: {
          timeout: 8000,
        },
      }),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
    })
    .then(() => {
      console.log('Successful test!', idx);
    })
    .catch(() => {
      console.log('Test failed!', idx);
    });
}
