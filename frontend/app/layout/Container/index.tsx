import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  Image,
  LayoutChangeEvent,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  ViewStyle
} from 'react-native';

import { styles } from './styles';

import { goBack, navigate } from '@/app/utils/navigation';
import {
  faAngleLeft,
  faBars,
  faBug,
  faMessage
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation } from '@react-navigation/native';
import { usePathname, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DrawerModal from '../../components/DrawerModal';
import CartIcon from '../../components/cartIcon';
import GoLiveToggle from '../../components/GoLiveToggle';
import { useAppSelector } from '../../hooks/useRedux';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';

// Floor for the logo/title overlay's side padding: enough for the single
// hamburger/back button on the left before anything is measured.
const MIN_SIDE_INSET = 44;

// The overlay keeps the logo centred on screen by reserving the same gutter on
// both sides, so an unusually wide action row would otherwise squeeze it to
// nothing. This caps the gutters and accepts a little overlap in that extreme
// rather than losing the logo entirely.
const MIN_LOGO_BAND = 48;
const MAX_SIDE_INSET = Math.max(
  MIN_SIDE_INSET,
  (Dimensions.get('window').width - MIN_LOGO_BAND) / 2,
);

interface IProps {
  backMode?: boolean;
  title?: string;
  rightContent?: any;
  onBack?: () => void;
  containerStyle?: ViewStyle;
  children: React.ReactNode;
}

const Container = ({
  containerStyle,
  backMode,
  title,
  rightContent,
  onBack,
  children,
}: IProps) => {
  const navigation = useNavigation();
  const segments = useSegments();
  const pathname = usePathname();
  const user = useAppSelector(x => x.user).user;

  const [showDrawerModal, setShowDrawerModal] = useState(false);
  // The centred logo/title is an overlay across the whole header, so it has to
  // reserve at least as much room as the widest side or the right-hand actions
  // sit on top of it (the cart icon was clipping the logo). Measured rather
  // than hard-coded because the action row varies: chef screens add the
  // Go Live toggle, customer screens the cart.
  const [sideInset, setSideInset] = useState(MIN_SIDE_INSET);
  const { unreadCount } = useUnreadNotifications();

  // Check if we're in a chef context (exact match to avoid matching "chefDetail" etc.)
  const isInChefContext = segments.some(segment => segment === 'chef');

  // Check if we're in a customer context (exact match to avoid false positives)
  const isInCustomerContext = segments.some(segment => segment === 'customer');
  
  // Check if we're in a tab context (within chef/(tabs) or customer/(tabs))
  const isInTabContext = segments.some(segment => String(segment).includes('(tabs)'));

  const toggleDrawer = () => {
    try {
      // Check if we're in a drawer context and try to toggle
      if (navigation && typeof (navigation as any).toggleDrawer === 'function') {
        (navigation as any).toggleDrawer();
      } else if (isInChefContext || isInCustomerContext) {
        // If we're in chef or customer context but no drawer navigation, use our custom modal
        setShowDrawerModal(true);
      } else {
        // Fallback: if not in drawer context, we could navigate to a drawer screen
        console.log('Drawer navigation not available in current context');
      }
    } catch (error) {
      console.log('Error toggling drawer:', error);
    }
  };

  // One inbox for everything: chef threads plus a "Taist" thread that holds
  // what used to live behind the bell icon.
  const handleMessagePress = () => {
    navigate.toCommon.inbox();
  };

  const handleReportIssuePress = () => {
    navigate.toCommon.reportIssue({
      origin_screen: pathname || 'unknown',
      entry_point: 'header_bug_icon',
    });
  };

  // Grow the overlay's reserved gutters to the widest action row so the logo
  // and title are centred in the space that's actually free.
  const handleActionsLayout = useCallback((e: LayoutChangeEvent) => {
    const width = Math.min(Math.ceil(e.nativeEvent.layout.width) + 8, MAX_SIDE_INSET);
    setSideInset(prev => (width > prev ? width : prev));
  }, []);

  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else {
      goBack();
    }
  };

  return (
    <SafeAreaProvider>
      {/* <Drawer open={openDrawer} toggleDrawer={toggleDrawer}> */}
      <SafeAreaView
        style={[
          styles.container,
          // Only add margin bottom when NOT in tab context and NOT in back mode
          (!isInTabContext && backMode !== true) && {marginBottom: 60},
          containerStyle,
        ]}>
        {backMode === true ? (
          <View style={styles.topHeader}>
            <View
              style={[styles.logoContainer, { paddingHorizontal: sideInset }]}
              pointerEvents="none">
              <Text style={styles.title} numberOfLines={1} testID="header.title">
                {title}
              </Text>
            </View>

            <TouchableOpacity testID="header.backButton" onPress={handleBackPress} style={styles.button}>
              <FontAwesomeIcon icon={faAngleLeft} size={20} color="#000000" />
            </TouchableOpacity>

            <View style={styles.rightActions} onLayout={handleActionsLayout}>
              {(isInChefContext || isInCustomerContext) && user?.id ? (
                <TouchableOpacity
                  testID="header.reportIssue"
                  onPress={handleReportIssuePress}
                  style={styles.button}
                  accessibilityLabel="Report issue"
                  accessibilityHint="Open the issue reporting form">
                  <FontAwesomeIcon icon={faBug} size={20} color="#000000" />
                </TouchableOpacity>
              ) : null}
              {rightContent && (
                <View style={styles.topHeaderLeft}>{rightContent}</View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.topHeader}>
            <View
              testID="header.logoContainer"
              style={[styles.logoContainer, { paddingHorizontal: sideInset }]}
              pointerEvents="none">
              <Image
                testID="header.logo"
                style={styles.logo}
                resizeMode="contain"
                source={require('../../assets/images/logo-2.png')}
              />
            </View>
            <TouchableOpacity testID="header.hamburgerMenu" onPress={toggleDrawer} style={styles.button}>
              <FontAwesomeIcon icon={faBars} size={20} color="#000000" />
            </TouchableOpacity>

            <View
              testID="header.actions"
              style={styles.rightActions}
              onLayout={handleActionsLayout}>
            {isInChefContext && user?.is_pending !== 1 && user?.is_paused !== 1 && <GoLiveToggle />}
            {isInCustomerContext && <CartIcon />}
            <TouchableOpacity
              testID="header.chatButton"
              onPress={handleMessagePress}
              style={styles.button}
              accessibilityLabel="Messages"
              accessibilityHint="Open your messages and Taist updates">
              <View>
                <FontAwesomeIcon icon={faMessage} size={20} color="#000000" />
                {unreadCount > 0 && (
                  <View testID="header.unreadDot" style={styles.unreadDot} />
                )}
              </View>
            </TouchableOpacity>
            {(isInChefContext || isInCustomerContext) && user?.id ? (
              <TouchableOpacity
                testID="header.reportIssue"
                onPress={handleReportIssuePress}
                style={styles.button}
                accessibilityLabel="Report issue"
                accessibilityHint="Open the issue reporting form">
                <FontAwesomeIcon icon={faBug} size={20} color="#000000" />
              </TouchableOpacity>
            ) : null}

            </View>

          </View>
        )}
        {children}
      </SafeAreaView>
      
      {/* Custom Drawer Modal for chef and customer screens */}
      <DrawerModal 
        visible={showDrawerModal} 
        onClose={() => setShowDrawerModal(false)} 
      />
      {/* </Drawer> */}
    </SafeAreaProvider>
  );
};

export default Container;
