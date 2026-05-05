import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import { Platform, Alert } from 'react-native';

export const NotificationService = {
  // 1. Request User Permission
  requestUserPermission: async (userId: string) => {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      await NotificationService.getToken(userId);
    }
  },

  // 2. Get and Save FCM Token
  getToken: async (userId: string) => {
    try {
      // Get the device token
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        console.log('FCM Token:', fcmToken);
        // Save token to Firestore user document
        await firestore().collection('users').doc(userId).update({
          fcmToken: fcmToken,
          lastTokenUpdate: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  },

  // 3. Setup Notification Listeners
  setupListeners: () => {
    // A. Foreground state messages
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));
      Alert.alert(
        remoteMessage.notification?.title || 'Notification',
        remoteMessage.notification?.body || ''
      );
    });

    // B. Handle background/quit state notifications (when user clicks)
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background state:', remoteMessage.notification);
    });

    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('Notification caused app to open from quit state:', remoteMessage.notification);
      }
    });

    return unsubscribe;
  }
};
