const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Look for .env in the folder where the command is running (backend root)
const envPath = path.join(process.cwd(), '.env');
dotenv.config({ path: envPath });

// BRUTE FORCE FALLBACK: If dotenv failed, read the file manually
if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  for (let line of lines) {
    line = line.trim();
    // Ignore comments and empty lines
    if (line.startsWith('#') || !line.includes('=')) continue;
    
    const [key, ...valueParts] = line.split('=');
    if (key.trim() === 'FIREBASE_SERVICE_ACCOUNT_PATH') {
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH = valueParts.join('=').trim();
      break;
    }
  }
}



const initFirebase = () => {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountPath) {
    try {
      const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);
      console.log(`Loading service account from: ${resolvedPath}`);
      
      const fileContent = fs.readFileSync(resolvedPath, 'utf8');
      const serviceAccount = JSON.parse(fileContent);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      console.log('Firebase Admin initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error.message);
    }

  } else {
    console.warn('WARNING: FIREBASE_SERVICE_ACCOUNT_PATH not set. Firebase features will not function.');
  }

  return admin;
};

module.exports = {
  initFirebase,
  db: () => admin.firestore()
};
