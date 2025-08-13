const fetch = require('node-fetch');

async function extractPriceId() {
  try {
    const response = await fetch('http://localhost:5000/api/extract-price-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentLinkUrl: 'https://buy.stripe.com/eVq28s80Qg2n2g401Ues002'
      })
    });

    const data = await response.json();
    console.log('Price ID extraído:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

extractPriceId();