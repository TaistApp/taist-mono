import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SignupStepContainer } from '../components/SignupStepContainer';
import { AppColors, Spacing, Shadows } from '../../../../../constants/theme';
import { IUser } from '../../../../types/index';
import { ShowErrorToast } from '../../../../utils/toast';
import StyledButton from '../../../../components/styledButton';
import StyledPhotoPicker from '../../../../components/styledPhotoPicker';
import StyledProfileImage from '../../../../components/styledProfileImage';
import { getImageURL } from '../../../../utils/functions';

interface StepChefPhotoProps {
  userInfo: IUser;
  onUpdateUserInfo: (info: Partial<IUser>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepChefPhoto: React.FC<StepChefPhotoProps> = ({
  userInfo,
  onUpdateUserInfo,
  onNext,
  onBack,
}) => {
  const hasPhoto = userInfo.photo && userInfo.photo.length > 0;

  const handleContinue = () => {
    if (!hasPhoto) {
      ShowErrorToast('Please add a profile photo to continue');
      return;
    }
    onNext();
  };

  return (
    <SignupStepContainer
      title="Add your profile photo"
      subtitle="This helps customers recognize you and builds trust"
    >
      <View style={styles.photoContainer}>
        <StyledPhotoPicker
          content={
            <View style={styles.photoPickerContent}>
              <StyledProfileImage
                url={getImageURL(userInfo.photo)}
                size={160}
              />
              <View style={styles.photoHint}>
                <Text style={styles.photoHintText}>
                  {hasPhoto ? 'Tap to change photo' : 'Tap to add photo'}
                </Text>
              </View>
            </View>
          }
          onPhoto={(path) => {
            onUpdateUserInfo({ photo: path });
          }}
          onHide={() => {}}
        />
      </View>

      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>📸 Photo Tips:</Text>
        <Text style={styles.tipText}>• Use a clear, well-lit photo</Text>
        <Text style={styles.tipText}>• Show your face clearly</Text>
        <Text style={styles.tipText}>• Smile! It helps build trust</Text>
        <Text style={styles.tipText}>• Avoid filters or heavy editing</Text>
      </View>

      <View style={styles.buttonContainer}>
        <StyledButton
          title="Continue"
          onPress={handleContinue}
          disabled={!hasPhoto}
        />
        
        {!hasPhoto && (
          <Text style={styles.requirementText}>
            ⚠️ Profile photo is required to continue
          </Text>
        )}
        
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </SignupStepContainer>
  );
};

const styles = StyleSheet.create({
  photoContainer: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  photoPickerContent: {
    alignItems: 'center',
  },
  photoHint: {
    marginTop: Spacing.md,
    backgroundColor: AppColors.primary + '20',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  photoHintText: {
    color: AppColors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  tipsContainer: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.primary,
    ...Shadows.sm,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: Spacing.sm,
  },
  tipText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 22,
    marginVertical: 2,
  },
  buttonContainer: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  requirementText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: -Spacing.sm,
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

