import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLocationArrow } from '@fortawesome/free-solid-svg-icons';
import { SignupStepContainer } from '../components/SignupStepContainer';
import { AppColors, Spacing, Shadows } from '../../../../../constants/theme';
import { IUser } from '../../../../types/index';
import { ShowErrorToast } from '../../../../utils/toast';
import StyledTextInput from '../../../../components/styledTextInput';
import StyledButton from '../../../../components/styledButton';
import * as Location from 'expo-location';

interface StepLocationProps {
  userInfo: IUser;
  onUpdateUserInfo: (info: Partial<IUser>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepLocation: React.FC<StepLocationProps> = ({
  userInfo,
  onUpdateUserInfo,
  onNext,
  onBack,
}) => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const validateAndProceed = () => {
    if (!userInfo.zip || userInfo.zip.trim().length === 0) {
      ShowErrorToast('Please enter your ZIP code');
      return;
    }
    
    // Basic ZIP validation (US ZIP codes are 5 digits, optionally followed by -4 digits)
    const zipPattern = /^\d{5}(-\d{4})?$/;
    if (!zipPattern.test(userInfo.zip.trim())) {
      ShowErrorToast('Please enter a valid ZIP code');
      return;
    }

    onNext();
  };

  const handleUseMyLocation = async () => {
    setIsGettingLocation(true);
    try {
      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        ShowErrorToast('Please enable location services in your device settings');
        setIsGettingLocation(false);
        return;
      }

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        ShowErrorToast('Location permission is required to use this feature');
        setIsGettingLocation(false);
        return;
      }

      // Get current location with lower accuracy for emulator compatibility
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
        timeInterval: 5000,
        distanceInterval: 0,
      });

      console.log('✅ Got location:', location.coords);

      // Reverse geocode to get ZIP code
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      console.log('✅ Reverse geocoded address:', address);

      if (address.postalCode) {
        onUpdateUserInfo({ 
          zip: address.postalCode,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          city: address.city || undefined,
          state: address.region || undefined,
        });
        ShowErrorToast('Location set successfully!');
      } else {
        ShowErrorToast('Could not determine ZIP code from your location');
      }
    } catch (error: any) {
      console.error('❌ Location error:', error);
      const errorMessage = error?.message || 'Unknown error';
      
      if (errorMessage.includes('unavailable') || errorMessage.includes('location services')) {
        ShowErrorToast('Location unavailable on emulator. Please enter ZIP manually');
      } else if (errorMessage.includes('timed out')) {
        ShowErrorToast('Location request timed out. Please enter manually');
      } else {
        ShowErrorToast('Could not get location. Please enter ZIP manually');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  return (
    <SignupStepContainer
      title="Where are you located?"
      subtitle="We'll show you chefs available in your area"
    >
      <View style={styles.locationOptionContainer}>
        <Pressable 
          style={styles.locationButton} 
          onPress={handleUseMyLocation}
          disabled={isGettingLocation}
        >
          <FontAwesomeIcon icon={faLocationArrow} size={24} color={AppColors.primary} />
          <Text style={styles.locationButtonText}>
            {isGettingLocation ? 'Getting location...' : 'Use My Current Location'}
          </Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
      </View>

      <StyledTextInput
        label="ZIP Code"
        placeholder="Enter your ZIP code"
        value={userInfo.zip ?? ''}
        onChangeText={(val) => onUpdateUserInfo({ zip: val })}
        keyboardType="number-pad"
        maxLength={10}
        autoComplete="postal-code"
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          💡 We'll ask for your full delivery address later when you're ready to order
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <StyledButton
          title="Continue"
          onPress={validateAndProceed}
        />
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </SignupStepContainer>
  );
};

const styles = StyleSheet.create({
  locationOptionContainer: {
    marginBottom: Spacing.md,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderWidth: 2,
    borderColor: AppColors.primary + '40',
    ...Shadows.sm,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AppColors.textSecondary + '40',
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: AppColors.primary + '10',
    borderRadius: 12,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.primary,
  },
  infoText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
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


