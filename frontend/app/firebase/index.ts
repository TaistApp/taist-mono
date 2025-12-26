import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { PERMISSIONS, requestMultiple } from 'react-native-permissions';
import Toast from 'react-native-toast-message';
import { useAppDispatch } from '../hooks/useRedux';
import { setUser } from '../reducers/userSlice';
import { GetUserById } from '../services/api';
import { store } from '../store';
import { navigate } from '../utils/navigation';

let ORDER_ID = -1;
let isNavigationReady = false;

// Helper function to check if notification is the chef activation notification
// Backend sends title "Chef Account Activated" (not "You've Been Approved!")
const isChefActivationNotification = (remoteMessage: any): boolean => {
  const title = remoteMessage?.notification?.title;
  return title === "Chef Account Activated";
};

// Helper function to refresh user data from the server
// Called when chef receives activation notification to immediately update UI
const refreshUserData = async () => {
  try {
    const state = store.getState();
    const userId = state.user?.user?.id;
    if (userId) {
      console.log('Refreshing user data after activation notification...');
      const response = await GetUserById(userId.toString());
      if (response.success === 1) {
        store.dispatch(setUser(response.data));
        console.log('User data refreshed successfully, is_pending:', response.data.is_pending);
      }
    }
  } catch (error) {
    console.warn('Error refreshing user data:', error);
  }
};

// Helper function to show local notification using Expo
const showLocalNotification = async (title: string, body: string, data?: any) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.warn('Local notification error:', error);
  }
};

// Helper function to check if navigation is ready and user is authenticated
const isReadyToNavigate = () => {
  // Add a small delay to ensure navigation is fully initialized
  return isNavigationReady;
};

export const InitializeNotification = () => {
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    // Configure expo-notifications handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    
    // Set navigation as ready after a small delay
    const timer = setTimeout(() => {
      isNavigationReady = true;
    }, 3000); // Give enough time for initial app setup
    
    RequestUserPermission();
    firebaseActions();
    
    return () => {
      clearTimeout(timer);
    };
  }, []);
  
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('>>>FCM FRONT>>>', remoteMessage);

      const body = remoteMessage.data?.body;
      const parsedBody = (() => {
        try {
          // Check if the body is a valid JSON string
          if (typeof body === 'string' && body.trim().startsWith('{') && body.trim().endsWith('}')) {
            return JSON.parse(body);
          }
          // If not valid JSON, return the body as-is
          return body;
        } catch (error) {
          console.warn('JSON parse error:', error);
          return body; // Return the original body if parsing fails
        }
      })();
      
      if (remoteMessage && remoteMessage.notification) {
        const pressMethod = () => {
          // Add navigation guard
          if (!isReadyToNavigate()) {
            console.log('Navigation not ready, skipping notification navigation');
            return;
          }
          
          if (remoteMessage?.data?.role == 'chef') {
            navigate.toChef.orderDetailFromNotification({
              orderId: (remoteMessage?.data?.order_id || '0').toString(),
              title: remoteMessage?.notification?.title,
              ratings: parsedBody.ratings ?? 'N/A',
              review: parsedBody.review ?? 'N/A',
              tip: parsedBody.tip ?? 'N/A',
            });
          } else {
            // For customer, create a basic order object with the ID
            const orderInfo = {
              id: parseInt((remoteMessage?.data?.order_id || '0').toString()),
            } as any; // Use any type to bypass strict typing for minimal order object
            navigate.toCustomer.orderDetail(orderInfo);
          }
        }

        Toast.show({
          type: 'info',
          text1: remoteMessage.notification?.title ?? '',
          position: 'bottom',
          visibilityTime: 7000,
          onPress: !isChefActivationNotification(remoteMessage) ? pressMethod : () => { },
        });

        // If chef was just approved, refresh user data to update UI immediately
        if (isChefActivationNotification(remoteMessage)) {
          await refreshUserData();
        }

        // Also show as local notification if the app is in foreground
        await showLocalNotification(
          remoteMessage.notification?.title ?? 'New Notification',
          remoteMessage.notification?.body ?? '',
          remoteMessage.data
        );
      }

      // if (remoteMessage.data?.order_id) {
      //   const order_id = parseInt(remoteMessage.data.order_id.toString());
      //   console.log('>>FCM_ORDER_ID>>', remoteMessage.data.order_id, order_id);
      //   await Delay(1000);
      //   dispatch(
      //     setNotificationOrderId({
      //       notification_id: remoteMessage.messageId ?? '',
      //       notification_order_id: order_id,
      //     }),
      //   );
      // }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('>>>FCM BACKGROUND>>>', JSON.stringify(remoteMessage));
      // if (remoteMessage.data?.order_id) {
      //   const order_id = parseInt(remoteMessage.data.order_id.toString());
      //   dispatch(
      //     setNotificationOrderId({
      //       notification_id: remoteMessage.messageId ?? '',
      //       notification_order_id: order_id,
      //     }),
      //   );
      // }
    });
  }, []);

  // useEffect(() => {
  //   (async () => {
  //     const order_id = await AsyncStorage.getItem('FCM_BG_MSG_ORDER_ID');
  //     if (order_id && order_id !== null && order_id !== '-1') {
  //       dispatch(
  //         setNotificationOrderId({
  //           notification_id: '',
  //           notification_order_id: parseInt(order_id),
  //         }),
  //       );
  //       AsyncStorage.setItem('FCM_BG_MSG_ORDER_ID', '-1');
  //     }
  //   })();
  // }, []);
  
  return null; // This component doesn't render anything visual
};

const RequestUserPermission = async () => {
  console.log('>>>RequestUserPermission>>>', Platform.OS, Platform.Version);
  
  // Request Expo notifications permission first
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    console.log('Expo notifications permission status:', status);
  } catch (error) {
    console.warn('Expo notifications permission error:', error);
  }
  
  if (Platform.OS === 'android') {
    const granted = await requestMultiple([
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    ]);
    console.log('>>>>Android Permission', granted);
  } else if (Platform.OS === 'ios') {
    await requestMultiple([PERMISSIONS.IOS.LOCATION_ALWAYS]);
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('>>>>Authorization status:', authStatus);
    }
  }
};

export const GetFCMToken = async () => {
  try {
    // await messaging().registerDeviceForRemoteMessages();
    const fcmToken = await messaging().getToken();
    console.log('FCM token: ', fcmToken);

    // Also get Expo push token for local notifications
    try {
      const expoPushToken = await Notifications.getExpoPushTokenAsync();
      console.log('Expo push token: ', expoPushToken.data);
    } catch (expoError) {
      console.warn('Expo push token error:', expoError);
    }

    return fcmToken;
  } catch (error) {
    console.warn('FCM RegisterError', error);
    return '';
  }
};

export const SubscribeToTopic = async (topic: string) => {
  try {
    await messaging().subscribeToTopic(topic);
  } catch (error) {
    console.warn('TopicError', error);
  }
};

export const FCMBackgroundMessageHandler = () => {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('>>>FCM BACKGROUND>>>', JSON.stringify(remoteMessage));
    if (remoteMessage.data?.order_id) {
      ORDER_ID = parseInt(JSON.stringify(remoteMessage.data.order_id));
    } else {
      ORDER_ID = -1;
    }
  });
};

export const firebaseActions = () => {
  // Action from Background State both Android & iOS
  messaging().onNotificationOpenedApp(async remoteMessage => {
    console.log('remoteMessage clicked in the background', remoteMessage);

    // If chef was just approved, refresh user data and stay on current screen
    // (activation notification has no order to show - UI updates via Redux)
    if (isChefActivationNotification(remoteMessage)) {
      await refreshUserData();
      return; // Don't navigate - just let the UI update in place
    }

    // Add navigation guard with delay
    setTimeout(() => {
      if (!isReadyToNavigate()) {
        console.log('Navigation not ready, delaying notification navigation');
        // Retry after additional delay
        setTimeout(() => {
          if (isReadyToNavigate() && remoteMessage?.data && Object.keys(remoteMessage.data).length > 0) {
            handleNotificationNavigation(remoteMessage);
          }
        }, 2000);
        return;
      }

      if (remoteMessage?.data && Object.keys(remoteMessage.data).length > 0) {
        handleNotificationNavigation(remoteMessage);
      }
    }, 1000); // Initial delay to ensure app is ready
  });

  // Action from Quite/Killed State both Android & iOS
  messaging()
    .getInitialNotification()
    .then(async remoteMessage => {
      console.log(
        'REMOTE MESSAGE ON CLICKED IN THE QUIT STATE: ',
        remoteMessage,
      );

      // If chef was just approved, refresh user data and stay on current screen
      // (activation notification has no order to show - UI updates via Redux)
      if (isChefActivationNotification(remoteMessage)) {
        // Wait a bit for store to be rehydrated before refreshing
        setTimeout(async () => {
          await refreshUserData();
        }, 2000);
        return; // Don't navigate - just let the UI update in place
      }

      if (remoteMessage?.data && Object.keys(remoteMessage.data).length > 0) {
        if (remoteMessage?.data) {
          console.log('>>>REMOTE .... MESSAGE DATA>>>', remoteMessage);
        }

        // Add longer delay for killed state as app needs more time to initialize
        setTimeout(() => {
          if (isReadyToNavigate()) {
            handleNotificationNavigation(remoteMessage);
          } else {
            console.log('Navigation not ready after killed state, skipping');
          }
        }, 6000); // Longer delay for killed state
      }
    });
};

// Helper function to handle notification navigation
const handleNotificationNavigation = (remoteMessage: any) => {
  try {
    if (remoteMessage?.data?.role == 'chef') {
      const body = remoteMessage.data?.body;
      const parsedBody = (() => {
        try {
          // Check if the body is a valid JSON string
          if (typeof body === 'string' && body.trim().startsWith('{') && body.trim().endsWith('}')) {
            return JSON.parse(body);
          }
          // If not valid JSON, return the body as-is
          return body;
        } catch (error) {
          console.warn('JSON parse error:', error);
          return body; // Return the original body if parsing fails
        }
      })();
      
      console.log('>>>Chef Role notification navigation>>>', JSON.stringify(remoteMessage));
      navigate.toChef.orderDetailFromNotification({
        orderId: (remoteMessage?.data?.order_id || '0').toString(),
        title: remoteMessage?.notification?.title,
        ratings: parsedBody.ratings ?? 'N/A',
        review: parsedBody.review ?? 'N/A',
        tip: parsedBody.tip ?? 'N/A',
      });
    } else {
      console.log('>>>Customer Role notification navigation>>>', JSON.stringify(remoteMessage));
      // For customer, create a basic order object with the ID
      const orderInfo = {
        id: parseInt((remoteMessage?.data?.order_id || '0').toString()),
      } as any; // Use any type to bypass strict typing for minimal order object
      navigate.toCustomer.orderDetail(orderInfo);
    }
  } catch (error) {
    console.error('Error in notification navigation:', error);
  }
};
