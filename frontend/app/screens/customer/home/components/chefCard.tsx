import { faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useCallback, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { StarRatingDisplay } from 'react-native-star-rating-widget';
import StyledProfileImage from '../../../../components/styledProfileImage';
import { IMenu, IReview, IUser } from '../../../../types/index';
import { getImageURL } from '../../../../utils/functions';
import { styles } from '../styles';
import ChefMenuItem from './chefMenuItem';

type Props = {
  chefInfo: IUser;
  reviews: Array<IReview>;
  menus: Array<IMenu>;
  onNavigate: (chefId: number) => void;
};

// Constant style object to prevent new reference on each render
const STAR_STYLE = { marginHorizontal: 0 };

const ChefCard = ({
  chefInfo,
  reviews,
  menus,
  onNavigate,
}: Props) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Memoized average rating - only recalculates when reviews change
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0);
    return total / reviews.length;
  }, [reviews]);

  // Stable callback for navigating to chef detail
  const handleChefPress = useCallback(() => {
    onNavigate(chefInfo.id ?? 0);
  }, [onNavigate, chefInfo.id]);

  // Stable callback for menu toggle
  const handleToggleMenu = useCallback(() => {
    setMenuOpen(prev => !prev);
  }, []);

  return (
    <View style={styles.chefCard}>
      <TouchableOpacity
        style={styles.chefCardMain}
        onPress={handleChefPress}>
        <StyledProfileImage url={getImageURL(chefInfo.photo)} size={80} />
        <View style={styles.chefCardInfo}>
          <View style={{flex: 1}}>
            <Text style={styles.chefCardTitle}>{`${
              chefInfo.first_name
            } ${chefInfo.last_name?.substring(0, 1)}. `}</Text>
            <Text style={styles.chefCardDescription} numberOfLines={2}>
              {chefInfo.bio ?? ''}
            </Text>
          </View>

          {reviews.length > 0 && (
            <View style={styles.chefCardReview}>
              <StarRatingDisplay
                rating={averageRating}
                starSize={20}
                starStyle={STAR_STYLE}
              />
              <Text style={{ fontSize: 14, letterSpacing: 0.5 }}>{`(${reviews.length}) `}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={handleToggleMenu}
          style={{
            padding: 20,
            paddingHorizontal: 10,
          }}>
          {!menuOpen && (
            <FontAwesomeIcon icon={faAngleDown} size={20} color="#000000" />
          )}
          {menuOpen && (
            <FontAwesomeIcon icon={faAngleUp} size={20} color="#000000" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
      {menuOpen && (
        <View style={styles.chefCardMenu}>
          {menus.map((item) => {
            return (
              <ChefMenuItem
                item={item}
                chefInfo={chefInfo}
                reviews={reviews}
                menus={menus}
                onNavigate={onNavigate}
                key={`menu_${item.id}`}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

export default ChefCard;
