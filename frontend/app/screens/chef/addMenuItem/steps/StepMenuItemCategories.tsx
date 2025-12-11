import React from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { MenuItemStepContainer } from '../components/MenuItemStepContainer';
import { AppColors, Spacing } from '../../../../../constants/theme';
import { IMenu } from '../../../../types/index';
import { ShowErrorToast } from '../../../../utils/toast';
import StyledTextInput from '../../../../components/styledTextInput';
import StyledButton from '../../../../components/styledButton';
import StyledSwitch from '../../../../components/styledSwitch';
import { useAppSelector } from '../../../../hooks/useRedux';

interface StepMenuItemCategoriesProps {
  menuItemData: Partial<IMenu>;
  onUpdateMenuItemData: (data: Partial<IMenu>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepMenuItemCategories: React.FC<StepMenuItemCategoriesProps> = ({
  menuItemData,
  onUpdateMenuItemData,
  onNext,
  onBack,
}) => {
  const categories = useAppSelector(x => x.table.categories);

  // Parse category IDs from string or array
  const categoryIds = React.useMemo(() => {
    if (Array.isArray(menuItemData.category_ids)) {
      return menuItemData.category_ids;
    }
    if (typeof menuItemData.category_ids === 'string' && menuItemData.category_ids) {
      return menuItemData.category_ids.split(',').map(x => parseInt(x)).filter(x => !isNaN(x));
    }
    return [];
  }, [menuItemData.category_ids]);

  const isNewCategory = menuItemData.is_new_category ?? false;
  const newCategoryName = menuItemData.new_category_name ?? '';

  const handleCategoryPress = (id: number) => {
    const tempIds = [...categoryIds];
    const index = tempIds.findIndex(x => x === id);
    if (index >= 0) {
      tempIds.splice(index, 1);
    } else {
      tempIds.push(id);
    }
    onUpdateMenuItemData({ category_ids: tempIds as any });
  };

  const validateAndProceed = () => {
    // Validate categories
    if (categoryIds.length === 0 && (!isNewCategory || !newCategoryName.trim())) {
      ShowErrorToast('Please select at least one category or request a new one');
      return;
    }

    if (isNewCategory && newCategoryName.trim().length < 2) {
      ShowErrorToast('New category name must be at least 2 characters');
      return;
    }

    onNext();
  };

  return (
    <MenuItemStepContainer
      title="Categories"
      subtitle="Help customers find your menu item by selecting relevant categories."
      currentStep={3}
      totalSteps={8}
    >
      <View>
        <Text style={styles.sectionTitle}>Select Categories *</Text>
        <Text style={styles.sectionSubtitle}>Choose one or more categories that best describe your menu offering</Text>
        <View style={styles.tabContainer}>
          {categories.map((category, idx) => {
            const isSelected = categoryIds.includes(category.id ?? 0);
            return (
              <TouchableOpacity
                style={isSelected ? styles.tab : styles.tabDisabled}
                key={`category_${idx}`}
                onPress={() => handleCategoryPress(category.id ?? 0)}
              >
                <Text style={isSelected ? styles.tabText : styles.tabDisabledText}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.newCategorySection}>
        <StyledSwitch
          label="Request a new Category?"
          value={isNewCategory}
          onPress={() => {
            onUpdateMenuItemData({ is_new_category: !isNewCategory });
          }}
        />

        {isNewCategory && (
          <StyledTextInput
            placeholder="New Category Name"
            onChangeText={(val) => onUpdateMenuItemData({ new_category_name: val })}
            value={newCategoryName}
            maxLength={50}
          />
        )}
      </View>

      {/* AI Integration Point - Hidden for now */}
      {/* <View style={styles.aiSection}>
        <Text style={styles.aiLabel}>✨ AI Suggestions (Coming Soon)</Text>
        <Text style={styles.aiDescription}>
          Based on "{menuItemData.title}", AI will suggest relevant categories.
        </Text>
        <StyledButton
          title="Get AI Category Suggestions"
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
    marginRight: -Spacing.sm,
    marginTop: -Spacing.sm,
  },
  tab: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: Spacing.lg + 4,
    paddingVertical: Spacing.md,
    borderRadius: 24,
    marginRight: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tabDisabled: {
    backgroundColor: AppColors.surface,
    paddingHorizontal: Spacing.lg + 4,
    paddingVertical: Spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AppColors.border,
    marginRight: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tabText: {
    color: AppColors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  tabDisabledText: {
    color: AppColors.textSecondary,
    fontSize: 15,
  },
  newCategorySection: {
    gap: Spacing.md,
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
