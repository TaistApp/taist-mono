import { Image } from 'expo-image';
import { useState } from 'react';
import { View, ViewStyle } from 'react-native';
import styles from './styles';

type Props = {
  url?: string;
  containerStyle?: ViewStyle;
  size?: number;
};

const StyledProfileImage = (props: Props) => {
  //https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80
  const [isLoaded, setLoaded] = useState(false);
  var style = {...styles.img};
  if (props.size) {
    style = {
      ...style,
      width: props.size,
      height: props.size,
      borderRadius: props.size,
    };
  }

  const handleLoadStart = () => {
    setLoaded(false);
  };

  const handleLoad = () => {
    setLoaded(true);
  };

  const handleLoadEnd = () => {};

  return (
    <View style={[styles.container, props.containerStyle]}>
      <Image
        style={style}
        source={{uri: props.url}}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onLoadEnd={handleLoadEnd}
      />
      {!isLoaded && (
        <View style={styles.overlay}>
          <Image
            source={require('../../assets/icons/Icon_Profile.png')}
            style={styles.imgPlaceholder}
            resizeMode={'contain'}
          />
        </View>
      )}
    </View>
  );
};

export default StyledProfileImage;
