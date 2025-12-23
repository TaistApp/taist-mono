import { Dimensions, StyleSheet } from "react-native";
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';


const screenHeight = Dimensions.get('window').height;
export const styles = StyleSheet.create({
	main: {
		flex: 1,
		justifyContent: 'space-around',
		alignItems: 'center',
		backgroundColor: AppColors.background,
	},
    container: {
		flex:1,
		padding:10,
	},
	bottomContainer: {
        width: '100%',
        flexDirection:'row',
        alignItems:'center',
        justifyContent:'space-between',
		marginBottom:20,
		borderRadius:5,
		borderWidth:1.5,
        borderColor:AppColors.border,
    },
    textInput:{
        flex:1,
        fontSize: 16,
        fontWeight: '500',
        color: AppColors.text,
        paddingTop:10,
        padding:10,
        letterSpacing: 0.5,
    },
	btnFly:{
		padding:10
	},
	msgContainer:{
		flex:1,
		justifyContent:'flex-end',
		minHeight:screenHeight,
		gap:10,
		paddingBottom:10,
	},
	myBubbleContainer:{
		width:'100%',
		alignItems:'flex-end',
	},
	bubbleContainer:{
		width:'100%',
		alignItems:'flex-start',
	},
	myBubble:{
		backgroundColor:AppColors.surface,
		padding:10,
		maxWidth:'90%',
		borderRadius:15,
		borderBottomRightRadius:0,
		alignSelf:'flex-end',
	},
	bubble:{
		backgroundColor:AppColors.primary,
		padding:10,
		maxWidth:'90%',
		borderRadius:15,
		borderBottomLeftRadius:0,
		alignSelf:'flex-start'
	},
	bubbleText:{
		fontSize:14,
		fontWeight:'500',
		color: AppColors.text,
		letterSpacing: 0.5,
		includeFontPadding: false,
		textAlignVertical: 'center',
	},
	otherBubbleText:{
		fontSize:14,
		fontWeight:'500',
		color: AppColors.textOnPrimary,
		letterSpacing: 0.5,
		includeFontPadding: false,
		textAlignVertical: 'center',
	},
	bubbleTimeText:{
		fontSize:12,
		color: AppColors.text,
		letterSpacing: 0.5,
	}
});