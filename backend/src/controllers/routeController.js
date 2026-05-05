const { db } = require('../config/firebase');

// Get all routes
exports.getRoutes = async (req, res) => {
  try {
    const snapshot = await db().collection('routes').get();
    const routes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new route
exports.createRoute = async (req, res) => {
  try {
    const { routeName, stops, driverId, studentIds } = req.body;
    
    if (!routeName || !stops) {
      return res.status(400).json({ error: 'routeName and stops are required' });
    }

    const newRoute = {
      routeName,
      stops: stops || [], // Array of stop names or objects
      driverId: driverId || null,
      studentIds: studentIds || [],
      createdAt: new Date().toISOString()
    };

    const docRef = await db().collection('routes').add(newRoute);
    res.status(201).json({ id: docRef.id, ...newRoute });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update route
exports.updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    await db().collection('routes').doc(id).update(updates);
    res.json({ message: 'Route updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete route
exports.deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;
    await db().collection('routes').doc(id).delete();
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
