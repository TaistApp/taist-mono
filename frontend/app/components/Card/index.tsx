import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { AppColors } from '../../../constants/theme';

export const Card = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => <View style={[styles.card, style]}>{children}</View>;

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
});

export default Card;
