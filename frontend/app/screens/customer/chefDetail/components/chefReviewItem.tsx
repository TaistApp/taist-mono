import { Text, View } from 'react-native';
import { StarRatingDisplay } from 'react-native-star-rating-widget';
import { IReview } from '../../../../types/index';
import { getFormattedDate } from '../../../../utils/validations';
import { styles } from '../styles';

type Props = {
  item: IReview;
};

const ChefReviewItem = (props: Props) => {
  return (
    <View style={styles.chefCard}>
      {props.item.reviewer_name ? (
        <Text style={styles.chefCardReviewerName}>
          {props.item.reviewer_name}
        </Text>
      ) : null}
      <Text style={styles.chefCardInsured}>{props.item.review}</Text>
      <View style={styles.chefCardInnerReview}>
        <StarRatingDisplay
          rating={props.item.rating ?? 0}
          starSize={20}
          starStyle={{marginHorizontal: 0}}
        />
        <Text style={styles.chefCardInnerReviewDate}>
          {getFormattedDate((props.item.updated_at ?? 0) * 1000)}
        </Text>
      </View>
    </View>
  );
};

export default ChefReviewItem;
