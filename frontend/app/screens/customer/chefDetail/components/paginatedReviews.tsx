import { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, Text, View, ViewToken } from 'react-native';
import { IReview } from '../../../../types/index';
import ChefReviewItem from './chefReviewItem';
import { styles } from '../styles';

const REVIEWS_PER_PAGE = 3;

type Props = {
  reviews: Array<IReview>;
};

const PaginatedReviews = ({ reviews }: Props) => {
  const [currentPage, setCurrentPage] = useState(0);
  const pageWidth = Dimensions.get('window').width - 40;

  const pages: Array<Array<IReview>> = [];
  for (let i = 0; i < reviews.length; i += REVIEWS_PER_PAGE) {
    pages.push(reviews.slice(i, i + REVIEWS_PER_PAGE));
  }

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentPage(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderPage = useCallback(
    ({ item }: { item: Array<IReview> }) => (
      <View style={{ width: pageWidth, gap: 10 }}>
        {item.map((review, index) => (
          <ChefReviewItem item={review} key={`review_${review.id ?? index}`} />
        ))}
      </View>
    ),
    [pageWidth],
  );

  const keyExtractor = useCallback((_: Array<IReview>, index: number) => `page_${index}`, []);

  return (
    <View testID="chefDetail.reviewsSection" style={styles.chefReviewContainer}>
      <Text style={styles.chefCardReviewHeading}>Reviews</Text>
      <FlatList
        data={pages}
        renderItem={renderPage}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
        snapToInterval={pageWidth}
        decelerationRate="fast"
      />
      {pages.length > 1 && (
        <View style={styles.paginationDots}>
          {pages.map((_, index) => (
            <View
              key={`dot_${index}`}
              style={[
                styles.dot,
                index === currentPage && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default PaginatedReviews;
