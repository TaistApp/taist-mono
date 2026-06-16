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
 * Meal-prep-only details step. For meal-prep items this takes the place of the
 * on-site "Kitchen Requirements" step (appliances/time), which doesn't apply to
 * pre-made meals the customer reheats.
 */
export const StepMenuItemMealPrep: React.FC<StepMenuItemMealPrepProps> = ({
  menuItemData,
  onUpdateMenuItemData,
  onNext,
  onBack,
}) => {
  const mealsPerPackage = menuItemData.meals_per_package ?? null;
  const shelfLifeDays = menuItemData.shelf_life_days ?? null;
  const storageInstructions = menuItemData.storage_instructions ?? '';

  const validateAndProceed = () => {
    if (!mealsPerPackage || mealsPerPackage <= 0) {
      ShowErrorToast('How many meals come in the package?');
      return;
    }
    if (!shelfLifeDays || shelfLifeDays <= 0) {
      ShowErrorToast('How many days do the meals stay good?');
      return;
    }
    onNext();
  };

  return (
    <MenuItemStepContainer
      title="Meal Prep Details"
      subtitle="Tell customers how this meal-prep package works."
      currentStep={5}
      totalSteps={8}
    >
      <View>
        <Text style={styles.sectionTitle}>Meals per package</Text>
        <Text style={styles.sectionSubtitle}>
          How many individual meals does one order include?
        </Text>
        <StyledTextInput
          testID="menuWizard.mealsPerPackageInput"
          label="Meals per package"
          placeholder="e.g. 5"
          value={mealsPerPackage != null ? String(mealsPerPackage) : ''}
          onChangeText={text => onUpdateMenuItemData({ meals_per_package: toInt(text) })}
          keyboardType="number-pad"
        />
      </View>

      <View>
        <Text style={styles.sectionTitle}>Shelf life</Text>
        <Text style={styles.sectionSubtitle}>
          How many days will the meals stay good once delivered?
        </Text>
        <StyledTextInput
          testID="menuWizard.shelfLifeInput"
          label="Shelf life (days)"
          placeholder="e.g. 5"
          value={shelfLifeDays != null ? String(shelfLifeDays) : ''}
          onChangeText={text => onUpdateMenuItemData({ shelf_life_days: toInt(text) })}
          keyboardType="number-pad"
        />
      </View>

      <View>
        <Text style={styles.sectionTitle}>Storage & reheating</Text>
        <Text style={styles.sectionSubtitle}>
          How should customers store and reheat the meals? (optional)
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
