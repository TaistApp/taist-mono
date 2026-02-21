import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { MenuItemStepContainer } from '../components/MenuItemStepContainer';
import { AppColors, Spacing } from '../../../../../constants/theme';
import { IMenu } from '../../../../types/index';
import { ShowErrorToast } from '../../../../utils/toast';
import StyledTextInput from '../../../../components/styledTextInput';
import StyledButton from '../../../../components/styledButton';
import { GenerateMenuDescriptionAPI } from '../../../../services/api';

interface StepMenuItemNameProps {
  menuItemData: Partial<IMenu>;
  onUpdateMenuItemData: (data: Partial<IMenu>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepMenuItemName: React.FC<StepMenuItemNameProps> = ({
  menuItemData,
  onUpdateMenuItemData,
  onNext,
  onBack,
}) => {
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const validateAndProceed = async () => {
    // Validate name
    if (!menuItemData.title || menuItemData.title.trim().length === 0) {
      ShowErrorToast('Please enter a menu item name');
      return;
    }

    if (menuItemData.title.trim().length < 3) {
      ShowErrorToast('Menu item name must be at least 3 characters');
      return;
    }

    // Generate AI description in background
    setIsGeneratingDescription(true);
    try {
      const response = await GenerateMenuDescriptionAPI({
        dish_name: menuItemData.title
      });

      if (response.success === 1 && response.description) {
        onUpdateMenuItemData({
          ai_generated_description: response.description
        });
      }
    } catch (error) {
      console.log('AI description generation failed, continuing anyway', error);
    } finally {
      setIsGeneratingDescription(false);
      onNext();
    }
  };

  return (
    <MenuItemStepContainer
      title="What's the name of your dish?"
      subtitle="This is the name that will be displayed to customers."
      currentStep={1}
      totalSteps={8}
    >
      <StyledTextInput
        testID="menuWizard.nameInput"
        label="Menu Item Name"
        placeholder="e.g., Grandma's Lasagna"
        value={menuItemData.title ?? ''}
        onChangeText={(val) => onUpdateMenuItemData({ title: val })}
        autoCapitalize="words"
        maxLength={100}
      />

      {/* AI Integration Point - Hidden for now */}
      {/* <View style={styles.aiSection}>
        <Text style={styles.aiLabel}>✨ AI Assistant (Coming Soon)</Text>
        <StyledButton
          title="Improve Name"
          onPress={() => {}}
          disabled={true}
          style={styles.aiButton}
        />
      </View> */}

      <View style={styles.buttonContainer}>
        <StyledButton
          testID="menuWizard.continueButton"
          title={isGeneratingDescription ? "Generating..." : "Continue"}
          onPress={validateAndProceed}
          disabled={isGeneratingDescription}
        />
        {isGeneratingDescription && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={AppColors.primary} />
            <Text style={styles.loadingText}>Creating AI description...</Text>
          </View>
        )}
        <Pressable testID="menuWizard.backButton" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </MenuItemStepContainer>
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
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  aiSection: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: AppColors.surface,
    borderRadius: 8,
  },
  aiLabel: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: Spacing.sm,
  },
  aiButton: {
    opacity: 0.5,
  },
});

