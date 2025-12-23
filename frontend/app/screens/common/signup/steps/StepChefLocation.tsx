import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLocationArrow, faAngleDown, faSearch, faClose } from '@fortawesome/free-solid-svg-icons';
import { SelectList } from 'react-native-dropdown-select-list';
import { SignupStepContainer } from '../components/SignupStepContainer';
import { AppColors, Spacing, Shadows } from '../../../../../constants/theme';
import { IUser } from '../../../../types/index';
import { ShowErrorToast } from '../../../../utils/toast';
import StyledTextInput from '../../../../components/styledTextInput';
import StyledButton from '../../../../components/styledButton';
import * as Location from 'expo-location';

interface StepChefLocationProps {
  userInfo: IUser;
  onUpdateUserInfo: (info: Partial<IUser>) => void;
  onNext: () => void;
  onBack: () => void;
}

// US States data
const statesData = [
  {key: '1', value: 'Alabama'},
  {key: '2', value: 'Alaska'},
  {key: '3', value: 'Arizona'},
  {key: '4', value: 'Arkansas'},
  {key: '5', value: 'California'},
  {key: '6', value: 'Colorado'},
  {key: '7', value: 'Connecticut'},
  {key: '8', value: 'Delaware'},
  {key: '9', value: 'Florida'},
  {key: '10', value: 'Georgia'},
  {key: '11', value: 'Hawaii'},
  {key: '12', value: 'Idaho'},
  {key: '13', value: 'Illinois'},
  {key: '14', value: 'Indiana'},
  {key: '15', value: 'Iowa'},
  {key: '16', value: 'Kansas'},
  {key: '17', value: 'Kentucky'},
  {key: '18', value: 'Louisiana'},
  {key: '19', value: 'Maine'},
  {key: '20', value: 'Maryland'},
  {key: '21', value: 'Massachusetts'},
  {key: '22', value: 'Michigan'},
  {key: '23', value: 'Minnesota'},
  {key: '24', value: 'Mississippi'},
  {key: '25', value: 'Missouri'},
  {key: '26', value: 'Montana'},
  {key: '27', value: 'Nebraska'},
  {key: '28', value: 'Nevada'},
  {key: '29', value: 'New Hampshire'},
  {key: '30', value: 'New Jersey'},
  {key: '31', value: 'New Mexico'},
  {key: '32', value: 'New York'},
  {key: '33', value: 'North Carolina'},
  {key: '34', value: 'North Dakota'},
  {key: '35', value: 'Ohio'},
  {key: '36', value: 'Oklahoma'},
  {key: '37', value: 'Oregon'},
  {key: '38', value: 'Pennsylvania'},
  {key: '39', value: 'Rhode Island'},
  {key: '40', value: 'South Carolina'},
  {key: '41', value: 'South Dakota'},
  {key: '42', value: 'Tennessee'},
  {key: '43', value: 'Texas'},
  {key: '44', value: 'Utah'},
  {key: '45', value: 'Vermont'},
  {key: '46', value: 'Virginia'},
  {key: '47', value: 'Washington'},
  {key: '48', value: 'West Virginia'},
  {key: '49', value: 'Wisconsin'},
  {key: '50', value: 'Wyoming'},
];

export const StepChefLocation: React.FC<StepChefLocationProps> = ({
  userInfo,
  onUpdateUserInfo,
  onNext,
  onBack,
}) => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const validateAndProceed = () => {
    // Validate street address
    if (!userInfo.address || userInfo.address.trim().length === 0) {
      ShowErrorToast('Please enter your street address');
      return;
    }

    // Validate city
    if (!userInfo.city || userInfo.city.trim().length === 0) {
      ShowErrorToast('Please enter your city');
      return;
    }

    // Validate state
    if (!userInfo.state || userInfo.state.trim().length === 0) {
      ShowErrorToast('Please select your state');
      return;
    }

    // Validate ZIP
    if (!userInfo.zip || userInfo.zip.trim().length === 0) {
      ShowErrorToast('Please enter your ZIP code');
      return;
    }
    
    // Basic ZIP validation (US ZIP codes are 5 digits, optionally followed by -4 digits)
    const zipPattern = /^\d{5}(-\d{4})?$/;
    if (!zipPattern.test(userInfo.zip.trim())) {
      ShowErrorToast('Please enter a valid ZIP code (5 digits)');
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

      // Get current location - using High accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 0,
      });

      console.log('✅ Got location:', location.coords);

      // Reverse geocode to get address details
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      console.log('✅ Reverse geocoded address:', address);

      if (address) {
        // Build street address from available components
        const streetAddress = [address.streetNumber, address.street]
          .filter(Boolean)
          .join(' ');

        onUpdateUserInfo({ 
          address: streetAddress || undefined,
          city: address.city || undefined,
          state: address.region || undefined,
          zip: address.postalCode || undefined,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        ShowErrorToast('Location details filled in successfully!');
      } else {
        ShowErrorToast('Could not determine address from your location');
      }
    } catch (error: any) {
      console.error('❌ Location error:', error);
      const errorMessage = error?.message || 'Unknown error';
      
      if (errorMessage.includes('unavailable') || errorMessage.includes('location services')) {
        ShowErrorToast('Location unavailable. Please enter address manually');
      } else if (errorMessage.includes('timed out')) {
        ShowErrorToast('Location request timed out. Please enter manually');
      } else {
        ShowErrorToast('Could not get location. Please enter manually');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  return (
    <SignupStepContainer
      title="What's your address?"
      subtitle="We need your address for verification purposes"
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
          <Text style={styles.dividerText}>or enter manually</Text>
          <View style={styles.dividerLine} />
        </View>
      </View>

      <StyledTextInput
        label="Street Address"
        placeholder="123 Main Street"
        value={userInfo.address ?? ''}
        onChangeText={(val) => onUpdateUserInfo({ address: val })}
        autoComplete="street-address"
      />

      <StyledTextInput
        label="City"
        placeholder="City"
        value={userInfo.city ?? ''}
        onChangeText={(val) => onUpdateUserInfo({ city: val })}
        autoComplete="off"
      />

      <View style={styles.statePickerContainer}>
        <Text style={styles.stateLabel}>State</Text>
        <SelectList
          setSelected={(val: string) => onUpdateUserInfo({ state: val })}
          data={statesData}
          save="value"
          placeholder={userInfo.state || "Select State"}
          search={true}
          boxStyles={styles.selectBox}
          inputStyles={styles.selectInput}
          dropdownStyles={styles.dropdown}
          dropdownTextStyles={styles.dropdownText}
          dropdownProps={{ nestedScrollEnabled: true }}
          arrowicon={
            <FontAwesomeIcon icon={faAngleDown} size={20} color="#666666" />
          }
          searchicon={
            <FontAwesomeIcon icon={faSearch} size={15} color="#666666" />
          }
          closeicon={
            <FontAwesomeIcon icon={faClose} size={15} color="#666666" />
          }
        />
      </View>

      <StyledTextInput
        label="ZIP Code"
        placeholder="12345"
        value={userInfo.zip ?? ''}
        onChangeText={(val) => onUpdateUserInfo({ zip: val })}
        keyboardType="number-pad"
        maxLength={10}
        autoComplete="postal-code"
      />

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
  statePickerContainer: {
    marginVertical: Spacing.sm,
  },
  stateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  selectBox: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  selectInput: {
    fontSize: 16,
    color: AppColors.text,
    flex: 1,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    marginTop: Spacing.xs,
    maxHeight: 250,
  },
  dropdownText: {
    fontSize: 16,
    color: AppColors.text,
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

