import { StyleSheet } from "react-native";
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
		gap:20,
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
		width: '100%'
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
        color: AppColors.text
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
        paddingLeft: 5
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
		includeFontPadding: false,
		textAlignVertical: 'center',
	},
    buttonDisabled: {
		borderRadius: 20,
		backgroundColor: '#cccccc',
		width: '100%',
		padding: 12,
		marginBottom: 5,
	}
});