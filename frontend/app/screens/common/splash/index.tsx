import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, LogBox, Platform, Pressable, SafeAreaView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';

// Types & Services
// Note: NavigationStackType is not needed with Expo Router

// Hooks
import { useAppDispatch } from '../../../hooks/useRedux';

import { navigate } from '@/app/utils/navigation';
import { check, openSettings, PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import { GETVERSIONAPICALL, LoginAPI } from '../../../services/api';
import { ClearStorage, ReadLoginData } from '../../../utils/storage';
import { styles } from './styles';
LogBox.ignoreLogs([
  'RCTBridge required dispatch_sync to load RCTAccessibilityManager',
]);

// No need for PropsType with Expo Router
const Splash = () => {
  const [splash, setSplash] = useState(true);
  const [isOutdated, setIsOutdated] = useState(false);
  const dispatch = useAppDispatch();
  const checkLocationPermission = async (onPermissionGranted: () => void) => {
    if (Platform.OS === 'ios') {
      const result = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      if (result === RESULTS.GRANTED) {
        onPermissionGranted();
      } else if (result === RESULTS.DENIED) {
        const requestResult = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        if (requestResult === RESULTS.GRANTED) {
          onPermissionGranted();
        } else {
          showPermissionDialog();
        }
      } else {
        showPermissionDialog();
      }
    } else if (Platform.OS === 'android') {
      const result = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      if (result === RESULTS.GRANTED) {
        onPermissionGranted();
      } else if (result === RESULTS.DENIED) {
        const requestResult = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        if (requestResult === RESULTS.GRANTED) {
          onPermissionGranted();
        } else {
          showPermissionDialog();
        }
      } else {
        showPermissionDialog();
      }
    } else {
      console.log('Location permission check is only for iOS and Android.');
      onPermissionGranted();
    }
  };

  const showPermissionDialog = () => {
    Alert.alert(
      'Location Permission Required',
      'This app requires location access to proceed. Please enable it in settings.',
      [
        {
          text: 'Settings',
          onPress: () => openSettings(),
        },
        {
          text: 'OK',
          onPress: () => { }, // Keep splash screen visible
        },
      ],
      { cancelable: false }
    );
  };

  const handleLogin = () => {
    checkLocationPermission(() => {
        navigate.toCommon.login();

    });
  };

  const handleSignup = () => {
    checkLocationPermission(() => {
      navigate.toCommon.signup();
    });
  };

  useEffect(() => {
    // Hide native splash screen once React component is mounted
    // This ensures seamless transition - native and React splash look identical
    SplashScreen.hideAsync().catch(() => {
      // Ignore errors if splash screen is already hidden
    });

    // Fallback: if auto-login takes too long, show login buttons
    const fallbackTimer = setTimeout(() => {
      console.warn('Auto-login timeout - showing login screen');
      setSplash(false);
    }, 15000); // 15 second max wait

    setTimeout(() => {
      autoLogin().finally(() => {
        clearTimeout(fallbackTimer);
      });
    }, 2000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  // Get version from app.json dynamically
  const CURRENT_VERSION = Constants.expoConfig?.version || '29.0.0';
  // Get environment to skip version check in local development
  const APP_ENV = Constants.expoConfig?.extra?.APP_ENV || 'production';

  /**
   * Performs auto-login by validating stored credentials with the server.
   * If the account no longer exists or credentials are invalid, clears storage
   * and shows the login screen.
   *
   * @returns true if login succeeded, false otherwise
   */
  const performAutoLogin = async (loginData: { email: string; password: string; role: number }): Promise<boolean> => {
    try {
      // Validate credentials with server - this also fetches fresh user data
      const response = await LoginAPI(
        { email: loginData.email, password: loginData.password, remember: true },
        dispatch
      );

      if (response.success === 1) {
        // Login succeeded - navigate based on user type from server response
        const userType = response.data?.user?.user_type;
        if (userType === 1) {
          navigate.toCustomer.home();
        } else {
          navigate.toChef.home();
        }
        return true;
      } else {
        // Login failed - account deleted, password changed, etc.
        console.log('Auto-login failed: Account no longer valid, clearing stored data');
        // Clear Redux state first (removes in-memory user data)
        dispatch({ type: 'USER_LOGOUT' });
        // Then clear persisted storage
        await ClearStorage();
        setSplash(false);
        return false;
      }
    } catch (error) {
      // Network error or other issue - don't clear storage, just show login
      // This prevents users from being logged out due to temporary network issues
      console.error('Auto-login error (network issue):', error);
      setSplash(false);
      return false;
    }
  };

  const autoLogin = async () => {
    try {
      // Skip version check in local development
      if (APP_ENV === 'local') {
        console.log('Local development mode: Skipping version check');
        const loginData = await ReadLoginData();
        if (loginData == null || !loginData.email || !loginData.password) {
          setSplash(false);
          return;
        }
        // Validate credentials with server before proceeding
        await performAutoLogin(loginData);
        return;
      }

      const versionResponse = await GETVERSIONAPICALL();
      console.log('Version API Response:', versionResponse);

      if (!versionResponse?.data?.[0]?.version) {
        console.error('Version information is missing from the API response.');
        setSplash(false);
        return;
      }

      if (versionResponse?.success === 1 && versionResponse?.data?.[0]?.version != CURRENT_VERSION) {
        setIsOutdated(true);
        console.log('---->>>App version is outdated. Please update to continue.');
        Alert.alert(
          'Update Required',
          `This app version is outdated. Please update to the latest version to continue.`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('https://apps.apple.com/app/1598624809'); // Replace with your App Store URL
                } else if (Platform.OS === 'android') {
                  Linking.openURL('https://play.google.com/store/apps/details?id=com.taist.app'); // Replace with your Play Store URL
                }
              },
            },
          ],
          { cancelable: false }
        );
        return; // Prevent further execution
      }

      const loginData = await ReadLoginData();
      if (loginData == null || !loginData.email || !loginData.password) {
        setSplash(false);
        return;
      }
      // Validate credentials with server before proceeding
      // This handles cases where account was deleted, password changed, etc.
      await performAutoLogin(loginData);
    } catch (error) {
      console.error('Error during version check or auto-login:', error);
      Alert.alert(
        'Error',
        'Unable to check the app version. Please try again later.',
        [{ text: 'OK' }]
      );
      setSplash(false); // Handle gracefully by stopping the splash screen
    }
  };

  if (splash) {
    return (
      <View style={[styles.splash]}>
        <Image
          style={styles.splashLogo}
          source={require('../../../assets/images/splashLogo.png')}
        />
        {isOutdated && (
          <View style={{ width: '100%', paddingHorizontal: 20  }}>
            <Text style={styles.outdatedText}>
              Your app version is outdated. Please update to continue.
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.main}>
      <Image
        style={styles.logo}
        source={require('../../../assets/images/logo-2.png')}
      />
      <View style={styles.buttonsWrapper}>
        <Pressable style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login With Email</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Signup With Email</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default Splash;