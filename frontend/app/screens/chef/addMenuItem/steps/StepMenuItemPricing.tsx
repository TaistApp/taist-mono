import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { MenuItemStepContainer } from '../components/MenuItemStepContainer';
import { AppColors, Spacing } from '../../../../../constants/theme';
import { IMenu } from '../../../../types/index';
import { ShowErrorToast } from '../../../../utils/toast';
import StyledTextInput from '../../../../components/styledTextInput';
import StyledButton from '../../../../components/styledButton';
import { convertStringToNumber } from '../../../../utils/functions';

interface StepMenuItemPricingProps {
  menuItemData: Partial<IMenu>;
  onUpdateMenuItemData: (data: Partial<IMenu>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepMenuItemPricing: React.FC<StepMenuItemPricingProps> = ({
  menuItemData,
  onUpdateMenuItemData,
  onNext,
  onBack,
}) => {
  // Initialize serving_size to 1 if not set
  useEffect(() => {
    if (!menuItemData.serving_size || menuItemData.serving_size <= 0) {
      onUpdateMenuItemData({ serving_size: 1 });
    }
  }, []);

  const servingSize = menuItemData.serving_size ?? 1;
  const price = menuItemData.price_string ?? '';

  const handlePriceChange = (text: string) => {
    onUpdateMenuItemData({ price_string: text });
  };

  const handlePriceEndEditing = () => {
    const numericPrice = convertStringToNumber(price);
    onUpdateMenuItemData({ 
      price_string: numericPrice.toFixed(2),
      price: numericPrice 
    });
  };

  const handleServingSizeChange = (value: number) => {
    onUpdateMenuItemData({ serving_size: value });
  };

  const validateAndProceed = () => {
    // Validate serving size
    if (!servingSize || servingSize <= 0) {
      ShowErrorToast('Please set a serving size');
      return;
    }

    // Validate price
    if (!price || price === '' || price === '0.00') {
      ShowErrorToast('Please enter a price');
      return;
    }

    const numericPrice = convertStringToNumber(price);
    if (numericPrice <= 0) {
      ShowErrorToast('Price must be greater than $0.00');
      return;
    }

    // Ensure price is stored as number
    onUpdateMenuItemData({ price: numericPrice });

    onNext();
  };

  return (
    <MenuItemStepContainer
      title="Serving & Pricing"
      subtitle="Define portion size and cost for your menu item."
      currentStep={6}
      totalSteps={8}
    >
      <View>
        <Text style={styles.sectionTitle}>Serving Size: {servingSize}</Text>
        <Text style={styles.sectionSubtitle}>
          How many people does this menu item serve?
        </Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>1</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            minimumTrackTintColor={AppColors.primary}
            maximumTrackTintColor={AppColors.border}
            thumbTintColor={AppColors.primary}
            step={1}
            value={servingSize}
            onValueChange={handleServingSizeChange}
          />
          <Text style={styles.sliderLabel}>10</Text>
        </View>
        <Text style={styles.servingSizeDisplay}>
          Serves {servingSize} {servingSize === 1 ? 'person' : 'people'}
        </Text>
      </View>

      <View>
        <Text style={styles.sectionTitle}>Price</Text>
        <Text style={styles.sectionSubtitle}>
          Choose the price you want to charge for the item.
        </Text>
        <StyledTextInput
          label="Price Per Item"
          placeholder="0.00"
          value={price}
          onChangeText={handlePriceChange}
          onEndEditing={handlePriceEndEditing}
          keyboardType="decimal-pad"
          prefix="$"
        />
        {price && convertStringToNumber(price) > 0 && (
          <View style={styles.pricePreview}>
            <Text style={styles.pricePreviewText}>
              💡 For {servingSize} {servingSize === 1 ? 'person' : 'people'}: ${convertStringToNumber(price).toFixed(2)}
            </Text>
            <Text style={styles.pricePreviewText}>
              For {servingSize * 2} people (×2): ${(convertStringToNumber(price) * 2).toFixed(2)}
            </Text>
          </View>
        )}
      </View>

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
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontWeight: '600',
    width: 20,
    textAlign: 'center',
  },
  servingSizeDisplay: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  pricePreview: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: AppColors.backgroundSecondary,
    borderRadius: 8,
    gap: Spacing.xs,
  },
  pricePreviewText: {
    fontSize: 14,
    color: AppColors.text,
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

