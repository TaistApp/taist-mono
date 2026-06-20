import React, { useState } from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MenuItemStepContainer } from '../components/MenuItemStepContainer';
import { AppColors, Spacing } from '../../../../../constants/theme';
import { IMenu, IMenuCustomization } from '../../../../types/index';
import StyledButton from '../../../../components/styledButton';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faClose, faPlus, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { navigate } from '../../../../utils/navigation';
import { SuggestAddOnsAPI } from '../../../../services/api';

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

  // AI add-on suggestions revealed when the chef taps "+ ADD-ON"
  const [panelOpen, setPanelOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<IMenuCustomization[] | null>(null);

  // Suggestions the chef hasn't already added (match on name, case-insensitive)
  const normalizeName = (n?: string) => (n ?? '').trim().toLowerCase();
  const availableSuggestions = (suggestions ?? []).filter(
    s => !customizations.some(c => normalizeName(c.name) === normalizeName(s.name))
  );

  const fetchSuggestions = async () => {
    if (!menuItemData.title) return;
    setAiLoading(true);
    try {
      const resp = await SuggestAddOnsAPI({
        dish_name: menuItemData.title,
        description: menuItemData.description,
      });
      setSuggestions(resp?.success === 1 && Array.isArray(resp.suggestions) ? resp.suggestions : []);
    } catch (_) {
      setSuggestions([]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddCustomization = () => {
    setPanelOpen(true);
    // Fetch AI suggestions once, the first time the panel opens
    if (suggestions === null && !aiLoading) {
      fetchSuggestions();
    }
  };

  const handleAddSuggestion = (item: IMenuCustomization) => {
    onUpdateMenuItemData({ customizations: [...customizations, { ...item }] });
  };

  const handleCreateCustom = () => {
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
              Add optional extras like extra cheese, bacon, special sauces, or sides that customers can add for an additional charge.
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

        {!panelOpen && (
          <StyledButton
            testID="menuWizard.addCustomizationButton"
            title="+ ADD-ON"
            onPress={handleAddCustomization}
            style={styles.addButton}
            titleStyle={styles.addButtonText}
          />
        )}

        {panelOpen && (
          <View style={styles.suggestionPanel}>
            <View style={styles.suggestionHeader}>
              <FontAwesomeIcon icon={faWandMagicSparkles} size={14} color={AppColors.primary} />
              <Text style={styles.suggestionHeaderText}>Suggested for this dish</Text>
            </View>

            {aiLoading ? (
              <View style={styles.suggestionLoading}>
                <ActivityIndicator color={AppColors.primary} />
                <Text style={styles.suggestionLoadingText}>Finding add-ons…</Text>
              </View>
            ) : availableSuggestions.length > 0 ? (
              <View style={styles.suggestionList}>
                {availableSuggestions.map((s, idx) => (
                  <TouchableOpacity
                    key={`suggestion_${idx}`}
                    testID={`menuWizard.suggestion.${idx}`}
                    style={styles.suggestionItem}
                    onPress={() => handleAddSuggestion(s)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.suggestionInfo}>
                      <Text style={styles.suggestionName}>{s.name}</Text>
                      <Text style={styles.suggestionPrice}>
                        +${(s.upcharge_price ?? 0).toFixed(2)}
                      </Text>
                    </View>
                    <FontAwesomeIcon icon={faPlus} size={16} color={AppColors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.suggestionEmpty}>
                {suggestions === null
                  ? 'Tap below to add your own.'
                  : 'No more suggestions — add your own below.'}
              </Text>
            )}

            <StyledButton
              testID="menuWizard.createCustomAddOnButton"
              title="+ Create custom add-on"
              onPress={handleCreateCustom}
              style={styles.addButton}
              titleStyle={styles.addButtonText}
            />
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <StyledButton
          testID="menuWizard.continueButton"
          title={customizations.length > 0 ? 'Continue' : 'Skip This Step'}
          onPress={customizations.length > 0 ? handleContinue : handleSkipStep}
        />
        {customizations.length > 0 && (
          <Pressable onPress={handleSkipStep} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Skip & Clear Add-ons</Text>
          </Pressable>
        )}
        <Pressable testID="menuWizard.backButton" onPress={onBack} style={styles.backButton}>
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
    marginBottom: Spacing.md,
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
  suggestionPanel: {
    gap: Spacing.sm,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  suggestionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.text,
  },
  suggestionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  suggestionLoadingText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  suggestionList: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: AppColors.surfaceVariant,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  suggestionInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    flex: 1,
  },
  suggestionPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.primary,
  },
  suggestionEmpty: {
    fontSize: 14,
    color: AppColors.textSecondary,
    paddingVertical: Spacing.sm,
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

