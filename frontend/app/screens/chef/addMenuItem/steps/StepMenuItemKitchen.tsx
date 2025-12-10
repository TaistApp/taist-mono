import React from 'react';
import { View, Text, Pressable, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { MenuItemStepContainer } from '../components/MenuItemStepContainer';
import { AppColors, Spacing } from '../../../../../constants/theme';
import { IMenu } from '../../../../types/index';
import { ShowErrorToast } from '../../../../utils/toast';
import StyledButton from '../../../../components/styledButton';
import { useAppSelector } from '../../../../hooks/useRedux';
import { getImageURL } from '../../../../utils/functions';

// Default appliance icon mapping (fallback emojis if image fails to load)
const applianceIcons: { [key: string]: string } = {
  'Sink': '💧',
  'Stove': '🍳',
  'Oven': '🔥',
  'Microwave': '📻',
  'Toaster': '🍞',
  'Grill': '🔥',
};

interface StepMenuItemKitchenProps {
  menuItemData: Partial<IMenu>;
  onUpdateMenuItemData: (data: Partial<IMenu>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepMenuItemKitchen: React.FC<StepMenuItemKitchenProps> = ({
  menuItemData,
  onUpdateMenuItemData,
  onNext,
  onBack,
}) => {
  const appliances = useAppSelector(x => x.table.appliances);
  const [imageErrors, setImageErrors] = React.useState<{[key: number]: boolean}>({});

  // Parse appliance IDs from string or array
  const applianceIds = React.useMemo(() => {
    if (Array.isArray(menuItemData.appliances)) {
      return menuItemData.appliances;
    }
    if (typeof menuItemData.appliances === 'string' && menuItemData.appliances) {
      return menuItemData.appliances.split(',').map(x => parseInt(x)).filter(x => !isNaN(x));
    }
    // Default to Sink (id: 1) - always required
    return [1];
  }, [menuItemData.appliances]);

  const completionTimeId = menuItemData.completion_time_id ?? '1';

  const completionTimes = [
    { id: '1', value: '2 hr +', m: 120 },
    { id: '2', value: '1.5 hr', m: 90 },
    { id: '3', value: '1 hr', m: 60 },
    { id: '4', value: '45 m', m: 45 },
    { id: '5', value: '30 m', m: 30 },
    { id: '6', value: '15 m', m: 15 },
  ];

  const handleAppliancePress = (id: number) => {
    let tempIds = [...applianceIds];
    const index = tempIds.findIndex(x => x === id);
    if (index >= 0) {
      tempIds.splice(index, 1);
    } else {
      tempIds.push(id);
    }
    onUpdateMenuItemData({ appliances: tempIds as any });
  };

  const handleCompletionTimePress = (id: string) => {
    onUpdateMenuItemData({ completion_time_id: id });
  };

  const validateAndProceed = () => {
    // Validate appliances
    if (applianceIds.length === 0) {
      ShowErrorToast('Please select at least one appliance');
      return;
    }

    // Validate completion time
    if (!completionTimeId) {
      ShowErrorToast('Please select an estimated completion time');
      return;
    }

    // Store the actual time in minutes
    const selectedTime = completionTimes.find(x => x.id === completionTimeId);
    if (selectedTime) {
      onUpdateMenuItemData({ estimated_time: selectedTime.m });
    }

    onNext();
  };

  return (
    <MenuItemStepContainer
      title="Kitchen Requirements"
      subtitle="What does the customer need to prepare this dish?"
      currentStep={5}
      totalSteps={8}
    >
      <View>
        <Text style={styles.sectionTitle}>Required Appliances</Text>
        <Text style={styles.sectionSubtitle}>
          Select the customer's kitchen appliances that are required to make the item.
        </Text>
        <View style={styles.applianceContainer}>
          {appliances.map((appliance, idx) => {
            const isSelected = applianceIds.includes(appliance.id ?? 0);
            const isSink = appliance.name === 'Sink';
            const applianceId = appliance.id ?? 0;
            const hasImageError = imageErrors[applianceId];

            return (
              <TouchableOpacity
                style={[
                  styles.applianceItem,
                  isSelected && styles.applianceSelected,
                ]}
                onPress={() => handleAppliancePress(applianceId)}
                disabled={isSink}
                key={`appliance_${idx}`}
              >
                {appliance.image && appliance.image.trim() !== '' && !hasImageError ? (
                  <Image
                    source={{ uri: getImageURL(appliance.image) }}
                    style={styles.applianceImg}
                    onError={() => setImageErrors(prev => ({...prev, [applianceId]: true}))}
                  />
                ) : (
                  <Text style={styles.applianceEmoji}>
                    {applianceIcons[appliance.name ?? ''] ?? '🔧'}
                  </Text>
                )}
                <Text
                  style={[
                    styles.applianceText,
                    isSelected && styles.applianceTextSelected,
                  ]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {appliance.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={styles.sectionTitle}>Estimated Completion Time</Text>
        <Text style={styles.sectionSubtitle}>
          Select the estimated time it takes to complete the item from start to finish. This includes cleanup.
        </Text>
        <View style={styles.completionTimeContainer}>
          {completionTimes.map((ct, idx) => {
            const isSelected = ct.id === completionTimeId;
            return (
              <TouchableOpacity
                style={isSelected ? styles.tab : styles.tabDisabled}
                key={`ct_${idx}`}
                onPress={() => handleCompletionTimePress(ct.id)}
              >
                <Text
                  style={isSelected ? styles.tabText : styles.tabDisabledText}
                >
                  {ct.value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
  applianceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'flex-start',
  },
  applianceItem: {
    width: 100,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AppColors.border,
    backgroundColor: AppColors.white,
  },
  applianceSelected: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.primaryLight,
  },
  applianceImg: {
    width: 56,
    height: 56,
    marginBottom: Spacing.xs,
    resizeMode: 'contain',
  },
  applianceEmoji: {
    fontSize: 44,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  applianceText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  applianceTextSelected: {
    color: AppColors.textOnPrimary,
    fontWeight: '600',
  },
  completionTimeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tab: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  tabDisabled: {
    backgroundColor: AppColors.backgroundSecondary,
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  tabText: {
    color: AppColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  tabDisabledText: {
    color: AppColors.textSecondary,
    fontSize: 14,
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

