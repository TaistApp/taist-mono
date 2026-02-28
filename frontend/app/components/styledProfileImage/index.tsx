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
  const [isLoaded, setLoaded] = useState(false);
  const hasUrl = !!props.url && props.url.length > 0;
  var imgStyle = {...styles.img};
  if (props.size) {
    imgStyle = {
      ...imgStyle,
      width: props.size,
      height: props.size,
      borderRadius: props.size,
    };
  }

  return (
    <View style={[styles.container, imgStyle, props.containerStyle]}>
      {hasUrl && (
        <Image
          style={imgStyle}
          source={{uri: props.url}}
          onLoadStart={() => setLoaded(false)}
          onLoad={() => setLoaded(true)}
          cachePolicy="memory-disk"
          contentFit="cover"
          transition={200}
        />
      )}
      {(!hasUrl || !isLoaded) && (
        <View style={styles.overlay}>
          <Image
            source={require('../../assets/icons/Icon_Profile.png')}
            style={styles.imgPlaceholder}
            contentFit="contain"
          />
        </View>
      )}
    </View>
  );
};

export default StyledProfileImage;
