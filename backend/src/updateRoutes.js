const { initFirebase, db } = require('./config/firebase');

initFirebase();

const updateRoutes = async () => {
  try {
    console.log('Fetching routes from Firestore...');
    const routesRef = db().collection('routes');
    
    // 1. Update Line Bazaar Route
    const lineBazaarSnap = await routesRef.where('routeName', '==', 'Line Bazaar').get();
    if (!lineBazaarSnap.empty) {
      const doc = lineBazaarSnap.docs[0];
      console.log(`Updating Line Bazaar route (ID: ${doc.id})...`);
      
      const correctedStops = [
        { name: 'Line bazaar', latitude: 16.72886, longitude: 74.24438 },
        { name: 'Dasara chowk', latitude: 16.70222, longitude: 74.22806 },
        { name: 'Mali Colony', latitude: 16.69080, longitude: 74.23850 },
        { name: 'Rajarampuri', latitude: 16.68500, longitude: 74.24200 },
        { name: 'CSIBER', latitude: 16.68700, longitude: 74.23200 },
        { name: 'Shahu Naka', latitude: 16.68150, longitude: 74.25150 },
        { name: 'KIT', latitude: 16.66470, longitude: 74.28850 }
      ];

      await doc.ref.update({
        stops: correctedStops
      });
      console.log('✅ Successfully updated Line Bazaar stops and coordinates!');
    } else {
      console.log('⚠️ Line Bazaar route not found in Firestore.');
    }

    // 2. Update KIT- Bharati Vidyapeeth Route
    const kitBvSnap = await routesRef.where('routeName', '==', 'KIT- Bharati Vidyapeeth').get();
    if (!kitBvSnap.empty) {
      const doc = kitBvSnap.docs[0];
      console.log(`Updating KIT- Bharati Vidyapeeth route (ID: ${doc.id})...`);

      const correctedStops = [
        { name: 'KIT Main Gate', latitude: 16.6582, longitude: 74.2741 },
        { name: 'Girls Hostel', latitude: 16.6548, longitude: 74.2745 },
        { name: 'KIT Central Library', latitude: 16.6570, longitude: 74.2755 },
        { name: 'NH to Bharati Vidyapeeth', latitude: 16.65112, longitude: 74.24867 }
      ];

      await doc.ref.update({
        stops: correctedStops
      });
      console.log('✅ Successfully corrected KIT- Bharati Vidyapeeth stops and coordinates!');
    } else {
      console.log('⚠️ KIT- Bharati Vidyapeeth route not found in Firestore.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating routes:', error);
    process.exit(1);
  }
};

updateRoutes();
