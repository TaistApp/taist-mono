import { StyleSheet } from 'react-native';
import { AppColors } from '../../../../constants/theme';

export const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  pageView: {
    padding: 15,
    rowGap: 12,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    rowGap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.primary,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.text,
  },
  detailText: {
    fontSize: 14,
    color: AppColors.text,
  },
  notesText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: AppColors.textSecondary,
  },
  expiresText: {
    fontSize: 13,
    color: '#ff8800',
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyView: {
    padding: 30,
    alignItems: 'center',
    rowGap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
  },
  emptyText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
