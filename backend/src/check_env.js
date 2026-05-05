const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

console.log('--- DIAGNOSTIC CHECK ---');
console.log('Current Working Directory:', process.cwd());
console.log('__dirname:', __dirname);

const envPath = path.join(__dirname, '../..', '.env');
console.log('Looking for .env at:', envPath);

if (fs.existsSync(envPath)) {
  console.log('.env file EXISTS');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.log('dotenv ERROR:', result.error.message);
  } else {
    console.log('dotenv LOADED SUCCESSFULLY');
    console.log('FIREBASE_SERVICE_ACCOUNT_PATH:', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  }
} else {
  console.log('.env file DOES NOT EXIST at that path');
  // List files in the parent of parent directory
  const parentOfParent = path.join(__dirname, '../..');
  console.log('Files in', parentOfParent, ':', fs.readdirSync(parentOfParent));
}

console.log('------------------------');
