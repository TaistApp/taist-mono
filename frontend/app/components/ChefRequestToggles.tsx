import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import StyledSwitch from './styledSwitch';
import { AppColors, Spacing } from '../../constants/theme';

interface Props {
  shoeCoverings: boolean;
  containers: boolean;
  onShoeCoveringsChange: (value: boolean) => void;
  onContainersChange: (value: boolean) => void;
  /** Drops the section heading — for surfaces that already have one. */
  compact?: boolean;
}

/**
 * The two things a customer can ask the chef to bring/do before they leave the
 * house. Saved on the profile as a default and copied onto each order at
 * checkout, so shared here to keep both surfaces identical.
 */
const ChefRequestToggles: React.FC<Props> = ({
  shoeCoverings,
  containers,
  onShoeCoveringsChange,
  onContainersChange,
  compact = false,
}) => {
  return (
    <View style={styles.container}>
      {!compact && <Text style={styles.label}>Chef Requests</Text>}
      <View style={styles.row}>
        <StyledSwitch
          testID="chefRequests.shoeCoveringsToggle"
          label="Request Chef Wear Shoe Coverings?"
          labelLines={0}
          value={shoeCoverings}
          onPress={() => onShoeCoveringsChange(!shoeCoverings)}
        />
      </View>
      <View style={styles.row}>
        <StyledSwitch
          testID="chefRequests.containersToggle"
          label="Request Chef Bring Containers?"
          labelLines={0}
          value={containers}
          onPress={() => onContainersChange(!containers)}
        />
      </View>
      <Text style={styles.helper}>
        Your chef sees these with the order, so they can pack before they head out.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: Spacing.sm,
  },
  row: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  helper: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
});

export default ChefRequestToggles;
