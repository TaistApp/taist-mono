import React, { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleDown, faClose, faSearch, faLocationArrow } from '@fortawesome/free-solid-svg-icons';
import { SelectList } from 'react-native-dropdown-select-list';
import { AppColors, Spacing, Shadows } from '../../constants/theme';
import { IUser } from '../types/index';
import { ShowErrorToast } from '../utils/toast';
import StyledTextInput from './styledTextInput';
import StyledButton from './styledButton';
import * as Location from 'expo-location';

interface AddressCollectionModalProps {
  visible: boolean;
  userInfo: Partial<IUser>;
  onSave: (addressInfo: Partial<IUser>) => void;
  onCancel: () => void;
}

export const AddressCollectionModal: React.FC<AddressCollectionModalProps> = ({
  visible,
  userInfo,
  onSave,
  onCancel,
}) => {
  const [firstName, setFirstName] = useState(userInfo.first_name || '');
  const [lastName, setLastName] = useState(userInfo.last_name || '');
  const [address, setAddress] = useState(userInfo.address || '');
  const [city, setCity] = useState(userInfo.city || '');
  const [state, setState] = useState(userInfo.state || '');
  const [zip, setZip] = useState(userInfo.zip || '');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const statesData = [
    { key: '1', value: 'Alabama' },
    { key: '2', value: 'Alaska' },
    { key: '3', value: 'Arizona' },
    { key: '4', value: 'Arkansas' },
    { key: '5', value: 'California' },
    { key: '6', value: 'Colorado' },
    { key: '7', value: 'Connecticut' },
    { key: '8', value: 'Delaware' },
    { key: '9', value: 'Florida' },
    { key: '10', value: 'Georgia' },
    { key: '11', value: 'Hawaii' },
    { key: '12', value: 'Idaho' },
    { key: '13', value: 'Illinois' },
    { key: '14', value: 'Indiana' },
    { key: '15', value: 'Iowa' },
    { key: '16', value: 'Kansas' },
    { key: '17', value: 'Kentucky' },
    { key: '18', value: 'Louisiana' },
    { key: '19', value: 'Maine' },
    { key: '20', value: 'Maryland' },
    { key: '21', value: 'Massachusetts' },
    { key: '22', value: 'Michigan' },
    { key: '23', value: 'Minnesota' },
    { key: '24', value: 'Mississippi' },
    { key: '25', value: 'Missouri' },
    { key: '26', value: 'Montana' },
    { key: '27', value: 'Nebraska' },
    { key: '28', value: 'Nevada' },
    { key: '29', value: 'New Hampshire' },
    { key: '30', value: 'New Jersey' },
    { key: '31', value: 'New Mexico' },
    { key: '32', value: 'New York' },
    { key: '33', value: 'North Carolina' },
    { key: '34', value: 'North Dakota' },
    { key: '35', value: 'Ohio' },
    { key: '36', value: 'Oklahoma' },
    { key: '37', value: 'Oregon' },
    { key: '38', value: 'Pennsylvania' },
    { key: '39', value: 'Rhode Island' },
    { key: '40', value: 'South Carolina' },
    { key: '41', value: 'South Dakota' },
    { key: '42', value: 'Tennessee' },
    { key: '43', value: 'Texas' },
    { key: '44', value: 'Utah' },
    { key: '45', value: 'Vermont' },
    { key: '46', value: 'Virginia' },
    { key: '47', value: 'Washington' },
    { key: '48', value: 'West Virginia' },
    { key: '49', value: 'Wisconsin' },
    { key: '50', value: 'Wyoming' },
  ];

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        ShowErrorToast('Please enable location services in your device settings');
        setIsGettingLocation(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        ShowErrorToast('Location permission is required');
        setIsGettingLocation(false);
        return;
      }

      // Try getLastKnownPositionAsync first (more reliable on emulators)
      let location = await Location.getLastKnownPositionAsync();

      // If no last known position, try getCurrentPositionAsync with timeout
      if (!location) {
        console.log('No last known position, trying getCurrentPositionAsync...');
        const locationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Location request timed out')), 10000)
        );
        location = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
      }

      console.log('✅ Got location:', location.coords);

      const [addressData] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      console.log('✅ Reverse geocoded address:', addressData);

      if (addressData) {
        const streetAddress = [
          addressData.streetNumber,
          addressData.street,
        ].filter(Boolean).join(' ');
        
        setAddress(streetAddress || address);
        setCity(addressData.city || city);
        setState(addressData.region || state);
        setZip(addressData.postalCode || zip);
        ShowErrorToast('Location filled successfully!');
      } else {
        ShowErrorToast('Could not determine address from location');
      }
    } catch (error: any) {
      console.error('❌ Location error:', error);
      const errorMessage = error?.message || 'Unknown error';
      
      if (errorMessage.includes('unavailable') || errorMessage.includes('location services')) {
        ShowErrorToast('Location unavailable on emulator. Please enter manually');
      } else if (errorMessage.includes('timed out')) {
        ShowErrorToast('Location request timed out. Please enter manually');
      } else {
        ShowErrorToast('Could not get location. Please enter manually');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  const validateAndSave = () => {
    if (!firstName || firstName.trim().length === 0) {
      ShowErrorToast('Please enter your first name');
      return;
    }
    if (!lastName || lastName.trim().length === 0) {
      ShowErrorToast('Please enter your last name');
      return;
    }
    if (!address || address.trim().length === 0) {
      ShowErrorToast('Please enter your address');
      return;
    }
    if (!city || city.trim().length === 0) {
      ShowErrorToast('Please enter your city');
      return;
    }
    if (!state || state.trim().length === 0) {
      ShowErrorToast('Please select your state');
      return;
    }
    if (!zip || zip.trim().length === 0) {
      ShowErrorToast('Please enter your ZIP code');
      return;
    }

    onSave({ first_name: firstName, last_name: lastName, address, city, state, zip });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Your Profile</Text>
              <Text style={styles.modalSubtitle}>
                We need your name and delivery address to complete your order
              </Text>
            </View>

            <View style={styles.formContent}>
              <StyledTextInput
                label="First Name"
                placeholder="John"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete="name-given"
              />

              <StyledTextInput
                label="Last Name"
                placeholder="Doe"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="name-family"
              />

              <View style={styles.locationButtonWrapper}>
                <Pressable
                  style={styles.locationButton}
                  onPress={handleUseCurrentLocation}
                  disabled={isGettingLocation}
                >
                  <FontAwesomeIcon icon={faLocationArrow} size={20} color={AppColors.primary} />
                  <Text style={styles.locationButtonText}>
                    {isGettingLocation ? 'Getting location...' : 'Use Current Location'}
                  </Text>
                </Pressable>
              </View>

              <StyledTextInput
                label="Street Address"
                placeholder="123 Main St"
                value={address}
                onChangeText={setAddress}
              />

              <StyledTextInput
                label="City"
                placeholder="City"
                value={city}
                onChangeText={setCity}
              />

              <SelectList
                setSelected={(key: string) => {
                  const opt = statesData.find(x => x.key === key);
                  if (opt) setState(opt.value);
                }}
                data={statesData}
                save={'key'}
                placeholder={state || 'Select State'}
                searchPlaceholder="Search"
                boxStyles={styles.dropdownBox}
                inputStyles={styles.dropdownInput}
                dropdownStyles={styles.dropdown}
                dropdownTextStyles={styles.dropdownText}
                dropdownProps={{ nestedScrollEnabled: true }}
                arrowicon={<FontAwesomeIcon icon={faAngleDown} size={20} color="#666666" />}
                searchicon={<FontAwesomeIcon icon={faSearch} size={15} color="#666666" />}
                closeicon={<FontAwesomeIcon icon={faClose} size={15} color="#666666" />}
              />

              <StyledTextInput
                label="ZIP Code"
                placeholder="12345"
                value={zip}
                onChangeText={setZip}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.buttonContainer}>
              <StyledButton title="Save & Continue" onPress={validateAndSave} />
              <Pressable onPress={onCancel} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
    maxHeight: '90%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  modalHeader: {
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  locationButtonWrapper: {
    marginBottom: Spacing.md,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    borderWidth: 2,
    borderColor: AppColors.primary + '40',
    ...Shadows.sm,
  },
  locationButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.primary,
  },
  formContent: {
    gap: Spacing.md,
  },
  dropdownBox: {
    backgroundColor: AppColors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.textSecondary + '40',
    paddingVertical: 12,
  },
  dropdownInput: {
    fontSize: 15,
    color: AppColors.text,
    flex: 1,
  },
  dropdown: {
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.textSecondary + '40',
    marginTop: 4,
    maxHeight: 250,
  },
  dropdownText: {
    fontSize: 15,
    color: AppColors.text,
  },
  buttonContainer: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  cancelButtonText: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});


