import { StyleSheet } from 'react-native';
import { AppColors, Spacing } from '../../../../constants/theme';

export const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  codeCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  codeLabel: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.primary,
    letterSpacing: 1,
  },
  codeSubtext: {
    fontSize: 12,
    color: AppColors.textTertiary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: AppColors.surface,
    borderRadius: 10,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
  },
  statLabel: {
    fontSize: 11,
    color: AppColors.textTertiary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  referralItem: {
    backgroundColor: AppColors.surface,
    borderRadius: 10,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  referralPhone: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.text,
  },
  referralName: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  referralDate: {
    fontSize: 11,
    color: AppColors.textTertiary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeSignedUp: {
    backgroundColor: '#DBEAFE',
  },
  badgeCompleted: {
    backgroundColor: '#D1FAE5',
  },
  badgeExpired: {
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextPending: {
    color: '#92400E',
  },
  badgeTextSignedUp: {
    color: '#1E40AF',
  },
  badgeTextCompleted: {
    color: '#065F46',
  },
  badgeTextExpired: {
    color: '#6B7280',
  },
  creditCode: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.primary,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: AppColors.textTertiary,
    fontSize: 14,
    paddingVertical: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
  },
  modalSubtext: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: AppColors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
});
