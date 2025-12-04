import { StyleSheet } from 'react-native';
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';


export const styles = StyleSheet.create({
  main: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: AppColors.background,
  },
  pageView: {
    width: '100%',
    padding: 10,
    alignItems: 'center',
    gap: 20,
  },
  formFields: {
    width: '100%',
    marginTop: 15,
    color: AppColors.text,
  },
  formFieldsContainer: {
    backgroundColor: 'transparent',
  },
  formInputFields: {
    color: AppColors.text,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  addressTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  addressText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    width: '100%',
    letterSpacing: 0.5,
  },
  switchWrapper: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  switchText: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
  },
  dropdownBox: {
    width: '100%',
    borderRadius: 4,
    marginTop: 15,
    borderColor: AppColors.border,
    color: AppColors.text,
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  dropdownInput: {
    color: AppColors.text,
    fontSize: 16,
    paddingLeft: 5,
  },
  dropdown: {
    borderColor: AppColors.border,
    borderRadius: 4,
  },
  dropdownText: {
    color: AppColors.text,
    borderColor: AppColors.border,
  },
  vcenter: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 20,
    width: '100%',
  },
  button: {
    borderRadius: 20,
    backgroundColor: AppColors.primary,
    width: '100%',
    padding: 12,
    marginBottom: 5,
  },
  buttonText: {
    color: AppColors.primary,
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    borderRadius: 20,
    backgroundColor: '#cccccc',
    width: '100%',
    padding: 12,
    marginBottom: 5,
  },
  
  // Date picker modal styling
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area for home indicator
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  datePickerModalCancel: {
    fontSize: 16,
    color: AppColors.textSecondary,
    fontWeight: '600',
  },
  datePickerModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: AppColors.text,
  },
  datePickerModalDone: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '600',
  },
  datePickerPicker: {
    width: '100%',
    height: 200,
  },
});
