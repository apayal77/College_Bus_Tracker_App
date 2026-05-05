const { db } = require('../config/firebase');
const { sendNotificationToRoute } = require('../services/notificationService');

// Get all trips
exports.getTrips = async (req, res) => {
  try {
    const snapshot = await db().collection('trips').get();
    const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new trip (Start Trip)
exports.startTrip = async (req, res) => {
  try {
    const { routeId, driverId, routeName } = req.body;
    
    if (!routeId || !driverId) {
      return res.status(400).json({ error: 'routeId and driverId are required' });
    }

    const newTrip = {
      routeId,
      driverId,
      status: 'active',
      startTime: new Date().toISOString(),
      endTime: null
    };

    const docRef = await db().collection('trips').add(newTrip);

    // Send Notification to Students
    sendNotificationToRoute(
      routeId, 
      'Trip Started 🚌', 
      `The bus for route ${routeName || 'assigned to you'} has started the trip!`
    );

    res.status(201).json({ id: docRef.id, ...newTrip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// End a trip
exports.endTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { routeId, routeName } = req.body; // Pass these from frontend if possible or fetch here
    
    await db().collection('trips').doc(id).update({
      status: 'completed',
      endTime: new Date().toISOString()
    });

    if (routeId) {
      sendNotificationToRoute(
        routeId, 
        'Trip Ended 🏁', 
        `The bus trip for route ${routeName || ''} has been completed.`
      );
    }
    
    res.json({ message: 'Trip ended successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
