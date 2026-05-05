const { db } = require('../config/firebase');

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const snapshot = await db().collection('users').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { name, phone, role, routeAssigned } = req.body;
    
    // Simple validation
    if (!name || !phone || !role) {
      return res.status(400).json({ error: 'Name, phone, and role are required' });
    }

    const newUser = {
      name,
      phone,
      role,
      routeAssigned: routeAssigned || null,
      createdAt: new Date().toISOString()
    };

    const docRef = await db().collection('users').add(newUser);
    res.status(201).json({ id: docRef.id, ...newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    await db().collection('users').doc(id).update(updates);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await db().collection('users').doc(id).delete();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
