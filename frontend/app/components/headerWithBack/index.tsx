import {TouchableOpacity, View} from 'react-native';

import {Icon, IconButton} from '@react-native-material/core';
import {faAngleLeft} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
 import {useNavigation} from '@react-navigation/native';
import styles from './styles';

const HeaderWithBack = (props: any) => {
  const navigation = useNavigation();
  const onPressBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.topHeader}>
      <TouchableOpacity testID="header.backButton" onPress={onPressBack} style={styles.drawerClose}>
        <FontAwesomeIcon icon={faAngleLeft} size={20} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

export default HeaderWithBack;
