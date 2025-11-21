import {Dimensions, StyleSheet} from 'react-native';
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';

const {width, height} = Dimensions.get('window');

export const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: AppColors.background, // White background
  },
  pageView: {
    width: '100%',
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  
  // Profile image section
  profileImageSection: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },

  // Section headers
  sectionHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    letterSpacing: 0.5,
  },
  sectionIcon: {
    color: AppColors.primary, // Orange icon
  },

  // Form fields
  formFields: {
    width: '100%',
    marginTop: 0,
    color: AppColors.text,
  },
  formFieldsContainer: {
    backgroundColor: 'transparent',
  },
  formInputFields: {
    color: AppColors.text,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  
  // Address section
  addressTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  addressText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    letterSpacing: 0.5,
  },
  
  // Switch/Toggle section
  switchWrapper: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    width: '100%',
  },
  switchText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    flex: 1,
  },
  
  // Dropdown styling
  dropdownBox: {
    width: '100%',
    borderRadius: 12,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.background,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownInput: {
    color: AppColors.text,
    fontSize: 16,
    paddingLeft: 0,
  },
  dropdown: {
    borderColor: AppColors.border,
    borderRadius: 12,
    backgroundColor: AppColors.background,
    marginTop: Spacing.xs,
  },
  dropdownText: {
    color: AppColors.text,
    fontSize: 16,
  },
  
  // Button section
  vcenter: {
    justifyContent: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  button: {
    borderRadius: 12,
    backgroundColor: AppColors.primary, // Orange button
    width: '100%',
    paddingVertical: 16,
    marginBottom: Spacing.sm,
    ...Shadows.md,
  },
  buttonText: {
    color: AppColors.textOnPrimary, // White text on orange
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    borderRadius: 12,
    backgroundColor: AppColors.disabled,
    width: '100%',
    paddingVertical: 16,
    marginBottom: Spacing.sm,
  },
  buttonDisabledText: {
    color: AppColors.disabledText,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  
  // Modal styling
  modalBG: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: width * 0.85,
    backgroundColor: AppColors.background,
    borderRadius: 16,
    padding: Spacing.xl,
    paddingVertical: Spacing.xxl,
    gap: Spacing.lg,
    ...Shadows.lg,
  },
  modalText: {
    color: AppColors.text,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
