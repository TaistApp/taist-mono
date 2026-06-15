import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MenuItemStepContainer } from '../components/MenuItemStepContainer';
import { AppColors, Spacing } from '../../../../../constants/theme';
import { IMenu } from '../../../../types/index';
import StyledButton from '../../../../components/styledButton';
import StyledSwitch from '../../../../components/styledSwitch';
import { useAppSelector } from '../../../../hooks/useRedux';
import { getAppliancesByIds } from '../../../../constants/appliances';

interface StepMenuItemReviewProps {
  menuItemData: Partial<IMenu>;
  onUpdateMenuItemData: (data: Partial<IMenu>) => void;
  onComplete: () => void;
  onBack: () => void;
  // When provided (edit mode), each section shows an "Edit" button that jumps
  // straight to that step instead of forcing a linear walk through the wizard.
  onEditSection?: (step: number) => void;
}

export const StepMenuItemReview: React.FC<StepMenuItemReviewProps> = ({
  menuItemData,
  onUpdateMenuItemData,
  onComplete,
  onBack,
  onEditSection,
}) => {
  const isEdit = !!onEditSection;

  // Section label + (in edit mode) an "Edit" button that opens that step.
  const SectionHeader = ({ label, step }: { label: string; step?: number }) => (
    <View style={styles.reviewHeaderRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      {onEditSection && step !== undefined && (
        <Pressable
          testID={`menuWizard.editSection.${step}`}
          onPress={() => onEditSection(step)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.editLink}>Edit</Text>
        </Pressable>
      )}
    </View>
  );
  const categories = useAppSelector(x => x.table.categories);
  const allergens = useAppSelector(x => x.table.allergens);

  const displayItem = menuItemData.is_live ?? true;

  // Parse IDs for display
  const categoryIds = React.useMemo(() => {
    if (Array.isArray(menuItemData.category_ids)) {
      return menuItemData.category_ids;
    }
    if (typeof menuItemData.category_ids === 'string' && menuItemData.category_ids) {
      return menuItemData.category_ids.split(',').map(x => parseInt(x)).filter(x => !isNaN(x));
    }
    return [];
  }, [menuItemData.category_ids]);

  const applianceIds = React.useMemo(() => {
    if (Array.isArray(menuItemData.appliances)) {
      return menuItemData.appliances;
    }
    if (typeof menuItemData.appliances === 'string' && menuItemData.appliances) {
      return menuItemData.appliances.split(',').map(x => parseInt(x)).filter(x => !isNaN(x));
    }
    return [];
  }, [menuItemData.appliances]);

  const allergyIds = React.useMemo(() => {
    if (Array.isArray(menuItemData.allergens)) {
      return menuItemData.allergens;
    }
    if (typeof menuItemData.allergens === 'string' && menuItemData.allergens) {
      return menuItemData.allergens.split(',').map(x => parseInt(x)).filter(x => !isNaN(x));
    }
    return [];
  }, [menuItemData.allergens]);

  // Get names from IDs
  const selectedCategories = categories.filter(c => categoryIds.includes(c.id ?? 0));
  const selectedAppliances = getAppliancesByIds(applianceIds);
  const selectedAllergens = allergens.filter(a => allergyIds.includes(a.id ?? 0));

  const completionTimes = [
    { id: '1', value: '2 hr +', m: 120 },
    { id: '2', value: '1.5 hr', m: 90 },
    { id: '3', value: '1 hr', m: 60 },
    { id: '4', value: '45 m', m: 45 },
    { id: '5', value: '30 m', m: 30 },
    { id: '6', value: '15 m', m: 15 },
  ];

  const completionTime = completionTimes.find(
    ct => ct.m === menuItemData.estimated_time
  )?.value ?? 'Not set';

  const customizations = menuItemData.customizations ?? [];

  return (
    <MenuItemStepContainer
      title={isEdit ? 'Edit Menu Item' : 'Review & Publish'}
      subtitle={
        isEdit
          ? 'Tap Edit on any section to change it, then save your changes.'
          : 'Review your menu item details before saving.'
      }
      currentStep={isEdit ? undefined : 8}
      totalSteps={isEdit ? undefined : 8}
    >
      <View style={styles.reviewContainer}>
        {/* Name */}
        <View style={styles.reviewSection}>
          <SectionHeader label="Name" step={1} />
          <Text style={styles.reviewValue}>{menuItemData.title || 'Not set'}</Text>
        </View>

        {/* Description */}
        <View style={styles.reviewSection}>
          <SectionHeader label="Description" step={2} />
          <Text style={styles.reviewValue}>
            {menuItemData.description || 'Not set'}
          </Text>
        </View>

        {/* Categories */}
        <View style={styles.reviewSection}>
          <SectionHeader label="Categories" step={3} />
          <Text style={styles.reviewValue}>
            {selectedCategories.length > 0
              ? selectedCategories.map(c => c.name).join(', ')
              : 'None selected'}
          </Text>
          {menuItemData.is_new_category && menuItemData.new_category_name && (
            <Text style={styles.reviewValueSecondary}>
              + New: {menuItemData.new_category_name}
            </Text>
          )}
        </View>

        {/* Allergens */}
        <View style={styles.reviewSection}>
          <SectionHeader label="Allergens" step={4} />
          <Text style={styles.reviewValue}>
            {selectedAllergens.length > 0
              ? selectedAllergens.map(a => a.name).join(', ')
              : 'None'}
          </Text>
        </View>

        {/* Appliances */}
        <View style={styles.reviewSection}>
          <SectionHeader label="Required Appliances" step={5} />
          <Text style={styles.reviewValue}>
            {selectedAppliances.length > 0
              ? selectedAppliances.map(a => a.name).join(', ')
              : 'None selected'}
          </Text>
        </View>

        {/* Completion Time */}
        <View style={styles.reviewSection}>
          <SectionHeader label="Estimated Completion Time" step={5} />
          <Text style={styles.reviewValue}>{completionTime}</Text>
        </View>

        {/* Serving & Price */}
        <View style={styles.reviewSection}>
          <SectionHeader label="Serving Size & Price" step={6} />
          <Text style={styles.reviewValue}>
            Serves {menuItemData.serving_size || 0} • $
            {typeof menuItemData.price === 'number'
              ? menuItemData.price.toFixed(2)
              : menuItemData.price_string || '0.00'}
          </Text>
        </View>

        {/* Add-ons */}
        {(customizations.length > 0 || isEdit) && (
          <View style={styles.reviewSection}>
            <SectionHeader label="Add-ons" step={7} />
            {customizations.length === 0 && (
              <Text style={styles.reviewValue}>None</Text>
            )}
            {customizations.map((custom, idx) => (
              <Text key={idx} style={styles.reviewValue}>
                • {custom.name} (+${(custom.upcharge_price ?? 0).toFixed(2)})
              </Text>
            ))}
          </View>
        )}

        {/* Display Toggle */}
        <View style={styles.reviewSection}>
          <StyledSwitch
            testID="menuWizard.displaySwitch"
            label="Display this item on menu?"
            value={!!displayItem}
            onPress={() => {
              onUpdateMenuItemData({ is_live: displayItem ? 0 : 1 });
            }}
          />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <StyledButton
          testID="menuWizard.saveButton"
          title={isEdit ? 'SAVE CHANGES' : 'SAVE MENU ITEM'}
          onPress={onComplete}
        />
        <Pressable testID="menuWizard.backButton" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{isEdit ? 'Cancel' : 'Back to Edit'}</Text>
        </Pressable>
      </View>
    </MenuItemStepContainer>
  );
};

const styles = StyleSheet.create({
  reviewContainer: {
    gap: Spacing.lg,
  },
  reviewSection: {
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editLink: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.primary,
  },
  reviewValue: {
    fontSize: 16,
    color: AppColors.text,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  reviewValueSecondary: {
    fontSize: 14,
    color: AppColors.primary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
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
});

