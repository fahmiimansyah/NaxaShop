require('dotenv').config({ path: '../.env.local' });

const crypto = require('crypto');

const username = process.env.DIGIFLAZZ_USERNAME;
const apiKey = process.env.DIGIFLAZZ_DEV_KEY;

const refId = process.argv[2] || `TEST-${Date.now()}`;
const sign = crypto
  .createHash('md5')
  .update(username + apiKey + refId)
  .digest('hex');

async function main() {
  if (!username || !apiKey) {
    throw new Error('DIGIFLAZZ_USERNAME / DIGIFLAZZ_DEV_KEY belum ada di .env.local');
  }

  const response = await fetch('https://api.digiflazz.com/v1/transaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username,
      buyer_sku_code: 'test',
      customer_no: '087800001233',
      ref_id: refId,
      sign,
      testing: true
    })
  });

  const data = await response.json();

  console.log('HTTP:', response.status);
  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error('ERROR:', error);
});