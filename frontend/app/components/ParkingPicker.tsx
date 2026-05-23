import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PARKING_TYPES, getSelectedParkingTypes } from '../constants/parkingTypes';
import { AppColors, Shadows, Spacing } from '../../constants/theme';

interface Props {
  parkingType?: string;
  parkingInstructions?: string;
  onTypeChange: (type: string | undefined) => void;
  onInstructionsChange: (instructions: string) => void;
  compact?: boolean;
}

const ParkingPicker: React.FC<Props> = ({
  parkingType,
  parkingInstructions,
  onTypeChange,
  onInstructionsChange,
  compact = false,
}) => {
  const selectedIds = getSelectedParkingTypes(parkingType);

  const handleToggle = (id: string) => {
    let updated: string[];
    if (selectedIds.includes(id)) {
      updated = selectedIds.filter(s => s !== id);
    } else {
      updated = [...selectedIds, id];
    }
    onTypeChange(updated.length > 0 ? updated.join(',') : undefined);
  };

  return (
    <View style={styles.container}>
      {!compact && (
        <Text style={styles.label}>Arrival & Parking</Text>
      )}
      <View style={styles.chipRow}>
        {PARKING_TYPES.map(type => {
          const isSelected = selectedIds.includes(type.id);
          return (
            <TouchableOpacity
              key={type.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => handleToggle(type.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {type.icon} {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        style={styles.instructionsInput}
        placeholder="Additional instructions (gate code, building #, etc.)"
        placeholderTextColor={AppColors.textTertiary}
        value={parkingInstructions ?? ''}
        onChangeText={onInstructionsChange}
        maxLength={255}
        multiline
        numberOfLines={2}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  chipSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text,
  },
  chipTextSelected: {
    color: AppColors.textOnPrimary,
  },
  instructionsInput: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: AppColors.text,
    minHeight: 44,
    textAlignVertical: 'top',
  },
});

export default ParkingPicker;
