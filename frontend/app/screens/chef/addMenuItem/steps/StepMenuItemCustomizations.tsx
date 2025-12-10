import React from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { MenuItemStepContainer } from '../components/MenuItemStepContainer';
import { AppColors, Spacing } from '../../../../../constants/theme';
import { IMenu, IMenuCustomization } from '../../../../types/index';
import StyledButton from '../../../../components/styledButton';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faClose } from '@fortawesome/free-solid-svg-icons';
import { navigate } from '../../../../utils/navigation';

interface StepMenuItemCustomizationsProps {
  menuItemData: Partial<IMenu>;
  onUpdateMenuItemData: (data: Partial<IMenu>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const StepMenuItemCustomizations: React.FC<StepMenuItemCustomizationsProps> = ({
  menuItemData,
  onUpdateMenuItemData,
  onNext,
  onBack,
  onSkip,
}) => {
  const customizations = menuItemData.customizations ?? [];

  const handleAddCustomization = () => {
    navigate.toChef.addOnCustomization(handleAddCustomizationInner);
  };

  const handleAddCustomizationInner = (item: {
    name: string;
    upcharge_price: number;
  }) => {
    const updatedCustomizations = [...customizations, { ...item }];
    onUpdateMenuItemData({ customizations: updatedCustomizations });
  };

  const handleRemoveCustomization = (idx: number) => {
    const newCustomizations = [...customizations];
    newCustomizations.splice(idx, 1);
    onUpdateMenuItemData({ customizations: newCustomizations });
  };

  const handleContinue = () => {
    onNext();
  };

  const handleSkipStep = () => {
    // Clear customizations if skipping
    onUpdateMenuItemData({ customizations: [] });
    onSkip();
  };

  return (
    <MenuItemStepContainer
      title="Add-ons"
      subtitle="Charge for any add-ons customers can add to this item. This step is optional."
      currentStep={7}
      totalSteps={8}
    >
      <View>
        {customizations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No add-ons included yet.
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Add optional extras like extra cheese, bacon, or special sauces that customers can add for an additional charge.
            </Text>
          </View>
        ) : (
          <View style={styles.customizationsList}>
            {customizations.map((customization, idx) => {
              return (
                <View
                  style={styles.customizationItem}
                  key={`customization_${idx}`}
                >
                  <View style={styles.customizationInfo}>
                    <Text style={styles.customizationName}>
                      {customization.name}
                    </Text>
                    <Text style={styles.customizationPrice}>
                      +${(customization.upcharge_price ?? 0).toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveCustomization(idx)}
                    style={styles.removeButton}
                  >
                    <FontAwesomeIcon
                      icon={faClose}
                      size={20}
                      color={AppColors.error}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <StyledButton
          title="+ ADD ADD-ON"
          onPress={handleAddCustomization}
          style={styles.addButton}
          titleStyle={styles.addButtonText}
        />
      </View>

      <View style={styles.buttonContainer}>
        <StyledButton
          title={customizations.length > 0 ? 'Continue' : 'Skip This Step'}
          onPress={customizations.length > 0 ? handleContinue : handleSkipStep}
        />
        {customizations.length > 0 && (
          <Pressable onPress={handleSkipStep} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Skip & Clear Add-ons</Text>
          </Pressable>
        )}
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </MenuItemStepContainer>
  );
};

const styles = StyleSheet.create({
  emptyState: {
    padding: Spacing.xl,
    backgroundColor: AppColors.backgroundSecondary,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: Spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  customizationsList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  customizationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: AppColors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  customizationInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  customizationName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    flex: 1,
  },
  customizationPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.primary,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  addButton: {
    backgroundColor: AppColors.white,
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  addButtonText: {
    color: AppColors.primary,
  },
  buttonContainer: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  skipButtonText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontWeight: '600',
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

