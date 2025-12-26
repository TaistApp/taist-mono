import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  InteractionManager,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons';


// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import StyledTabButton from '@/app/components/styledTabButton';
import moment from 'moment';
import EmptyListView from '../../../components/emptyListView/emptyListView';
import { AppColors, Spacing } from '../../../../constants/theme';
import Container from '../../../layout/Container';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { GetSearchChefAPI, GetZipCodes } from '../../../services/api';
import { navigate } from '../../../utils/navigation';
import ChefCard from './components/chefCard';
import CustomCalendar from './components/customCalendar';
import { styles } from './styles';

const Home = () => {
  const self = useAppSelector(x => x.user.user);
  const categories = useAppSelector(x => x.table.categories);
  const zipcodes = useAppSelector(x => x.table.zipcodes);
  const dispatch = useAppDispatch();

  const [DAY, onChangeDAY] = useState(moment());
  const [timeSlotId, onChangeTimeSlotId] = useState(0);
  const [categoryId, onChangeCategoryId] = useState(0);
  // Chef data from API includes menus/reviews attached, so using any
  const [chefs, setChefs] = useState<Array<any>>([]);
  // Track when data is loaded to coordinate spinner hiding with UI rendering
  const [isDataLoaded, setIsDataLoaded] = useState(false);

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

  // Track the current request to prevent race conditions
  const requestIdRef = useRef(0);
  // Track if initial load has happened
  const hasLoadedRef = useRef(false);

  // Single source of truth for loading chefs data
  const loadData = useCallback(async (showSpinner = true) => {
    const currentRequestId = ++requestIdRef.current;

    const week_day = DAY.weekday();
    const selected_date = DAY.format('YYYY-MM-DD');
    const category_id = categoryId;
    const time_slot = timeSlotId;
    const timezone_gap = moment().utcOffset() / 60;

    if (showSpinner) {
      setIsDataLoaded(false);
      dispatch(showLoading());
    }

    try {
      const searchChefs = await GetSearchChefAPI(
        { week_day, selected_date, category_id, time_slot, timezone_gap, user_id: self?.id || -1 },
        dispatch,
      );

      // Only update state if this is still the most recent request
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (searchChefs.success == 1) {
        setChefs(searchChefs.data);
      } else {
        setChefs([]);
      }
      // Mark data as loaded - useEffect will handle hiding spinner after render
      if (showSpinner) {
        setIsDataLoaded(true);
      }
    } catch (error) {
      console.error('Chef search failed:', error);
      setChefs([]);
      // Also mark as loaded on error so spinner hides
      if (showSpinner) {
        setIsDataLoaded(true);
      }
    }
    // Note: hideLoading is now handled by useEffect that waits for render to complete
  }, [DAY, categoryId, timeSlotId, self?.id, dispatch]);

  // Focus effect - refresh zip codes and load data when screen focuses
  useFocusEffect(
    useCallback(() => {
      // TMA-014: Silently refresh zip codes when home screen focuses
      GetZipCodes({}, dispatch).catch(() => {});

      // Load data on focus (this handles both initial load and returning to screen)
      loadData();
      hasLoadedRef.current = true;
    }, [loadData]),
  );

  // Load data when filters change (but not on initial mount - useFocusEffect handles that)
  useEffect(() => {
    if (hasLoadedRef.current) {
      loadData();
    }
  }, [categoryId, timeSlotId, DAY, loadData]);

  // Hide spinner AFTER React has rendered the new content
  // This prevents the "blank screen" between spinner hide and content appearing
  useEffect(() => {
    if (isDataLoaded) {
      // Wait for animations/interactions to complete, then wait for frame flush
      const task = InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          dispatch(hideLoading());
        });
      });
      return () => task.cancel();
    }
  }, [isDataLoaded, dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    // TMA-014: Refresh zip codes when user pulls to refresh
    await GetZipCodes({}, dispatch).catch(() => {});
    await loadData(false); // Don't show spinner for pull-to-refresh
    setRefreshing(false);
  };

  const handleDayPress = (day: moment.Moment) => {
    onChangeDAY(day);
    // useEffect on line 187-189 will trigger loadData() automatically
    // Removed duplicate loadData() call that was causing race condition
  };

  const handleTimeSlotChange = (id: number) => {
    if (id == timeSlotId) onChangeTimeSlotId(0);
    else onChangeTimeSlotId(id);
  };

  const handleCategoryChange = (id: number) => {
    if (id == categoryId) onChangeCategoryId(0);
    else onChangeCategoryId(id);
  };

  const handleChefDetail = (id: number) => {
    const chef = chefs.find(x => x.id === id);
    if (!chef) return;

    navigate.toCustomer.chefDetail({
      chefInfo: chef,
      reviews: chef.reviews,
      menus: chef.menus,
      weekDay: DAY.weekday(),
    });
  };

  const filteredChefs = useMemo(() => {
    return chefs.filter(x => x.menus.length > 0);
  }, [chefs]);

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
              {/* Current Location Display - TMA-013 */}
              <Pressable 
                style={styles.locationDisplay}
                onPress={() => navigate.toCustomer.account({ scrollToAddress: true })}
              >
                <FontAwesomeIcon icon={faLocationDot} size={16} color={AppColors.primary} />
                <Text style={styles.locationText}>
                  {self.zip ? `ZIP ${self.zip}` : 'No ZIP code'}
                </Text>
              </Pressable>
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
                  {self.zip ? `ZIP ${self.zip}` : 'No ZIP code'}
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
                {filteredChefs.length === 0 && (
                  <EmptyListView text="No Chefs" />
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
