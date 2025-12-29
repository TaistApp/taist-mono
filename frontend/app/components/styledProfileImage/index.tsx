import { Image } from 'expo-image';
import { useCallback, useMemo, useState } from 'react';
import { View, ViewStyle } from 'react-native';
import styles from './styles';

type Props = {
  url?: string;
  containerStyle?: ViewStyle;
  size?: number;
  priority?: 'low' | 'normal' | 'high';
};

const StyledProfileImage = ({
  url,
  containerStyle,
  size,
  priority = 'normal',
}: Props) => {
  const [isLoaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Memoize style to prevent recreating on every render
  const imageStyle = useMemo(() => {
    if (!size) return styles.img;
    return {
      ...styles.img,
      width: size,
      height: size,
      borderRadius: size,
    };
  }, [size]);

  const handleLoadStart = useCallback(() => {
    setLoaded(false);
    setHasError(false);
  }, []);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  // Show placeholder if: no URL, still loading, or error loading
  const showPlaceholder = !url || !isLoaded || hasError;

  return (
    <View style={[styles.container, containerStyle]}>
      {url && !hasError && (
        <Image
          style={imageStyle}
          source={{ uri: url }}
          onLoadStart={handleLoadStart}
          onLoad={handleLoad}
          onError={handleError}
          cachePolicy="memory-disk"
          priority={priority}
          contentFit="cover"
          transition={200}
        />
      )}
      {showPlaceholder && (
        <View style={[styles.overlay, size ? { width: size, height: size, borderRadius: size } : undefined]}>
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
