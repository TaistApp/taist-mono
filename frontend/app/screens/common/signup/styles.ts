import { Dimensions, StyleSheet } from 'react-native';
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';

const screenHeight = Dimensions.get('window').height;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  center: {
    alignItems: 'center',
    paddingTop: 60,
  },
  logo: {
    width: 120,
    height: 60,
    resizeMode: 'contain',
  },

  // User type selection screen
  signupOptionWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  signupOption: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: AppColors.surface,
    padding: Spacing.xl,
    ...Shadows.md,
  },
  signupOptionHeading: {
    color: AppColors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  signupOptionText: {
    color: AppColors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },

  // Form screen (step 2)
  formContainer: {
    flex: 1,
    padding: Spacing.xl,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subheading: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  formContent: {
    gap: Spacing.lg,
  },
  inputWrapper: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 4,
  },
  input: {
    backgroundColor: AppColors.background,
  },

  // Buttons
  buttonContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  signupButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.md,
  },
  signupButtonText: {
    color: AppColors.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  loginLink: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  loginLinkText: {
    color: AppColors.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  // User type selection buttons
  button: {
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    ...Shadows.sm,
  },
  buttonText: {
    color: AppColors.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Terms
  termsContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  terms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    color: AppColors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  termsLink: {
    color: AppColors.primary,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Deprecated/unused (keeping for compatibility)
  vcenter: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  button2: {
    width: '100%',
    padding: Spacing.md,
  },
  buttonText2: {
    color: AppColors.primary,
    fontSize: 14,
    textAlign: 'center',
  },
  formFields: {
    marginTop: Spacing.lg,
  },
  formInputFields: {
    color: AppColors.text,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  heading2: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: AppColors.text,
    letterSpacing: 0.5,
  },
  socialIconsWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  socialIconContainer: {
    padding: Spacing.sm,
    backgroundColor: AppColors.surface,
    borderRadius: 8,
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
});
