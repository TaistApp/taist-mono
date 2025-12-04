import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MenuItemStepContainer } from '../components/MenuItemStepContainer';
import { AppColors, Spacing } from '../../../../../constants/theme';
import { IMenu } from '../../../../types/index';
import StyledButton from '../../../../components/styledButton';
import StyledSwitch from '../../../../components/styledSwitch';
import { useAppSelector } from '../../../../hooks/useRedux';

interface StepMenuItemAllergensProps {
  menuItemData: Partial<IMenu>;
  onUpdateMenuItemData: (data: Partial<IMenu>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepMenuItemAllergens: React.FC<StepMenuItemAllergensProps> = ({
  menuItemData,
  onUpdateMenuItemData,
  onNext,
  onBack,
}) => {
  const allergens = useAppSelector(x => x.table.allergens);

  // Parse allergen IDs from string or array
  const allergyIds = React.useMemo(() => {
    if (Array.isArray(menuItemData.allergens)) {
      return menuItemData.allergens;
    }
    if (typeof menuItemData.allergens === 'string' && menuItemData.allergens) {
      return menuItemData.allergens.split(',').map(x => parseInt(x)).filter(x => !isNaN(x));
    }
    return [];
  }, [menuItemData.allergens]);

  const handleAllergyPress = (id: number) => {
    const tempIds = [...allergyIds];
    const index = tempIds.findIndex(x => x === id);
    if (index >= 0) {
      tempIds.splice(index, 1);
    } else {
      tempIds.push(id);
    }
    onUpdateMenuItemData({ allergens: tempIds as any });
  };

  const validateAndProceed = () => {
    // No validation needed - allergens are optional
    onNext();
  };

  return (
    <MenuItemStepContainer
      title="Allergens"
      subtitle="For customers with allergies, select if your menu item contains any of the following."
      currentStep={4}
      totalSteps={8}
    >
      <View style={styles.allergensList}>
        {allergens.map((allergy, idx) => {
          const isSelected = allergyIds.includes(allergy.id ?? 0);
          return (
            <View key={`allergy_${idx}`} style={styles.allergenItem}>
              <StyledSwitch
                label={allergy.name ?? ''}
                value={isSelected}
                onPress={() => {
                  handleAllergyPress(allergy.id ?? 0);
                }}
              />
            </View>
          );
        })}
      </View>

      {allergyIds.length === 0 && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 If your dish doesn't contain any common allergens, you can skip this step.
          </Text>
        </View>
      )}

      {/* AI Integration Point - Hidden for now */}
      {/* <View style={styles.aiSection}>
        <Text style={styles.aiLabel}>✨ AI Allergen Detection (Coming Soon)</Text>
        <Text style={styles.aiDescription}>
          Based on "{menuItemData.title}" and your description, AI will suggest likely allergens.
        </Text>
        <StyledButton
          title="Get AI Allergen Suggestions"
          onPress={() => {}}
          disabled={true}
          style={styles.aiButton}
        />
      </View> */}

      <View style={styles.buttonContainer}>
        <StyledButton
          title="Continue"
          onPress={validateAndProceed}
        />
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </MenuItemStepContainer>
  );
};

const styles = StyleSheet.create({
  allergensList: {
    gap: Spacing.sm,
  },
  allergenItem: {
    backgroundColor: AppColors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  infoBox: {
    backgroundColor: AppColors.primaryLight,
    padding: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.md,
  },
  infoText: {
    fontSize: 14,
    color: AppColors.text,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
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
  aiSection: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: AppColors.backgroundSecondary,
    borderRadius: 8,
  },
  aiLabel: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  aiDescription: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  aiButton: {
    opacity: 0.5,
  },
});





