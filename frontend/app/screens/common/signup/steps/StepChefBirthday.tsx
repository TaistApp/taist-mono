import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { SignupStepContainer } from '../components/SignupStepContainer';
import { AppColors, Spacing } from '../../../../../constants/theme';
import { IUser } from '../../../../types/index';
import { ShowErrorToast } from '../../../../utils/toast';
import StyledTextInput from '../../../../components/styledTextInput';
import StyledButton from '../../../../components/styledButton';
import { getFormattedDate } from '../../../../utils/validations';

interface StepChefBirthdayProps {
  userInfo: IUser;
  onUpdateUserInfo: (info: Partial<IUser>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepChefBirthday: React.FC<StepChefBirthdayProps> = ({
  userInfo,
  onUpdateUserInfo,
  onNext,
  onBack,
}) => {
  const [openBirthdayPicker, setOpenBirthdayPicker] = useState(false);

  const validateAndProceed = () => {
    // Validate birthday is set
    if (!userInfo.birthday || userInfo.birthday === 0) {
      ShowErrorToast('Please select your birthday');
      return;
    }

    // Calculate age
    const birthdayDate = moment(userInfo.birthday * 1000);
    const age = moment().diff(birthdayDate, 'years');

    // Must be 18 or older
    if (age < 18) {
      ShowErrorToast('You must be at least 18 years old to become a chef');
      return;
    }

    // Must be reasonable age (less than 120)
    if (age > 120) {
      ShowErrorToast('Please enter a valid birthday');
      return;
    }

    onNext();
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    // On Android, the picker closes automatically
    if (Platform.OS === 'android') {
      setOpenBirthdayPicker(false);
      if (event.type === 'set' && selectedDate) {
        onUpdateUserInfo({ birthday: selectedDate.getTime() / 1000 });
      }
      return;
    }

    // On iOS with spinner mode, just update the date as user scrolls
    // The modal Done/Cancel buttons handle closing
    if (selectedDate) {
      onUpdateUserInfo({ birthday: selectedDate.getTime() / 1000 });
    }
  };

  return (
    <SignupStepContainer
      title="When's your birthday?"
      subtitle="We need to verify you're at least 18 years old."
    >
      <StyledTextInput
        label="Birthday"
        placeholder="Select your birthday"
        onPress={() => setOpenBirthdayPicker(true)}
        value={
          userInfo.birthday && typeof userInfo.birthday === 'number'
            ? getFormattedDate(userInfo.birthday * 1000)
            : ''
        }
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🔒 Your birthday is kept private and used only for age verification
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

      {/* DateTimePicker */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={openBirthdayPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setOpenBirthdayPicker(false)}
        >
          <Pressable 
            style={styles.modalOverlay}
            onPress={() => setOpenBirthdayPicker(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setOpenBirthdayPicker(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Select Birthday</Text>
                <Pressable 
                  onPress={() => {
                    setOpenBirthdayPicker(false);
                  }}
                >
                  <Text style={styles.modalDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={
                  userInfo.birthday
                    ? moment(userInfo.birthday * 1000).toDate()
                    : new Date()
                }
                mode="date"
                display="spinner"
                onChange={onDateChange}
                maximumDate={new Date()}
                minimumDate={moment().subtract(120, 'years').toDate()}
                themeVariant="light"
                textColor="#000000"
                style={styles.picker}
              />
            </View>
          </Pressable>
        </Modal>
      ) : (
        openBirthdayPicker && (
          <DateTimePicker
            value={
              userInfo.birthday
                ? moment(userInfo.birthday * 1000).toDate()
                : moment().subtract(18, 'years').toDate()
            }
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
            minimumDate={moment().subtract(120, 'years').toDate()}
          />
        )
      )}
    </SignupStepContainer>
  );
};

const styles = StyleSheet.create({
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
  infoBox: {
    backgroundColor: AppColors.primary + '10',
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  infoText: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area for home indicator
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalCancel: {
    fontSize: 16,
    color: AppColors.textSecondary,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: AppColors.text,
  },
  modalDone: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '600',
  },
  picker: {
    width: '100%',
    height: 216, // iOS standard picker height
    backgroundColor: 'white',
  },
});





