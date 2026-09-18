import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppColors } from '../../constants/theme';
import {
  CLOSED_ORDER_LABELS,
  orderProgressSteps,
} from '../utils/orderProgress';

interface OrderProgressProps {
  status?: number | null;
}

/**
 * Where the order is right now: requested → accepted → on the way → complete.
 *
 * The customer had no way to watch an order without the app pushing them
 * somewhere else, so the state lives on the receipt itself.
 */
const OrderProgress: React.FC<OrderProgressProps> = ({ status }) => {
  const steps = orderProgressSteps(status);

  if (!steps) {
    const closed = status != null ? CLOSED_ORDER_LABELS[status] : undefined;
    if (!closed) return null;
    return (
      <View testID="orderProgress.closed" style={styles.closedCard}>
        <Text style={styles.closedText}>{closed}</Text>
      </View>
    );
  }

  return (
    <View testID="orderProgress" style={styles.container}>
      {steps.map((step, idx) => {
        const reached = step.state !== 'upcoming';
        return (
          <View key={step.key} style={styles.step}>
            <View style={styles.markerColumn}>
              <View
                testID={`orderProgress.dot.${step.key}`}
                style={[
                  styles.dot,
                  reached && styles.dotReached,
                  step.state === 'current' && styles.dotCurrent,
                ]}
              />
              {idx < steps.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    step.state === 'done' && styles.connectorDone,
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.label,
                reached && styles.labelReached,
                step.state === 'current' && styles.labelCurrent,
              ]}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const DOT = 14;

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.background,
    borderRadius: 10,
    padding: 20,
    paddingBottom: 10,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 12,
  },
  markerColumn: {
    alignItems: 'center',
    width: DOT,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: AppColors.border,
    backgroundColor: AppColors.background,
  },
  dotReached: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.primary,
  },
  // The step the order is sitting on reads as an outline so it's clearly
  // "here", not "finished".
  dotCurrent: {
    backgroundColor: AppColors.background,
    borderWidth: 4,
  },
  connector: {
    width: 2,
    height: 22,
    backgroundColor: AppColors.border,
  },
  connectorDone: {
    backgroundColor: AppColors.primary,
  },
  label: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    color: AppColors.textTertiary,
    marginTop: -2,
    marginBottom: 18,
  },
  labelReached: {
    color: AppColors.text,
  },
  labelCurrent: {
    fontWeight: '700',
  },
  closedCard: {
    backgroundColor: AppColors.background,
    borderRadius: 10,
    padding: 20,
  },
  closedText: {
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.textTertiary,
  },
});

export default OrderProgress;
