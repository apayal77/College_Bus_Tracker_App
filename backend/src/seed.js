const { initFirebase, db } = require('./config/firebase');

initFirebase();


const seedData = async () => {
  try {
    console.log('Seeding data...');

    // 1. Clear existing data (optional, but good for a fresh start)
    // Be careful with this in production!
    
    // 2. Seed Users
    const users = [
      { name: 'Admin User', phone: '+919999999999', role: 'admin' },
      { name: 'Test Driver', phone: '+911234567890', role: 'driver', routeAssigned: 'KIT' },
      { name: 'Driver John', phone: '+918888888888', role: 'driver', routeAssigned: 'Route 1 - North Campus' },
      { name: 'Student Alice', phone: '+917777777777', role: 'student', routeAssigned: 'Route 1 - North Campus' }
    ];

    for (const user of users) {
      await db().collection('users').add(user);
      console.log(`Added user: ${user.name}`);
    }

    // 3. Seed Routes
    const routes = [
      {
        routeName: 'Route 1 - North Campus',
        stops: ['Main Gate', 'Library', 'Block A', 'Hostel 1'],
        studentIds: []
      },
      {
        routeName: 'KIT',
        stops: ['Station', 'Campus Gate', 'Library', 'Block C'],
        studentIds: []
      }
    ];

    for (const route of routes) {
      await db().collection('routes').add(route);
      console.log(`Added route: ${route.routeName}`);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
