import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { SignupStepContainer } from '../components/SignupStepContainer';
import { AppColors, Spacing, Shadows } from '../../../../../constants/theme';
import { IUser } from '../../../../types/index';
import StyledButton from '../../../../components/styledButton';
import StyledSwitch from '../../../../components/styledSwitch';
import {
  check,
  checkNotifications,
  request,
  requestNotifications,
  openSettings,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';

interface StepPreferencesProps {
  userInfo: IUser;
  onComplete: () => void;
  onBack: () => void;
}

export const StepPreferences: React.FC<StepPreferencesProps> = ({
  userInfo,
  onComplete,
  onBack,
}) => {
  const [pushNotifications, setPushNotifications] = useState(false);
  const [locationServices, setLocationServices] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    // Check location permission
    if (Platform.OS === 'android') {
      const fineLocation = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      const coarseLocation = await check(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION);
      setLocationServices(
        fineLocation === RESULTS.GRANTED || coarseLocation === RESULTS.GRANTED
      );
    } else {
      const whenInUse = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      const always = await check(PERMISSIONS.IOS.LOCATION_ALWAYS);
      setLocationServices(
        whenInUse === RESULTS.GRANTED || always === RESULTS.GRANTED
      );
    }

    // Check notification permission
    const notificationStatus = await checkNotifications();
    setPushNotifications(notificationStatus.status === RESULTS.GRANTED);
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const result = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      setLocationServices(result === RESULTS.GRANTED);
    } else {
      const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      setLocationServices(result === RESULTS.GRANTED);
    }
    
    if (!locationServices) {
      // If denied, open settings
      setTimeout(() => openSettings(), 500);
    }
  };

  const requestNotificationPermission = async () => {
    // Use requestNotifications for both platforms as it handles the permission correctly
    const { status } = await requestNotifications(['alert', 'badge', 'sound']);
    setPushNotifications(status === RESULTS.GRANTED);

    if (!pushNotifications) {
      // If denied, open settings
      setTimeout(() => openSettings(), 500);
    }
  };

  const handleContinue = () => {
    // Complete signup regardless of permission state
    // Users can enable permissions later in settings
    onComplete();
  };

  return (
    <SignupStepContainer
      title="Set your preferences"
      subtitle="These help us provide you with the best experience"
    >
      <View style={styles.permissionCard}>
        <View style={styles.permissionHeader}>
          <Text style={styles.permissionTitle}>🔔 Push Notifications</Text>
          <Text style={styles.permissionDescription}>
            Get notified about order updates, like when your chef is on the way
          </Text>
        </View>
        <StyledSwitch
          label=""
          value={pushNotifications}
          onPress={requestNotificationPermission}
        />
      </View>

      <View style={styles.permissionCard}>
        <View style={styles.permissionHeader}>
          <Text style={styles.permissionTitle}>📍 Location Services</Text>
          <Text style={styles.permissionDescription}>
            Help us show you chefs and dishes available near you
          </Text>
        </View>
        <StyledSwitch
          label=""
          value={locationServices}
          onPress={requestLocationPermission}
        />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ️ You can change these settings anytime in your account preferences
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <StyledButton
          title="Continue"
          onPress={handleContinue}
        />
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </SignupStepContainer>
  );
};

const styles = StyleSheet.create({
  permissionCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    ...Shadows.sm,
  },
  permissionHeader: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  permissionDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: AppColors.primary + '10',
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  infoText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
  },
  buttonContainer: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  backButtonText: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});


