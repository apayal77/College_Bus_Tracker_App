const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const initFirebase = () => {
  if (!admin.apps.length) {
    try {
      let serviceAccount;

      // Option 1: Single JSON string variable (Common for Render/Heroku)
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } 
      // Option 2: Individual variables
      else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        serviceAccount = {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };
      } else {
        throw new Error('Missing Firebase credentials. Please set FIREBASE_SERVICE_ACCOUNT or (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY)');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log('Firebase Admin initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error.message);
      if (error.message.includes('Unexpected token')) {
        console.error('Hint: FIREBASE_SERVICE_ACCOUNT might not be a valid JSON string.');
      }
    }
  }
  return admin;
};

module.exports = {
  initFirebase,
  db: () => admin.firestore()
};
