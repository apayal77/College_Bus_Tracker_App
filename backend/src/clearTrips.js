const { initFirebase, db } = require('./config/firebase');

initFirebase();

const clearAllTrips = async () => {
  try {
    console.log('Fetching all trips from Firestore...');
    const tripsSnap = await db().collection('trips').get();
    
    if (tripsSnap.empty) {
      console.log('No trips found in the database. Logs are already clean!');
      process.exit(0);
    }

    console.log(`Found ${tripsSnap.size} trips. Starting batch delete...`);
    const batch = db().batch();
    
    tripsSnap.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Successfully deleted all ${tripsSnap.size} trip records from Firestore!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing trips:', error);
    process.exit(1);
  }
};

clearAllTrips();
