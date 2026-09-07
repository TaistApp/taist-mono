import { styles } from './styles';

import { Alert, Text, TouchableOpacity, View } from 'react-native';

// Screens

// Navigators
// import AccountStackNavigation from '../StackNavigations/AccountStackNavigation';
// import HomeStackNavigation from '../StackNavigations/HomeStackNavigation';
// import OrdersStackNavigation from '../StackNavigations/OrdersStackNavigation';

// Types
import { NavigationStackType } from '../../../types/index';

// NPM

// Features

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Note: Screen components will be imported as needed or kept as traditional navigation
import { faAngleLeft } from '@fortawesome/free-solid-svg-icons';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  createDrawerNavigator,
} from '@react-navigation/drawer';
import { useEffect } from 'react';
import { useAppSelector } from '../../../hooks/useRedux';
import { RemoveUserAPI } from '../../../services/api';
import { performLogout } from '../../../utils/logout';
import { navigate } from '../../../utils/navigation';
import { ShowErrorToast } from '../../../utils/toast';

const Drawer = createDrawerNavigator();

const TabRedirect = () => {
  useEffect(() => {
    // Immediately navigate to Expo Router tabs when this component mounts
    navigate.toCustomer.tabs();
  }, []);

  return null; // This component doesn't render anything
};

const DrawerStack = () => {
  return (
    <Drawer.Navigator
      initialRouteName="Tab"
      screenOptions={{ headerShown: false, drawerType: 'front' }}
      drawerContent={props => <DrawerContent {...props} />}>
      <Drawer.Screen name="Tab" component={TabRedirect} />
    </Drawer.Navigator>
  );
};

const DrawerContent = (props: DrawerContentComponentProps) => {
  const user = useAppSelector(x => x.user.user);

  const handleCloseDrawer = () => {
    props.navigation.toggleDrawer();
  };

  const handleGotoScreen = (screenName: string) => {
    props.navigation.closeDrawer();
    
    // Use Expo Router for navigation based on screen name
    switch (screenName) {
      case 'Account':
        navigate.toCommon.account(user, 'customer');
        break;
      case 'EarnByCooking':
        // Keep traditional navigation for screens that don't exist in Expo Router structure
        props.navigation.navigate(screenName);
        break;
      case 'ContactUs':
        navigate.toCommon.contactUs();
        break;
      case 'Privacy':
        // Keep traditional navigation for screens that don't exist in Expo Router structure
        props.navigation.navigate(screenName);
        break;
      case 'Terms':
        navigate.toCommon.terms();
        break;
      default:
        // Fallback to traditional navigation for unmatched screens
        props.navigation.navigate(screenName);
    }
  };

  const handleLogOut = () => {
    performLogout();
  };

  const showDeleteAccountPopup = () => {
    Alert.alert(
      'Delete Account',
      'Permanently delete your account and all associated data.\nThis action cannot be undone.',
      [
        {
          text: 'CANCEL',
          onPress: () => false,
        },
        {
          text: 'DELETE',
          onPress: () => handleDeleteAccount(),
        },
      ],
    );
  };

  const handleDeleteAccount = async () => {
    const resp = await RemoveUserAPI(user);
    if (resp.success !== 1) {
      ShowErrorToast(resp.error || resp.message);
      return;
    }
    await performLogout();
  };

  return (
    <DrawerContentScrollView>
      <View style={styles.drawerWrapper}>
        <TouchableOpacity
          onPress={handleCloseDrawer}
          style={styles.drawerClose}>
          <FontAwesomeIcon icon={faAngleLeft} size={20} color="#000000" />
        </TouchableOpacity>
        <View style={styles.drawerNavigationWrapper}>
          <TouchableOpacity
            onPress={() => handleGotoScreen('Account')}
            style={styles.drawerLink}>
            <Text style={styles.drawerLinkText}>ACCOUNT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleGotoScreen('EarnByCooking')}
            style={styles.drawerLink}>
            <Text style={styles.drawerLinkText}>EARN BY COOKING</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleGotoScreen('ContactUs')}
            style={styles.drawerLink}>
            <Text style={styles.drawerLinkText}>CONTACT TAIST</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleGotoScreen('Privacy')}
            style={styles.drawerLink}>
            <Text style={styles.drawerLinkText}>PRIVACY POLICY</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleGotoScreen('Terms')}
            style={styles.drawerLink}>
            <Text style={styles.drawerLinkText}>TERMS AND CONDITIONS</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogOut} style={styles.drawerLink}>
            <Text style={styles.drawerLinkText}>LOGOUT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={showDeleteAccountPopup}
            style={styles.drawerLink}>
            <Text style={[styles.drawerLinkText, {color: '#fa4616'}]}>
              DELETE ACCOUNT
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </DrawerContentScrollView>
  );
};

const AuthorizedStack = () => {
  const Stack = createNativeStackNavigator<NavigationStackType>();
  return (
    <Stack.Navigator initialRouteName="Drawer">
      <Stack.Screen
        name="Drawer"
        component={DrawerStack}
        options={{headerShown: false, animation: 'fade'}}
      />
      {/* 
        Note: Other screens like OrderDetail, EarnByCooking, etc. 
        should be handled by Expo Router or imported individually as needed
        For now, keeping only the drawer navigation
      */}
    </Stack.Navigator>
  );
};

export default AuthorizedStack;
