import React, { useState } from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  ViewStyle
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from './styles';

import { goBack, navigate } from '@/app/utils/navigation';
import {
  faAngleLeft,
  faBars,
  faBell,
  faMessage
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation } from '@react-navigation/native';
import { useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DrawerModal from '../../components/DrawerModal';
import CartIcon from '../../components/cartIcon';
import GoLiveToggle from '../../components/GoLiveToggle';
import { useAppSelector } from '../../hooks/useRedux';

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
  const router = useRouter();
  const navigation = useNavigation();
  const segments = useSegments();
  const user = useAppSelector(x => x.user).user;

  const [openDrawer, setOpenDrawer] = useState(false);
  const [showDrawerModal, setShowDrawerModal] = useState(false);

  // Check if we're in a chef context (exact match to avoid matching "chefDetail" etc.)
  const isInChefContext = segments.some(segment => segment === 'chef');

  // Check if we're in a customer context (exact match to avoid false positives)
  const isInCustomerContext = segments.some(segment => segment === 'customer');
  
  // Check if we're in a tab context (within chef/(tabs) or customer/(tabs))
  const isInTabContext = segments.some(segment => String(segment).includes('(tabs)'));
  
  // Debug logging
  console.log('Container segments:', segments);
  console.log('isInTabContext:', isInTabContext);
  console.log('isInChefContext:', isInChefContext);
  console.log('isInCustomerContext:', isInCustomerContext);

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

  const handleMessagePress = () => {
    navigate.toCommon.inbox();
  };
  
  const handleNotificationPress = () => {
    navigate.toCommon.notification();
  };

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
            <View style={styles.logoContainer}>
              <Text style={styles.title}>{title}</Text>
            </View>

            <TouchableOpacity onPress={handleBackPress} style={styles.button}>
              <FontAwesomeIcon icon={faAngleLeft} size={20} color="#000000" />
            </TouchableOpacity>

            {rightContent && (
              <View style={styles.topHeaderLeft}>{rightContent}</View>
            )}
          </View>
        ) : (
          <View style={styles.topHeader}>
            <View style={styles.logoContainer}>
              <Image
                style={styles.logo}
                source={require('../../assets/images/logo-2.png')}
              />
            </View>
            <TouchableOpacity onPress={toggleDrawer} style={styles.button}>
              <FontAwesomeIcon icon={faBars} size={20} color="#000000" />
            </TouchableOpacity>

            <View style={{
              flexDirection:'row',
              gap: 4,
              alignItems: 'center',
            }}>
            {isInChefContext && user?.is_pending !== 1 && <GoLiveToggle />}
            {isInCustomerContext && <CartIcon />}
            <TouchableOpacity
              onPress={handleMessagePress}
              style={styles.button}>
              <FontAwesomeIcon icon={faMessage} size={20} color="#000000" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNotificationPress}
              style={styles.button}>
              <FontAwesomeIcon icon={faBell} size={20} color="#000000" />
            </TouchableOpacity>

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
