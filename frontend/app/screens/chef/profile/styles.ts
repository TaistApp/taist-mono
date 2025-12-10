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
		padding: 10,
		gap: 30,
		width: '100%'
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
	title:{
		color: AppColors.text,
		fontSize:18,
		fontWeight:'600'
	},
	text:{
		color: AppColors.text,
		fontSize:16,
		fontWeight:'500'
	},
	row:{
		flexDirection:'row',
		width:'100%',
		gap:5
	},
	col_days:{
		alignItems:'flex-start',
		justifyContent:'center',
		height:30,
		flex:1,
		paddingRight: 4,
	},
	col_start:{
		alignItems:'center',
		justifyContent:'center',
		height:30,
		flex:1
	},
	col_end:{
		alignItems:'center',
		justifyContent:'center',
		height:30,
		flex:1
	},
	timeBox:{
		width:'100%',
		height:'100%',
		borderWidth:1,
		borderRadius:5,
		borderColor:AppColors.border,
		justifyContent:'center',
		alignItems:'center',
	},
	// Time picker modal styling
	timePickerModalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'flex-end',
	},
	timePickerModalContent: {
		backgroundColor: 'white',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: 34, // Safe area for home indicator
		overflow: 'hidden',
	},
	timePickerModalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: '#E5E5E5',
	},
	timePickerModalCancel: {
		fontSize: 16,
		color: AppColors.textSecondary,
		fontWeight: '600',
	},
	timePickerModalTitle: {
		fontSize: 17,
		fontWeight: '600',
		color: AppColors.text,
	},
	timePickerModalDone: {
		fontSize: 16,
		color: AppColors.primary,
		fontWeight: '600',
	},
	timePickerPicker: {
		width: '100%',
		height: 216, // iOS standard picker height
		backgroundColor: 'white',
	},
});