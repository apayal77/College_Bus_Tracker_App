const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const initFirebase = () => {
  if (!admin.apps.length) {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Firebase environment variables (PROJECT_ID, CLIENT_EMAIL, or PRIVATE_KEY)');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });

      console.log('Firebase Admin initialized successfully using environment variables.');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error.message);
    }
  }
  return admin;
};

module.exports = {
  initFirebase,
  db: () => admin.firestore()
};
