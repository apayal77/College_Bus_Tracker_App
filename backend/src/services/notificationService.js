const admin = require('firebase-admin');

const sendNotificationToRoute = async (routeId, title, body, data = {}) => {
  try {
    const db = admin.firestore();
    
    // 1. Get all students assigned to this route who have an FCM token
    const studentSnapshot = await db.collection('users')
      .where('routeAssigned', '==', routeId)
      .where('role', '==', 'student')
      .get();

    const tokens = [];
    studentSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.fcmToken) {
        tokens.push(userData.fcmToken);
      }
    });

    if (tokens.length === 0) {
      console.log(`No FCM tokens found for route: ${routeId}`);
      return;
    }

    // 2. Prepare the message
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        ...data,
        routeId: routeId,
      },
      tokens: tokens,
    };

    // 3. Send Multicast Message
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`${response.successCount} messages were sent successfully for route ${routeId}`);
    
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      console.log('List of tokens that caused failures: ' + failedTokens);
    }
  } catch (error) {
    console.error('Error sending multicast notification:', error);
  }
};

module.exports = {
  sendNotificationToRoute,
};
