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
		flexGrow: 1,
		width: '100%',
		padding: 10,
		paddingTop: 20,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 20,
	},
	text: {
		fontSize: 16,
		fontWeight: '500',
		color: AppColors.text,
		width: '100%'
	},
	vcenter: {
		justifyContent: 'center',
        marginTop: 20,
        width: '100%',
	},
});