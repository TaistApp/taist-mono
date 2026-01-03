import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SignupStepContainer } from '../components/SignupStepContainer';
import { AppColors, Spacing } from '../../../../../constants/theme';
import { IUser } from '../../../../types/index';
import { ShowErrorToast } from '../../../../utils/toast';
import StyledTextInput from '../../../../components/styledTextInput';
import StyledButton from '../../../../components/styledButton';

interface StepChefBasicInfoProps {
  userInfo: IUser;
  onUpdateUserInfo: (info: Partial<IUser>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepChefBasicInfo: React.FC<StepChefBasicInfoProps> = ({
  userInfo,
  onUpdateUserInfo,
  onNext,
  onBack,
}) => {
  const validateAndProceed = () => {
    // Validate first name
    if (!userInfo.first_name || userInfo.first_name.trim().length === 0) {
      ShowErrorToast('Please enter your first name');
      return;
    }
    
    if (userInfo.first_name.trim().length < 2) {
      ShowErrorToast('First name must be at least 2 characters');
      return;
    }

    // Validate last name
    if (!userInfo.last_name || userInfo.last_name.trim().length === 0) {
      ShowErrorToast('Please enter your last name');
      return;
    }
    
    if (userInfo.last_name.trim().length < 2) {
      ShowErrorToast('Last name must be at least 2 characters');
      return;
    }

    onNext();
  };

  return (
    <SignupStepContainer
      title="What's your name?"
      subtitle="Your full name is only visible to you"
    >
      <StyledTextInput
        label="First Name"
        placeholder="John"
        value={userInfo.first_name ?? ''}
        onChangeText={(val) => onUpdateUserInfo({ first_name: val })}
        autoComplete="name-given"
        autoCapitalize="words"
      />

      <StyledTextInput
        label="Last Name"
        placeholder="Doe"
        value={userInfo.last_name ?? ''}
        onChangeText={(val) => onUpdateUserInfo({ last_name: val })}
        autoComplete="name-family"
        autoCapitalize="words"
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











