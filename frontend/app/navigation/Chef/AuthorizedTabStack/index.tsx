import { styles } from './styles';

import { useEffect } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

// Types
import { useAppSelector } from '../../../hooks/useRedux';

// NPM
import {
  faAngleLeft
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  createDrawerNavigator,
} from '@react-navigation/drawer';
import { RemoveUserAPI } from '../../../services/api';
import { store } from '../../../store/index';
import { performLogout } from '../../../utils/logout';
import { navigate } from '../../../utils/navigation';
import { ShowErrorToast } from '../../../utils/toast';

const Drawer = createDrawerNavigator();

const TabRedirect = () => {
  useEffect(() => {
    // Immediately navigate to Expo Router tabs when this component mounts
    navigate.toChef.tabs();
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
        navigate.toCommon.account(user, 'chef');
        break;
      case 'HowToDoIt':
        navigate.toChef.howToDoIt();
        break;
      case 'CancelApplication':
        navigate.toChef.cancelApplication();
        break;
      case 'ContactUs':
        navigate.toCommon.contactUs();
        break;
      case 'Privacy':
        navigate.toCommon.privacy();
        break;
      case 'Terms':
        navigate.toCommon.terms();
        break;
      default:
        // Fallback to traditional navigation for unmatched screens
        console.warn(`Navigation for screen ${screenName} not implemented`);
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
          onPress: () => {
            store.dispatch({ type: 'USER_LOGOUT' });
            handleDeleteAccount()
          },
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
            onPress={() => handleGotoScreen('HowToDoIt')}
            style={styles.drawerLink}>
            <Text style={styles.drawerLinkText}>HOW TO DO IT</Text>
          </TouchableOpacity>
          {user.is_pending == 1 && (
            <>
              <TouchableOpacity
                onPress={() => handleGotoScreen('CancelApplication')}
                style={styles.drawerLink}>
                <Text style={styles.drawerLinkText}>
                  CANCEL APPLICATION TO COOK
                </Text>
              </TouchableOpacity>
            </>
          )}
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
            <Text style={[styles.drawerLinkText, { color: '#fa4616' }]}>
              DELETE ACCOUNT
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </DrawerContentScrollView>
  );
};

export default DrawerStack;
