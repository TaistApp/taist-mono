import { TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons';

// NPM
// import CalendarStrip from 'react-native-calendar-strip';

// Types & Services
import { IMenu, IReview, IUser } from '../../../types/index';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import StyledTabButton from '@/app/components/styledTabButton';
import moment from 'moment';
import EmptyListView from '../../../components/emptyListView/emptyListView';
import { AppColors, Spacing } from '../../../../constants/theme';
import Container from '../../../layout/Container';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { GetSearchChefAPI, GetZipCodes } from '../../../services/api';
import { Delay } from '../../../utils/functions';
import { navigate } from '../../../utils/navigation';
import ChefCard from './components/chefCard';
import CustomCalendar from './components/customCalendar';
import { styles } from './styles';

const Home = () => {
  const self = useAppSelector(x => x.user.user);
  const categories = useAppSelector(x => x.table.categories);
  const zipcodes = useAppSelector(x => x.table.zipcodes);
  const notificationOrderId = useAppSelector(
    x => x.device.notification_order_id,
  );
  const dispatch = useAppDispatch();

  const [searchTerm, onChangeSearchTerm] = useState('');
  const [DAY, onChangeDAY] = useState(moment());
  const [timeSlotId, onChangeTimeSlotId] = useState(0);
  const [categoryId, onChangeCategoryId] = useState(0);
  const [chefs, setChefs] = useState<Array<any>>([]);
  // const refCalendar = useRef<CalendarStrip>(null);
  const notification_id = useAppSelector(x => x.device.notification_id);

  const isInArea = zipcodes.includes(self.zip ?? '');
  const startDate = moment();
  const endDate = moment().add(1, 'months');
  if (startDate.weekday() < endDate.weekday()) {
    endDate.add(startDate.weekday() - endDate.weekday(), 'days');
  } else {
    endDate.add(startDate.weekday() - endDate.weekday() - 7, 'days');
  }
  const timeSlots = useMemo(
    () => [
      {
        id: 0,
        label: 'Any Time ',
        start: 0,
        end: 24,
      },
      {
        id: 1,
        label: 'Breakfast ',
        start: 5,
        end: 11,
      },
      {
        id: 2,
        label: 'Lunch ',
        start: 11,
        end: 16,
      },
      {
        id: 3,
        label: 'Dinner ',
        start: 16,
        end: 22,
      },
      {
        id: 4,
        label: 'Late ',
        start: 22,
        end: 5,
      },
    ],
    [],
  );

  const [refreshing, setRefreshing] = useState(false);

  // Focus effect to reload data when screen comes into focus or notification_id changes
  useFocusEffect(
    useCallback(() => {
      // TMA-014: Silently refresh zip codes when home screen focuses
      // This ensures users see new service areas without restarting the app
      GetZipCodes({}, dispatch).catch(err =>
        console.log('Failed to refresh zip codes on focus:', err)
      );
      loadData();
    }, [notification_id]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // TMA-014: Refresh zip codes when user pulls to refresh
    await GetZipCodes({}, dispatch).catch(err =>
      console.log('Failed to refresh zip codes on pull-to-refresh:', err)
    );
    await loadDatax();
    setRefreshing(false);
  };

  const loadDatax = async () => {
    const week_day = DAY.weekday();
    const category_id = categoryId;
    const time_slot = timeSlotId;
    const timezone_gap = moment().utcOffset() / 60;

    console.log('🔄 REFRESH: Loading chefs...');
    // No loading indicator for refresh
    const searchChefs = await GetSearchChefAPI(
      { week_day, category_id, time_slot, timezone_gap, user_id: self?.id || -1 },
      dispatch,
    );

    if (searchChefs.success == 1) {
      console.log('✅ REFRESH SUCCESS:', searchChefs?.data?.length || 0, 'chefs');
      setChefs(searchChefs.data);
    } else {
      console.log('❌ REFRESH FAILED:', searchChefs);
      setChefs([]);
    }
  };



  const loadData = async () => {
    const week_day = DAY.weekday();
    const category_id = categoryId;
    const time_slot = timeSlotId;
    const timezone_gap = moment().utcOffset() / 60;

    dispatch(showLoading());
    const searchChefs = await GetSearchChefAPI(
      { week_day, category_id, time_slot, timezone_gap, user_id: self?.id || -1 },
      dispatch,
    );

    dispatch(hideLoading());
    if (searchChefs.success == 1) {
      console.log('🔍 SEARCH CHEFS API SUCCESS');
      console.log('📊 Total chefs returned:', searchChefs?.data?.length || 0);
      console.log('👨‍🍳 Chefs data:', JSON.stringify(searchChefs?.data, null, 2));
      setChefs(searchChefs.data);
    } else {
      console.log('❌ SEARCH CHEFS API FAILED:', searchChefs);
      setChefs([]);
    }
  };

  // Load data when category, time slot, or day changes
  const loadDataCallback = useCallback(() => {
    console.log('Loading data...');
    loadData();
  }, [categoryId, timeSlotId, DAY]);

  // Initial load with delay
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadDataCallback();
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, []); // Only run once on mount

  // Load data when dependencies change
  useEffect(() => {
    loadData();
  }, [categoryId, timeSlotId, DAY]);

  const handleDayPress = async (day: moment.Moment) => {
    onChangeDAY(day);
    await Delay(10);
    loadData();
  };

  const handleTimeSlotChange = (id: number) => {
    if (id == timeSlotId) onChangeTimeSlotId(0);
    else onChangeTimeSlotId(id);
  };

  const handleCategoryChange = (id: number) => {
    if (id == categoryId) onChangeCategoryId(0);
    else onChangeCategoryId(id);
  };

  const handleChefDetail = (id: any) => {
    const week_day = DAY.weekday();

    var chef = chefs.find(x => x.id == id);
    navigate.toCustomer.chefDetail({
      chefInfo: chef,
      reviews: chef.reviews,
      menus: chef.menus,
      weekDay: week_day,
    });
  };

  const handleAddToOrder = (
    item: IMenu,
    chefInfo: IUser,
    reviews: Array<IReview>,
    menus: Array<IMenu>,
  ) => {
    navigate.toCustomer.addToOrder({
      orderMenu: item,
      chefInfo,
      reviews,
      menus,
    });
  };

  const filteredChefs = useMemo(() => {
    console.log('🔄 FILTERING CHEFS');
    console.log('📋 Total chefs before filter:', chefs.length);
    
    var filtered = chefs.filter(x => x.menus.length > 0);
    console.log('📋 Chefs with menus:', filtered.length);

    if (searchTerm != '') {
      console.log('🔍 Searching for:', searchTerm);
      filtered = filtered.filter(
        (x: IUser) =>
          x.first_name?.includes(searchTerm) || x.last_name?.includes(searchTerm),
      );
      console.log('📋 Chefs after search:', filtered.length);
    }

    console.log('✅ FINAL FILTERED CHEFS COUNT:', filtered.length);
    return filtered;
  }, [chefs, searchTerm]);

  return (
    <SafeAreaView style={styles.main}>
      <Container>
        <ScrollView
        contentContainerStyle={styles.pageView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
          {!isInArea && (
            <View style={{ width: '100%', alignItems: 'center' }}>
              <Text style={styles.missingHeading}>
                We're sorry. {'\n'}Taist has not arrived in your area yet.
              </Text>
              <Image
                style={styles.missingImg}
                source={require('../../../assets/images/missing.png')}
              />
              <Text style={styles.missingSubheading}>
                We'll let you know when we're knocking on your door next
                (hopefully soon)!
              </Text>
            </View>
          )}
          {isInArea && (
            <View style={{ width: '100%', gap: Spacing.sm }}>
              {/* Current Location Display - TMA-013 */}
              <Pressable 
                style={styles.locationDisplay}
                onPress={() => navigate.toCustomer.account({ scrollToAddress: true })}
              >
                <FontAwesomeIcon icon={faLocationDot} size={16} color={AppColors.primary} />
                <Text style={styles.locationText}>
                  {self.city ? `${self.city}, ${self.state || self.zip}` : `ZIP ${self.zip}`}
                </Text>
              </Pressable>
              
              {/* Hidden per TMA-000 */}
              {/* <TextInput
                placeholder="Search chefs..."
                placeholderTextColor={'#999999'}
                mode="outlined"
                onChangeText={onChangeSearchTerm}
                value={searchTerm}
                style={styles.searchInput}
              /> */}
              
              <Text style={styles.sectionLabel}>Select Date</Text>
              <CustomCalendar
                selectedDate={DAY}
                onDateSelect={handleDayPress}
                minDate={startDate}
                maxDate={endDate}
              />
              
              <Text style={styles.sectionLabel}>Time Preference</Text>
              <View style={styles.wrapContainer}>
                {timeSlots.map((item, index) => {
                  return (
                    <StyledTabButton
                      title={item.label}
                      disabled={timeSlotId != item.id}
                      onPress={() => handleTimeSlotChange(item.id)}
                      key={`time_${index}`}
                    />
                  );
                })}
              </View>
              
              <Text style={styles.sectionLabel}>Cuisine Type</Text>
              <View style={styles.wrapContainer}>
                <StyledTabButton
                  title={'All'}
                  disabled={0 != categoryId}
                  onPress={() => handleCategoryChange(0)}
                  key={`category_all`}
                />
                {categories.map((item, index) => {
                  return (
                    <StyledTabButton
                      title={item.name}
                      disabled={item.id != categoryId}
                      onPress={() => handleCategoryChange(item.id ?? 0)}
                      key={`category_${index}`}
                    />
                  );
                })}
              </View>
              <View style={styles.chefCardContainer}>
                {filteredChefs.map((item, index) => {
                  return (
                    <ChefCard
                      chefInfo={item}
                      reviews={item.reviews}
                      menus={item.menus}
                      gotoChefDetail={handleChefDetail}
                      gotoOrder={() => handleChefDetail(item.id)}
                      key={`cc_${index}`}
                    />
                  );
                })}
                {filteredChefs.length == 0 && (
                  <>
                    <EmptyListView text="No Chefs" />
                    {console.log('📭 EMPTY STATE: No chefs to display')}
                  </>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
};

export default Home;
