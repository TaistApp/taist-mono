import { faAngleLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useSegments } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { GetChefOrdersAPI, HTML_URL, PauseAccountAPI, RemoveUserAPI } from '../../services/api';
import { store } from '../../store';
import { navigate } from '../../utils/navigation';
import { ClearStorage } from '../../utils/storage';
import { ShowErrorToast, ShowSuccessToast } from '../../utils/toast';

interface DrawerModalProps {
  visible: boolean;
  onClose: () => void;
}

const DrawerModal: React.FC<DrawerModalProps> = ({ visible, onClose }) => {
  const user = useAppSelector(x => x.user.user);
  const dispatch = useAppDispatch();
  const segments = useSegments();
  const slideAnim = useRef(new Animated.Value(-300)).current; // Start off-screen to the left
  const [modalVisible, setModalVisible] = useState(false);
  
  // Determine if we're in chef or customer context
  const isInChefContext = segments.some(segment => segment.includes('chef'));
  const isInCustomerContext = segments.some(segment => segment.includes('customer'));

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      // Slide in from left
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide out to left
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Close modal after animation completes
        setModalVisible(false);
      });
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    // Start the close animation
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Call onClose after animation completes
      setModalVisible(false);
      onClose();
    });
  };

  const handleOpenLegal = (page: 'privacy' | 'terms') => {
    // Close drawer, wait for modal to fully dismiss, then open browser directly.
    // Opening via an intermediate screen fails because SFSafariViewController
    // can't present while the RN Modal is still dismissing.
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      onClose();
      setTimeout(() => {
        WebBrowser.openBrowserAsync(`${HTML_URL}${page}.html`);
      }, 500);
    });
  };

  const handleGotoScreen = (screenName: string) => {
    handleClose(); // Close the drawer with animation first

    // Add a small delay to ensure smooth transition
    setTimeout(() => {
      // Use Expo Router for navigation based on screen name
      switch (screenName) {
        case 'Account':
          // Navigate to the appropriate account tab instead of common account
          if (isInChefContext) {
            navigate.toCommon.account(user, 'chef');
          } else if (isInCustomerContext) {
            // For customer, navigate to customer account tab
            navigate.toCustomer.account();

          } else {
            // Fallback to common account
            const userType = user?.user_type === 2 ? 'chef' : 'customer';
            navigate.toCommon.account(user, userType);
          }
          break;
        case 'HowToDoIt':
          navigate.toChef.howToDoIt();
          break;
        case 'CancelApplication':
          navigate.toChef.cancelApplication();
          break;
        case 'EarnByCooking':
          navigate.toCustomer.earnByCooking();
          break;
        case 'ContactUs':
          navigate.toCommon.contactUs();
          break;
        default:
          console.warn(`Navigation for screen ${screenName} not implemented`);
      }
    }, 150);
  };

  const handleLogOut = () => {
    handleClose();
    setTimeout(() => {
      ClearStorage();
      store.dispatch({ type: 'USER_LOGOUT' });
      navigate.toCommon.splash();
    }, 150);
  };

  const showDeleteAccountPopup = () => {
    // For chefs, offer the reversible "pause" as a softer alternative to the
    // permanent delete so they don't lose their profile, menus, and reviews.
    const buttons: any[] = [
      {
        text: 'CANCEL',
        style: 'cancel',
        onPress: () => false,
      },
    ];

    if (isInChefContext && user?.is_paused != 1) {
      buttons.push({
        text: 'PAUSE INSTEAD',
        onPress: () => showPauseAccountPopup(),
      });
    }

    buttons.push({
      text: 'DELETE',
      style: 'destructive',
      onPress: () => {
        store.dispatch({ type: 'USER_LOGOUT' });
        handleDeleteAccount();
      },
    });

    Alert.alert(
      'Delete Account',
      isInChefContext
        ? 'Permanently delete your account and all associated data, including your menus and reviews. This cannot be undone.\n\nJust need a break? Pause your account instead — you stay hidden from customers and stop reminders, and can reactivate anytime.'
        : 'Permanently delete your account and all associated data.\nThis action cannot be undone.',
      buttons,
    );
  };

  const handleDeleteAccount = async () => {
    const resp = await RemoveUserAPI(user);
    if (resp.success !== 1) {
      ShowErrorToast(resp.error || resp.message);
      return;
    }
    ClearStorage();
    navigate.toCommon.splash();
  };

  const showPauseAccountPopup = () => {
    Alert.alert(
      'Pause Account',
      'Your profile will be hidden from customers and you\'ll stop getting availability reminders. Your menus and reviews are kept, and you can reactivate anytime from your home screen.',
      [
        {
          text: 'CANCEL',
          style: 'cancel',
          onPress: () => false,
        },
        {
          text: 'PAUSE',
          onPress: () => handlePauseAccount(),
        },
      ],
    );
  };

  const handlePauseAccount = async () => {
    // Block pausing while the chef still has commitments to customers:
    // open requests (status 1) or accepted/upcoming orders (status 2 or 7).
    const now = Math.floor(Date.now() / 1000);
    const ordersResp = await GetChefOrdersAPI({
      user_id: user?.id ?? 0,
      start_time: 0,
      end_time: now + 60 * 60 * 24 * 365,
    });
    if (ordersResp?.success === 1) {
      const hasActiveOrder = (ordersResp.data || []).some(
        (o: any) => o.status == 1 || o.status == 2 || o.status == 7,
      );
      if (hasActiveOrder) {
        Alert.alert(
          'Active Orders',
          'You have open order requests or upcoming orders. Please complete or cancel them before pausing your account.',
        );
        return;
      }
    }

    const resp = await PauseAccountAPI(user, dispatch);
    if (resp.success !== 1) {
      ShowErrorToast(resp.error || resp.message);
      return;
    }
    ShowSuccessToast('Your account is paused. Reactivate anytime.');
    handleClose();
    setTimeout(() => navigate.toChef.tabs(), 150);
  };

  return (
    <Modal
      visible={modalVisible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        accessible={false}
        onPress={handleClose}>
        <Animated.View
          accessible={false}
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }]
            }
          ]}>
          <TouchableOpacity
            activeOpacity={1}
            accessible={false}
            onPress={(e) => e.stopPropagation()}
            style={styles.drawerTouchable}>
            <View style={styles.drawerHeader}>
              <TouchableOpacity testID="drawer.closeButton" onPress={handleClose} style={styles.closeButton}>
                <FontAwesomeIcon icon={faAngleLeft} size={20} color="#000000" />
              </TouchableOpacity>
            </View>
          
            <View accessible={false} style={styles.drawerContent}>
            <TouchableOpacity
              testID="drawer.account"
              onPress={() => handleGotoScreen('Account')}
              style={styles.drawerItem}>
              <Text style={styles.drawerItemText}>ACCOUNT</Text>
            </TouchableOpacity>
            
            {/* Chef-specific menu items */}
            {isInChefContext && (
              <>
                <TouchableOpacity
                  testID="drawer.howToDoIt"
                  onPress={() => handleGotoScreen('HowToDoIt')}
                  style={styles.drawerItem}>
                  <Text style={styles.drawerItemText}>HOW TO DO IT</Text>
                </TouchableOpacity>
                
                {user.is_pending == 1 && (
                  <TouchableOpacity
                    testID="drawer.cancelApplication"
                    onPress={() => handleGotoScreen('CancelApplication')}
                    style={styles.drawerItem}>
                    <Text style={styles.drawerItemText}>CANCEL APPLICATION TO COOK</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            
            {/* Customer-specific menu items */}
            {/* Hidden per TMA-000 */}
            {/* {isInCustomerContext && (
              <TouchableOpacity
                onPress={() => handleGotoScreen('EarnByCooking')}
                style={styles.drawerItem}>
                <Text style={styles.drawerItemText}>EARN BY COOKING</Text>
              </TouchableOpacity>
            )} */}
            
            {/* Hidden per TMA-000 */}
            {/* <TouchableOpacity
              onPress={() => handleGotoScreen('ContactUs')}
              style={styles.drawerItem}>
              <Text style={styles.drawerItemText}>CONTACT TAIST</Text>
            </TouchableOpacity> */}
            
            <TouchableOpacity
              testID="drawer.privacyPolicy"
              onPress={() => handleOpenLegal('privacy')}
              style={styles.drawerItem}>
              <Text style={styles.drawerItemText}>PRIVACY POLICY</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="drawer.termsAndConditions"
              onPress={() => handleOpenLegal('terms')}
              style={styles.drawerItem}>
              <Text style={styles.drawerItemText}>TERMS AND CONDITIONS</Text>
            </TouchableOpacity>
            
            <TouchableOpacity testID="drawer.logout" onPress={handleLogOut} style={styles.drawerItem}>
              <Text style={styles.drawerItemText}>LOGOUT</Text>
            </TouchableOpacity>

            {isInChefContext && user?.is_paused != 1 && (
              <TouchableOpacity
                testID="drawer.pauseAccount"
                onPress={showPauseAccountPopup}
                style={styles.drawerItem}>
                <Text style={styles.drawerItemText}>PAUSE ACCOUNT</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              testID="drawer.deleteAccount"
              onPress={showDeleteAccountPopup}
              style={styles.drawerItem}>
              <Text style={[styles.drawerItemText, { color: '#fa4616' }]}>DELETE ACCOUNT</Text>
            </TouchableOpacity>
          </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  drawer: {
    backgroundColor: '#ffffff',
    width: 300,
    height: '100%',
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drawerTouchable: {
    flex: 1,
    width: '100%',
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  drawerContent: {
    flex: 1,
    paddingTop: 20,
  },
  drawerItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

export default DrawerModal;
