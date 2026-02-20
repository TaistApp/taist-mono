import {TouchableOpacity, View, Text} from 'react-native';

import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import styles from './styles';
 
type Props = {
  label: string;
  labelLines?: number;
  value: boolean;
  onPress: () => void;
  testID?: string;
};

const StyledSwitch = ({label, labelLines = 1, value, onPress, testID}: Props) => {
  return (
    <View style={styles.container}>
      <View style={{flex: 1}}>
        <Text style={styles.label} numberOfLines={labelLines}>
          {label}
        </Text>
      </View>
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        style={value ? styles.bg : styles.bg_disabled}>
        <View style={value ? styles.thumb : styles.thumb_disabled} />
      </TouchableOpacity>
    </View>
  );
};

export default StyledSwitch;
