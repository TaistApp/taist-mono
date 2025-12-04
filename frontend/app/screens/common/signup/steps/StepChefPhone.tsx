import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { TextInput } from 'react-native-paper';
import { SignupStepContainer } from '../components/SignupStepContainer';
import { AppColors, Spacing, Shadows } from '../../../../../constants/theme';
import { IUser } from '../../../../types/index';
import { ShowErrorToast, ShowSuccessToast } from '../../../../utils/toast';
import StyledTextInput from '../../../../components/styledTextInput';
import StyledButton from '../../../../components/styledButton';
import { VerifyPhoneAPI } from '../../../../services/api';

interface StepChefPhoneProps {
  userInfo: IUser;
  onUpdateUserInfo: (info: Partial<IUser>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepChefPhone: React.FC<StepChefPhoneProps> = ({
  userInfo,
  onUpdateUserInfo,
  onNext,
  onBack,
}) => {
  const [visibleVerifyCode, setVisibleVerifyCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [serverCode, setServerCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const validateAndProceed = async () => {
    if (!userInfo.phone || userInfo.phone.trim().length === 0) {
      ShowErrorToast('Please enter your phone number');
      return;
    }

    // Basic phone validation - must be at least 10 digits
    const phoneDigits = userInfo.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      ShowErrorToast('Please enter a valid 10-digit phone number');
      return;
    }

    // Send verification code via SMS
    await handleVerifyPhone();
  };

  const handleVerifyPhone = async () => {
    setIsSendingCode(true);
    try {
      const response = await VerifyPhoneAPI(userInfo.phone!);

      if (response.success === 1) {
        setServerCode(response.data.code);
        setVisibleVerifyCode(true);
        ShowSuccessToast('Verification code sent to your phone!');
      } else {
        ShowErrorToast(response.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      ShowErrorToast('Failed to send verification code. Please try again.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerify = () => {
    console.log('Verifying code:', verificationCode, 'Server code:', serverCode);

    if (verificationCode.trim() !== serverCode.toString().trim()) {
      ShowErrorToast('Incorrect verification code');
      return;
    }
    setVisibleVerifyCode(false);
    ShowSuccessToast('Phone verified successfully!');
    onNext();
  };

  return (
    <SignupStepContainer
      title="What's your phone number?"
      subtitle="We'll use this to contact you about orders and important updates"
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
          title={isSendingCode ? "Sending code..." : "Continue"}
          onPress={validateAndProceed}
          disabled={isSendingCode}
        />
        <Pressable onPress={onBack} style={styles.backButton} disabled={isSendingCode}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>

      {/* Phone Verification Modal */}
      <Modal transparent visible={visibleVerifyCode}>
        <Pressable
          onPress={() => !isVerifying && setVisibleVerifyCode(false)}
          style={styles.modalBG}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modal}>
            <Text style={styles.modalTitle}>Verify Your Phone</Text>
            <Text style={styles.modalSubtext}>
              Enter the 6-digit code sent to {userInfo.phone}
            </Text>

            <StyledTextInput
              label="Verification Code"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <StyledButton
                title={isVerifying ? "Verifying..." : "Verify"}
                onPress={handleVerify}
                disabled={isVerifying || verificationCode.length !== 6}
              />

              <Pressable
                onPress={handleVerifyPhone}
                style={styles.resendButton}
                disabled={isSendingCode}
              >
                <Text style={styles.resendButtonText}>
                  {isSendingCode ? "Sending..." : "Resend Code"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
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
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.text,
    textAlign: 'center',
  },
  modalSubtext: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: -Spacing.sm,
  },
  modalButtons: {
    gap: Spacing.md,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  resendButtonText: {
    color: AppColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});





