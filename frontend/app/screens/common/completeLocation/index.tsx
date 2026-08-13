import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLocationArrow } from '@fortawesome/free-solid-svg-icons';
import * as Location from 'expo-location';

import { AppColors, Spacing, Shadows } from '../../../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';
import { UpdateUserAPI } from '../../../services/api';
import { navigate } from '../../../utils/navigation';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';
import StyledTextInput from '../../../components/styledTextInput';
import StyledButton from '../../../components/styledButton';

/**
 * Required ZIP step shown after a social signup (Apple/Google) that arrived with
 * no location. Apple/Google never return a ZIP, so without this the customer
 * lands straight on the "Taist has not arrived in your area yet" screen with no
 * way to fix it. Mirrors how Uber/DoorDash gate on a delivery location rather
 * than bolting a raw field onto the auth screen. ZIP alone is enough — the
 * backend geocodes it to coordinates on save.
 */
export default function CompleteLocationScreen() {
  const dispatch = useAppDispatch();
  const self = useAppSelector((x) => x.user.user);

  const [zip, setZip] = useState(self.zip ?? '');
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number }>({});
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUseMyLocation = async () => {
    setIsGettingLocation(true);
    try {
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        ShowErrorToast('Please enable location services in your device settings');
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        ShowErrorToast('Location permission is required to use this feature');
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (address?.postalCode) {
        setZip(address.postalCode);
        setCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        ShowSuccessToast('Location set successfully!');
      } else {
        ShowErrorToast('Could not determine ZIP code from your location');
      }
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('unavailable') || msg.includes('location services')) {
        ShowErrorToast('Location unavailable. Please enter ZIP manually');
      } else if (msg.includes('timed out')) {
        ShowErrorToast('Location request timed out. Please enter manually');
      } else {
        ShowErrorToast('Could not get location. Please enter ZIP manually');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleContinue = async () => {
    const trimmed = zip.trim();
    if (!/^\d{5}(-\d{4})?$/.test(trimmed)) {
      ShowErrorToast('Please enter a valid ZIP code');
      return;
    }

    setSaving(true);
    try {
      const updated = {
        ...self,
        zip: trimmed,
        ...(coords.latitude != null ? { latitude: coords.latitude } : {}),
        ...(coords.longitude != null ? { longitude: coords.longitude } : {}),
      };
      const resp = await UpdateUserAPI(updated, dispatch);
      if (resp.success === 1) {
        navigate.toAuthorizedStacks.customerAuthorized();
      } else {
        ShowErrorToast(resp.message ?? resp.error ?? 'Could not save your location');
      }
    } catch (e) {
      ShowErrorToast('Something went wrong saving your location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Where are you located?</Text>
        <Text style={styles.subtitle}>
          We'll show you chefs available in your area. You can add your full
          delivery address later when you order.
        </Text>

        {/* ASC Guideline 5.1.1(iv): the button preceding the location permission
            prompt must use neutral wording like "Continue"/"Next" — the
            description lives in the hint text instead */}
        <Text style={styles.locationHint}>
          We can fill in your ZIP code automatically using your device's location
        </Text>
        <Pressable
          testID="completeLocation.useMyLocation"
          style={styles.locationButton}
          onPress={handleUseMyLocation}
          disabled={isGettingLocation}
        >
          <FontAwesomeIcon icon={faLocationArrow} size={22} color={AppColors.primary} />
          <Text style={styles.locationButtonText}>
            {isGettingLocation ? 'Getting location...' : 'Next'}
          </Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <StyledTextInput
          testID="completeLocation.zipInput"
          label="ZIP Code"
          placeholder="Enter your ZIP code"
          value={zip}
          onChangeText={setZip}
          keyboardType="number-pad"
          maxLength={10}
          autoComplete="postal-code"
        />

        <View style={styles.buttonContainer}>
          <StyledButton
            testID="completeLocation.continueButton"
            title={saving ? 'Saving...' : 'Continue'}
            onPress={handleContinue}
            disabled={saving}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  container: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: AppColors.text,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    lineHeight: 21,
    marginBottom: Spacing.md,
  },
  locationHint: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
    marginVertical: Spacing.sm,
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
  buttonContainer: {
    marginTop: Spacing.lg,
  },
});
