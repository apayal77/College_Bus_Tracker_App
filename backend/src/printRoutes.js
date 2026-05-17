const { initFirebase, db } = require('./config/firebase');

initFirebase();

const printRoutes = async () => {
  try {
    const routesSnap = await db().collection('routes').get();
    console.log(`=== FOUND ${routesSnap.size} ROUTES ===`);
    routesSnap.forEach(doc => {
      console.log(`Route ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
      console.log('-----------------------------------');
    });
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

printRoutes();
