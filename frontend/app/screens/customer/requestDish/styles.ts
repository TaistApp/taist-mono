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
  },
  myRequests: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    rowGap: 10,
  },
  myRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myRequestTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
  },
  myRequestStatus: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.text,
    marginTop: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 20,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
    minWidth: 30,
    textAlign: 'center',
  },
  dropdownBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.textSecondary + '40',
    paddingVertical: 12,
  },
  dropdownInput: {
    fontSize: 15,
    color: AppColors.text,
    flex: 1,
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.textSecondary + '40',
    marginTop: 4,
    maxHeight: 250,
  },
  dropdownText: {
    fontSize: 15,
    color: AppColors.text,
  },
  finePrint: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
});
