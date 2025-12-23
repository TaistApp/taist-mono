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
}

export const StepMenuItemReview: React.FC<StepMenuItemReviewProps> = ({
  menuItemData,
  onUpdateMenuItemData,
  onComplete,
  onBack,
}) => {
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
      title="Review & Publish"
      subtitle="Review your menu item details before saving."
      currentStep={8}
      totalSteps={8}
    >
      <View style={styles.reviewContainer}>
        {/* Name */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Name</Text>
          <Text style={styles.reviewValue}>{menuItemData.title || 'Not set'}</Text>
        </View>

        {/* Description */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Description</Text>
          <Text style={styles.reviewValue}>
            {menuItemData.description || 'Not set'}
          </Text>
        </View>

        {/* Categories */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Categories</Text>
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
          <Text style={styles.reviewLabel}>Allergens</Text>
          <Text style={styles.reviewValue}>
            {selectedAllergens.length > 0
              ? selectedAllergens.map(a => a.name).join(', ')
              : 'None'}
          </Text>
        </View>

        {/* Appliances */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Required Appliances</Text>
          <Text style={styles.reviewValue}>
            {selectedAppliances.length > 0
              ? selectedAppliances.map(a => a.name).join(', ')
              : 'None selected'}
          </Text>
        </View>

        {/* Completion Time */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Estimated Completion Time</Text>
          <Text style={styles.reviewValue}>{completionTime}</Text>
        </View>

        {/* Serving & Price */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Serving Size & Price</Text>
          <Text style={styles.reviewValue}>
            Serves {menuItemData.serving_size || 0} • $
            {typeof menuItemData.price === 'number'
              ? menuItemData.price.toFixed(2)
              : menuItemData.price_string || '0.00'}
          </Text>
        </View>

        {/* Add-ons */}
        {customizations.length > 0 && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>Add-ons</Text>
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
          title="SAVE MENU ITEM"
          onPress={onComplete}
        />
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to Edit</Text>
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
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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

