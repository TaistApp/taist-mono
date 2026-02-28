import {TouchableOpacity, View, Text, ViewStyle} from 'react-native';

import {Icon, IconButton} from '@react-native-material/core';
import {faAngleLeft, faCheck} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
 import {useNavigation} from '@react-navigation/native';
import styles from './styles';

type Props = {
  label: string;
  value: boolean;
  containerStyle?: ViewStyle;
  onPress: () => void;
  testID?: string;
};

const StyledCheckBox = ({label, value, containerStyle, onPress, testID}: Props) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity testID={testID} onPress={onPress} style={[styles.box, value && styles.boxChecked]}>
        {value && <FontAwesomeIcon icon={faCheck} size={15} color="#ffffff" />}
      </TouchableOpacity>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

export default StyledCheckBox;
