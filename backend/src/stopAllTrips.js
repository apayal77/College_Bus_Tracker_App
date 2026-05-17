const { initFirebase, db } = require('./config/firebase');

initFirebase();

const stopAllTrips = async () => {
  try {
    console.log('Querying active trips from Firestore...');
    const tripsRef = db().collection('trips');
    const snapshot = await tripsRef.where('status', '==', 'active').get();

    if (snapshot.empty) {
      console.log('🎉 No lingering active trips found in the database!');
      process.exit(0);
    }

    console.log(`Found ${snapshot.size} active trips. Stopping them now...`);

    const batch = db().batch();
    snapshot.docs.forEach((doc) => {
      const tripData = doc.data();
      console.log(`- Stopping trip: ${doc.id} (Route ID: ${tripData.routeId})`);
      
      const startTime = tripData.startTime ? new Date(tripData.startTime).getTime() : Date.now();
      const durationMs = Date.now() - startTime;

      batch.update(doc.ref, {
        status: 'completed',
        endTime: new Date().toISOString(),
        summary: {
          routeName: tripData.summary?.routeName || 'Stopped by Admin',
          totalStops: tripData.summary?.totalStops || 0,
          visitedStops: tripData.summary?.visitedStops || [],
          visitedCount: tripData.summary?.visitedCount || 0,
          durationMs: durationMs > 0 ? durationMs : 0
        }
      });
    });

    await batch.commit();
    console.log('✅ Successfully stopped all active trips in the database!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error stopping active trips:', error);
    process.exit(1);
  }
};

stopAllTrips();
