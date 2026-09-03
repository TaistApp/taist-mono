import { StyleSheet } from "react-native";
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';


export const styles = StyleSheet.create({
	container: {
        flex: 1,
		padding: 20,
        backgroundColor: AppColors.background,
	},
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 40
	},
    vcenter: {
		flex: 1,
		justifyContent: 'center',
        marginTop: 40
	},
	logo: {
		width: 120,
		height: 60,
		margin: 20
	},
	heading: {
		fontSize: 24,
		fontWeight: '700',
		textAlign: 'center',
		color: AppColors.text
	},
	button: {
		borderRadius: 20,
		backgroundColor: AppColors.primary,
		width: '100%',
		padding: 10,
		marginBottom: 5,
	},
	buttonText: {
		color: AppColors.textOnPrimary,
		fontSize: 18,
		textAlign: 'center'
	},
	button2: {
		width: '100%',
		padding: 10,
	},
	buttonText2: {
		color: AppColors.primary,
		fontSize: 16,
		textAlign: 'center'
	},
	helperText: {
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
		color: AppColors.textSecondary,
		marginTop: 12,
	},
    formFields: {
		marginTop: 20,
	},
    formInputFields: {
		color: AppColors.text,
        fontSize: 18,
	},
    forgot: {
		padding: 0,
        alignSelf: 'flex-end',
	},
    forgotText: {
        fontSize: 14, 
        color: AppColors.text,
        letterSpacing: 0.1
    },
});
