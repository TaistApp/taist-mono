import { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// NPM
import {
  faAngleLeft
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StarRatingDisplay } from 'react-native-star-rating-widget';

// Types & Services
import {
  IChefProfile,
  IMenu,
  IReview,
  IUser,
} from '../../../types/index';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import StyledProfileImage from '../../../components/styledProfileImage';
import StyledTabButton from '../../../components/styledTabButton';
import Container from '../../../layout/Container';
import { removeCustomerOrders } from '../../../reducers/customerSlice';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { GetChefProfileAPI } from '../../../services/api';
import GlobalStyles from '../../../types/styles';
import {
  ConvertStringToNumberArr,
  getImageURL
} from '../../../utils/functions';
import { navigate } from '../../../utils/navigation';
import { ShowErrorToast } from '../../../utils/toast';
import AvailabilitySection from './components/availabilitySection';
import ChefMenuItem from './components/chefMenuItem';
import ChefReviewItem from './components/chefReviewItem';
import { styles } from './styles';

const ChefDetail = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const allergen = useAppSelector(x => x.table.allergens);
  const orders = useAppSelector(x => x.customer.orders);
  const dispatch = useAppDispatch();

  const [allergyIds, onChangeAllergyIds] = useState<Array<number>>([]);
  const [chefProfile, onChangeChefProfile] = useState<IChefProfile>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availabilityDate, setAvailabilityDate] = useState<string>('');

  const chefInfo: IUser = JSON.parse(params.chefInfo as string);
  const reviews: Array<IReview> = JSON.parse(params.reviews as string);
  const menus: Array<IMenu> = JSON.parse(params.menus as string);
  const weekDay: number = parseInt(params.weekDay as string);
  const selectedDate: string = (params.selectedDate as string) || '';
  // const timeSlot: {start: number; end: number} = route.params?.timeSlot;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    dispatch(showLoading());
    const _profile = await GetChefProfileAPI({user_id: chefInfo.id ?? 0});
    dispatch(hideLoading());
    if (_profile.success == 1) {
      onChangeChefProfile(_profile.data);
    }
  };

  var totalRatings = 0;
  reviews.map((item, index) => {
    totalRatings += item.rating ?? 0;
  });

  const chefOrders = orders.filter(x => x.chef_user_id == chefInfo.id);
  var price_checkout = 0;
  chefOrders.map((o, idx) => {
    price_checkout += o.total_price ?? 0;
  });

  const handleAllergyPress = (id: number) => {
    var tempIds = [...allergyIds];
    var index = tempIds.findIndex(x => x === id);
    if (index >= 0) {
      tempIds.splice(index, 1);
    } else {
      tempIds.push(id);
    }
    onChangeAllergyIds(tempIds);
  };

  const handleGoAddToOrder = (item: IMenu) => {
    if (orders.length > 0) {
      const sameMenu = orders.find(x => x.menu_id == item.id);
      if (sameMenu == undefined) {
        ShowErrorToast(
          'You can only order one menu item. Please clear your cart. ',
        );
        return;
      }
    }
    navigate.toCustomer.addToOrder({
      orderMenu: item,
      chefInfo,
      reviews,
      menus,
    });
  };

  const handleTimeSelect = (time: string | null, date: string) => {
    setSelectedTime(time);
    setAvailabilityDate(date);
  };

  const handleCheckout = () => {
    const dateToPass = availabilityDate || selectedDate;
    router.push({
      pathname: '/screens/customer/(tabs)/(home)/checkout',
      params: {
        chefInfo: JSON.stringify(chefInfo),
        orders: JSON.stringify(chefOrders),
        weekDay: weekDay.toString(),
        chefProfile: JSON.stringify(chefProfile),
        selectedDate: dateToPass,
        selectedTime: selectedTime || '',
      }
    });
  };

  const handleClearCart = () => {
    dispatch(removeCustomerOrders(chefInfo.id ?? 0));
  };

  const filteredMenus = menus.filter(x => {
    var isInclude = false;
    const ids = ConvertStringToNumberArr(x.allergens ?? '');
    allergyIds.map((id, idx) => {
      if (ids.includes(id)) isInclude = true;
    });
    return !isInclude;
  });

  return (
    <SafeAreaView style={styles.main}>
      <Container>
        <ScrollView contentContainerStyle={styles.pageView}>
          <View style={styles.heading}>
            <Pressable onPress={() => router.back()}>
              <FontAwesomeIcon icon={faAngleLeft} size={20} color="#ffffff" />
            </Pressable>
          </View>
          <StyledProfileImage url={getImageURL(chefInfo.photo)} size={160} />
          <Text style={styles.chefName}>{`${
            chefInfo.first_name
          } ${chefInfo.last_name?.substring(0, 1)}. `}</Text>
          <View style={styles.chefCardReview}>
            <StarRatingDisplay
              rating={totalRatings / reviews.length}
              starSize={20}
              starStyle={{marginHorizontal: 0}}
            />
            <Text>{`(${reviews.length}) `}</Text>
          </View>
          {chefInfo.bio && (
            <View style={styles.chefCard}>
              <Text style={styles.chefCardDescription}>
                {`${chefInfo.bio + ' '} `}
              </Text>
            </View>
          )}
          <View style={[styles.chefCard, {alignItems: 'center'}]}>
            <Text style={styles.chefCardInsured}>
              {`All Chefs are fully insured. `}
            </Text>
          </View>

          {reviews.length > 0 && (
            <View style={styles.chefReviewContainer}>
              <Text style={styles.chefCardReviewHeading}>Reviews</Text>
              {reviews.map((item, index) => {
                return (
                  <ChefReviewItem item={item} key={`reviewItem_${index}`} />
                );
              })}
            </View>
          )}

          {chefProfile && (
            <AvailabilitySection
              chefId={chefInfo.id ?? 0}
              initialDate={selectedDate}
              chefProfile={chefProfile}
              selectedTime={selectedTime}
              onTimeSelect={handleTimeSelect}
            />
          )}

          {allergen.length > 0 && (
            <>
              <Text style={styles.chefCardAllergenHeading}>
                Exclude items with the following:
              </Text>
              <View style={styles.allegenContainer}>
                {allergen.map((item, index) => {
                  const isSelected = allergyIds.includes(item.id ?? 0);
                  return (
                    <StyledTabButton
                      title={item.name}
                      disabled={!isSelected}
                      onPress={() => handleAllergyPress(item.id ?? 0)}
                      key={`allergy_${index}`}
                    />
                  );
                })}
              </View>
            </>
          )}

          {filteredMenus.length > 0 && (
            <View style={styles.chefCard}>
              {filteredMenus.map((item, index) => {
                return (
                  <ChefMenuItem
                    item={item}
                    onPress={() => handleGoAddToOrder(item)}
                    key={`menuItem_${index}`}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>
        {price_checkout > 0 && (
          <View style={{width: '100%', padding: 10, gap: 10}}>
            <TouchableOpacity style={GlobalStyles.btn} onPress={handleCheckout}>
              <Text
                style={
                  GlobalStyles.btnTxt
                }>{`CHECKOUT - $${price_checkout.toFixed(2)} `}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={GlobalStyles.btn}
              onPress={handleClearCart}>
              <Text style={GlobalStyles.btnTxt}>{`CLEAR CART `}</Text>
            </TouchableOpacity>
          </View>
        )}
      </Container>
    </SafeAreaView>
  );
};

export default ChefDetail;
