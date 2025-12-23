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
		alignItems: 'center',
		width:'100%',
	},
	pageEmptyView:{
		padding: 10,
		alignItems: 'center',
		justifyContent:'center',
		gap:30,
		width:'100%',
		height:'100%',
	},
	title:{
		fontSize:20,
		fontWeight:'600',
		textAlign:'center',
		color: AppColors.text
	},
	text:{
		fontSize:16,
		textAlign:'center',
		color: AppColors.text
	},
	notificationText:{
		fontSize:14,
		textAlign:'center',
		color: AppColors.textSecondary,
		fontStyle: 'italic',
	},
	emptyImg:{
		width:'80%',
		height:'30%',
		resizeMode:'contain',
	},
	tabContainer:{
		width:'100%',
		flexDirection:'row',
		flexWrap:'wrap',
		justifyContent:'space-around',
		gap:5,
		marginTop:20,
	},
	tab:{
		backgroundColor:AppColors.surface,
		borderRadius:20,
		paddingVertical:6,
		paddingHorizontal:8
	},
	tab_disabled:{
		backgroundColor:AppColors.disabled,
		borderRadius:20,
		paddingVertical:6,
		paddingHorizontal:8
	},
	tabText:{
		fontSize:10,
		color: AppColors.primary,
		includeFontPadding: false,
		textAlignVertical: 'center',
	},
	tabText_disabled:{
		fontSize:10,
		color: AppColors.text,
		includeFontPadding: false,
		textAlignVertical: 'center',
	},
	orderCardContainer: {
		marginTop: 20,
		width: '100%',
	},
	orderCard: {
		width:'100%',
		backgroundColor: AppColors.surface,
		borderRadius: 10,
		padding: 10,
		marginBottom: 10
	},
	orderCardMain: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 25,
	},
	orderCardImg: {
		width: 90,
		height: 80,
	},
	orderCardInfo: {
		rowGap:5,
	},
	orderCardTitle: {
		color: AppColors.text,
		fontWeight: '700',
		fontSize: 16
	},
	orderCardDescription: {
		color: AppColors.text,
		fontSize: 14
	},
});