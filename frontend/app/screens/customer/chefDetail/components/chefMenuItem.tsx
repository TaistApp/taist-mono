import { Text, TouchableOpacity, View } from 'react-native';
import { IMenu } from '../../../../types/index';
import { styles } from '../styles';

type Props = {
  testID?: string;
  item: IMenu;
  onPress: () => void;
};
const ChefMenuItem = (props: Props) => {
  return (
    <TouchableOpacity testID={props.testID} onPress={props.onPress} style={styles.chefCardMenuItem}>
      <View style={styles.chefCardMenuItemHeading}>
        <Text style={styles.chefCardMenuItemTitle}>{props.item.title}</Text>
        <Text style={styles.chefCardMenuItemPrice}>{`${
          props.item.serving_size ?? 0
        } Person${(props.item.serving_size ?? 0) > 1 ? 's' : ''} `}</Text>
      </View>
      <Text style={styles.chefCardMenuItemDescription}>
        {props.item.description}
      </Text>
      <Text style={styles.chefCardMenuItemPrice}>{`$${
        props.item.price ?? 0
      } `}</Text>
    </TouchableOpacity>
  );
};

export default ChefMenuItem;
