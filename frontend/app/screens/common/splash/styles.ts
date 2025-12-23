import { Dimensions, StyleSheet } from "react-native";
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';

const screen_width = Dimensions.get('window').width;
const screen_height = Dimensions.get('window').height;

export const styles = StyleSheet.create({
	// Loading splash (orange branding screen)
	splash: {
		backgroundColor: AppColors.primary,
		width: screen_width,
		height: screen_height,
		paddingHorizontal: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	splashLogo: {
		width: '100%',
		height: '100%',
		resizeMode: 'contain',
	},
	outdatedText: {
		color: AppColors.textOnPrimary,
		fontSize: 16,
		textAlign: 'center',
		marginTop: 20,
		fontWeight: '600',
	},

	// Main splash screen (white with buttons)
	main: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: AppColors.background,
		paddingHorizontal: Spacing.xl,
	},
	logo: {
		width: 200,
		height: 100,
		resizeMode: 'contain',
		marginBottom: 80,
	},
	buttonsWrapper: {
		width: '100%',
		paddingHorizontal: Spacing.xxl,
		gap: Spacing.md,
	},
	button: {
		width: '100%',
		borderRadius: 12,
		backgroundColor: AppColors.primary,
		paddingVertical: 18,
		alignItems: 'center',
		...Shadows.md,
	},
	buttonText: {
		color: AppColors.textOnPrimary,
		fontSize: 16,
		fontWeight: '700',
		letterSpacing: 0.5,
		includeFontPadding: false,
		textAlignVertical: 'center',
	}
});
