import { faAddressCard, faBookBookmark, faCreditCard, faSackDollar, faHouse } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavigationItem } from '../../../features/navigation';
import { AppColors } from '../../../../constants/theme';
export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: AppColors.background,
          borderTopWidth: 1,
          borderTopColor: AppColors.border,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tab bar since it's just a redirect
        }}
      />
      
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomNavigationItem
              focused={focused}
              icon={
                <FontAwesomeIcon
                  icon={faHouse}
                  color={focused ? AppColors.primary : AppColors.textSecondary}
                  size={20}
                />
              }
            />
          ),
          tabBarLabel: ({ focused }: any) => (
            <Text
              style={{
                color: focused ? AppColors.primary : AppColors.textSecondary,
                fontSize: 11,
                fontWeight: '700',
              }}>
              HOME
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomNavigationItem
              focused={focused}
              icon={
                <FontAwesomeIcon
                  icon={faCreditCard}
                  color={focused ? AppColors.primary : AppColors.textSecondary}
                  size={20}
                />
              }
            />
          ),
          tabBarLabel: ({ focused }: any) => (
            <Text
              style={{
                color: focused ? AppColors.primary : AppColors.textSecondary,
                fontSize: 11,
                fontWeight: '700',
              }}>
              ORDERS
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="menu"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomNavigationItem
              focused={focused}
              icon={
                <FontAwesomeIcon
                  icon={faBookBookmark}
                  color={focused ? AppColors.primary : AppColors.textSecondary}
                  size={20}
                />
              }
            />
          ),
          tabBarLabel: ({ focused }: any) => (
            <Text
              style={{
                color: focused ? AppColors.primary : AppColors.textSecondary,
                fontSize: 11,
                fontWeight: '700',
              }}>
              MENU
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomNavigationItem
              focused={focused}
              icon={
                <FontAwesomeIcon
                  icon={faAddressCard}
                  color={focused ? AppColors.primary : AppColors.textSecondary}
                  size={20}
                />
              }
            />
          ),
          tabBarLabel: ({ focused }: any) => (
            <Text
              style={{
                color: focused ? AppColors.primary : AppColors.textSecondary,
                fontSize: 11,
                fontWeight: '700',
              }}>
              PROFILE
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="earnings"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomNavigationItem
              focused={focused}
              icon={
                <FontAwesomeIcon
                  icon={faSackDollar}
                  color={focused ? AppColors.primary : AppColors.textSecondary}
                  size={20}
                />
              }
            />
          ),
          tabBarLabel: ({ focused }: any) => (
            <Text
              style={{
                color: focused ? AppColors.primary : AppColors.textSecondary,
                fontSize: 11,
                fontWeight: '700',
              }}>
              EARNINGS
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}
