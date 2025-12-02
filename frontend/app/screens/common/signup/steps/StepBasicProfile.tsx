import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
import { SignupStepContainer } from '../components/SignupStepContainer';
import { AppColors, Spacing, Shadows } from '../../../../../constants/theme';
import { IUser } from '../../../../types/index';
import { ShowErrorToast } from '../../../../utils/toast';
import StyledTextInput from '../../../../components/styledTextInput';
import StyledButton from '../../../../components/styledButton';

interface StepBasicProfileProps {
  userInfo: IUser;
  onUpdateUserInfo: (info: Partial<IUser>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepBasicProfile: React.FC<StepBasicProfileProps> = ({
  userInfo,
  onUpdateUserInfo,
  onNext,
  onBack,
}) => {
  const [visibleVerifyCode, setVisibleVerifyCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [serverCode, setServerCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const validateAndProceed = () => {
    if (!userInfo.phone || userInfo.phone.trim().length === 0) {
      ShowErrorToast('Please enter your phone number');
      return;
    }
    
    // Basic phone validation (you may want more sophisticated validation)
    const phoneDigits = userInfo.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      ShowErrorToast('Please enter a valid phone number');
      return;
    }

    // For now, skip phone verification in MVP - just proceed
    // TODO: Implement phone verification with backend API
    onNext();
  };

  const handleVerifyPhone = async () => {
    // TODO: Call VerifyPhoneAPI when ready
    // For now, skip verification
    setVisibleVerifyCode(true);
    setServerCode('123456'); // Mock code
  };

  const handleVerify = () => {
    if (verificationCode !== serverCode) {
      ShowErrorToast('Incorrect verification code');
      return;
    }
    setVisibleVerifyCode(false);
    onNext();
  };

  return (
    <SignupStepContainer
      title="What's your phone number?"
      subtitle="We'll use this to keep you updated on your orders"
    >
      <StyledTextInput
        label="Phone Number"
        placeholder="(555) 123-4567"
        value={userInfo.phone ?? ''}
        onChangeText={(val) => onUpdateUserInfo({ phone: val })}
        keyboardType="phone-pad"
        autoComplete="tel"
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

      {/* Phone Verification Modal - Optional for future */}
      <Modal transparent visible={visibleVerifyCode}>
        <Pressable
          onPress={() => setVisibleVerifyCode(false)}
          style={styles.modalBG}
        >
          <View style={styles.modal}>
            <Text style={styles.modalText}>Please check your phone</Text>
            <StyledTextInput
              label="Verification Code"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
            />
            <StyledButton title="Verify" onPress={handleVerify} />
          </View>
        </Pressable>
      </Modal>
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
  modalBG: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modal: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    gap: Spacing.lg,
    ...Shadows.lg,
  },
  modalText: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
    textAlign: 'center',
  },
});


