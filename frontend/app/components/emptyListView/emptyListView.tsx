import {Image, ImageSourcePropType, Text, View} from 'react-native';
import styles from './styles';

type Props = {
  text?: string;
  img?: ImageSourcePropType;
  title?: string;
  subTitle?: string;
};

const EmptyListView = (props: Props) => {
  return (
    <View style={styles.container}>
      {props.img && (
        <Image source={props.img} style={styles.image} resizeMode="contain" />
      )}
      {props.title && <Text style={styles.title}>{props.title}</Text>}
      {props.subTitle && <Text style={styles.subTitle}>{props.subTitle}</Text>}
      {props.text && <Text style={styles.txt}>{props.text}</Text>}
    </View>
  );
};

export default EmptyListView;
