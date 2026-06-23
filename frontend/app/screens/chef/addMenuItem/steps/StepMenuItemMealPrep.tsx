import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MenuItemStepContainer } from '../components/MenuItemStepContainer';
import { AppColors, Spacing } from '../../../../../constants/theme';
import { IMenu } from '../../../../types/index';
import { ShowErrorToast } from '../../../../utils/toast';
import StyledTextInput from '../../../../components/styledTextInput';
import StyledButton from '../../../../components/styledButton';

interface StepMenuItemMealPrepProps {
  menuItemData: Partial<IMenu>;
  onUpdateMenuItemData: (data: Partial<IMenu>) => void;
  onNext: () => void;
  onBack: () => void;
}

const toInt = (text: string): number | null => {
  const digits = text.replace(/[^0-9]/g, '');
  if (digits === '') return null;
  return parseInt(digits, 10);
};

/**
 * Meal-prep-only details step. This is an extra page in the meal-prep flow
 * (in addition to all the standard steps). Like every Taist item, meal-prep
 * meals are cooked in the customer's kitchen — these fields just capture how
 * many meals the order covers and how the customer stores/reheats leftovers.
 */
export const StepMenuItemMealPrep: React.FC<StepMenuItemMealPrepProps> = ({
  menuItemData,
  onUpdateMenuItemData,
  onNext,
  onBack,
}) => {
  const mealsPerPackage = menuItemData.meals_per_package ?? null;
  const storageInstructions = menuItemData.storage_instructions ?? '';

  const validateAndProceed = () => {
    if (!mealsPerPackage || mealsPerPackage <= 0) {
      ShowErrorToast('How many meals come in the package?');
      return;
    }
    onNext();
  };

  return (
    <MenuItemStepContainer
      title="Meal Prep Details"
      subtitle="A few extras for a meal-prep order — you'll still cook it all in the customer's kitchen."
      currentStep={6}
      totalSteps={9}
    >
      <View>
        <Text style={styles.sectionTitle}>Number of meals</Text>
        <Text style={styles.sectionSubtitle}>
          How many individual meals will you prepare for this order?
        </Text>
        <StyledTextInput
          testID="menuWizard.mealsPerPackageInput"
          label="Number of meals"
          placeholder="e.g. 5"
          value={mealsPerPackage != null ? String(mealsPerPackage) : ''}
          onChangeText={text => onUpdateMenuItemData({ meals_per_package: toInt(text) })}
          keyboardType="number-pad"
        />
      </View>

      <View>
        <Text style={styles.sectionTitle}>Storage & reheating</Text>
        <Text style={styles.sectionSubtitle}>
          How should the customer store and reheat the leftovers? (optional)
        </Text>
        <StyledTextInput
          testID="menuWizard.storageInstructionsInput"
          label="Storage & reheating"
          placeholder="e.g. Keep refrigerated. Microwave 2–3 min before serving."
          value={storageInstructions}
          onChangeText={text => onUpdateMenuItemData({ storage_instructions: text })}
          multiline
          numberOfLines={3}
          textInputStyle={styles.multiline}
        />
      </View>

      <View style={styles.buttonContainer}>
        <StyledButton
          testID="menuWizard.continueButton"
          title="Continue"
          onPress={validateAndProceed}
        />
        <Pressable testID="menuWizard.backButton" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </MenuItemStepContainer>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
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
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '600',
  },
});
