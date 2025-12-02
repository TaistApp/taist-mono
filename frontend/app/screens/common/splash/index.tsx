import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, LogBox, Platform, Pressable, SafeAreaView, Text, View } from 'react-native';

// Types & Services
// Note: NavigationStackType is not needed with Expo Router

// Hooks
import { useAppDispatch } from '../../../hooks/useRedux';

import { navigate } from '@/app/utils/navigation';
import { check, openSettings, PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import { GETVERSIONAPICALL } from '../../../services/api';
import { ReadLoginData } from '../../../utils/storage';
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
    setTimeout(() => {
      autoLogin();
    }, 2000);
  }, []);

  const CURRENT_VERSION = '28.0.3';
  const REQUIRED_VERSION = '28.0.3';

  const autoLogin = async () => {
    try {
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
      if (loginData == null) {
        setSplash(false);
        return;
      } else {
        // Navigate to appropriate home screen based on user role
        if (loginData?.role == 1) {
          navigate.toCustomer.home();
        } else {
          navigate.toChef.home();
        }
      }
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