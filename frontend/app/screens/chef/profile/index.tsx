import moment from 'moment';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  View
} from 'react-native';

// NPM

// Types & Services
import { IChefProfile } from '../../../types/index';

// Reducers
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import StyledButton from '../../../components/styledButton';
import StyledTextInput from '../../../components/styledTextInput';
import Container from '../../../layout/Container';
import { DayRowComponent } from './component/dayRowComponent';
import { styles } from './styles';

import { navigate } from '@/app/utils/navigation';
import {
  CreateAvailabiltyAPI,
  UpdateAvailabiltyAPI
} from '../../../services/api';
import { convertStringToNumber } from '../../../utils/functions';
import { ShowErrorToast } from '../../../utils/toast';
 
type HoursAvailableType = {
  id: string;
  day: string;
  checked: boolean;
  start?: Date;
  end?: Date;
};

const Profile = () => {
  const self = useAppSelector(x => x.user.user);
  const chefProfile: IChefProfile = useAppSelector(x => x.chef.profile);
  const dispatch = useAppDispatch();

  const [bio, onChangeBio] = useState('');
  const [amount, onChangeAmount] = useState('');
  const [distance, onChangeDistance] = useState('');
  const [days, onChangeDays] = useState<Array<HoursAvailableType>>([
    {
      id: '0',
      day: 'Sun ',
      checked: false,
    },
    {
      id: '1',
      day: 'Mon ',
      checked: false,
    },
    {
      id: '2',
      day: 'Tue ',
      checked: false,
    },
    {
      id: '3',
      day: 'Wed ',
      checked: false,
    },
    {
      id: '4',
      day: 'Thu ',
      checked: false,
    },
    {
      id: '5',
      day: 'Fri ',
      checked: false,
    },
    {
      id: '6',
      day: 'Sat ',
      checked: false,
    },
  ]);

  useEffect(() => {
    loadData();
  }, [chefProfile]);

  const loadData = async () => {
    if (chefProfile) {
      onChangeBio(chefProfile.bio ?? '');
      onChangeAmount(
        chefProfile.minimum_order_amount
          ? chefProfile.minimum_order_amount.toFixed(2)
          : '',
      );
      var tempArr: Array<HoursAvailableType> = [...days];
      if (
        chefProfile.sunday_start &&
        chefProfile.sunday_end &&
        chefProfile.sunday_start > 0 &&
        chefProfile.sunday_end > 0
      ) {
        tempArr[0].checked = true;
        tempArr[0].start = moment(chefProfile.sunday_start * 1000).toDate();
        tempArr[0].end = moment(chefProfile.sunday_end * 1000).toDate();
      }
      if (
        chefProfile.monday_start &&
        chefProfile.monday_end &&
        chefProfile.monday_start > 0 &&
        chefProfile.monday_end > 0
      ) {
        tempArr[1].checked = true;
        tempArr[1].start = moment(chefProfile.monday_start * 1000).toDate();
        tempArr[1].end = moment(chefProfile.monday_end * 1000).toDate();
      }
      if (
        chefProfile.tuesday_start &&
        chefProfile.tuesday_end &&
        chefProfile.tuesday_start > 0 &&
        chefProfile.tuesday_end > 0
      ) {
        tempArr[2].checked = true;
        tempArr[2].start = moment(chefProfile.tuesday_start * 1000).toDate();
        tempArr[2].end = moment(chefProfile.tuesday_end * 1000).toDate();
      }
      if (
        chefProfile.wednesday_start &&
        chefProfile.wednesday_end &&
        chefProfile.wednesday_start > 0 &&
        chefProfile.wednesday_end > 0
      ) {
        tempArr[3].checked = true;
        tempArr[3].start = moment(chefProfile.wednesday_start * 1000).toDate();
        tempArr[3].end = moment(chefProfile.wednesday_end * 1000).toDate();
      }
      if (
        chefProfile.thursday_start &&
        chefProfile.thursday_end &&
        chefProfile.thursday_start > 0 &&
        chefProfile.thursday_end > 0
      ) {
        tempArr[4].checked = true;
        tempArr[4].start = moment(chefProfile.thursday_start * 1000).toDate();
        tempArr[4].end = moment(chefProfile.thursday_end * 1000).toDate();
      }
      if (
        chefProfile.friday_start &&
        chefProfile.friday_end &&
        chefProfile.friday_start > 0 &&
        chefProfile.friday_end > 0
      ) {
        tempArr[5].checked = true;
        tempArr[5].start = moment(chefProfile.friday_start * 1000).toDate();
        tempArr[5].end = moment(chefProfile.friday_end * 1000).toDate();
      }
      if (
        chefProfile.saterday_start &&
        chefProfile.saterday_end &&
        chefProfile.saterday_start > 0 &&
        chefProfile.saterday_end > 0
      ) {
        tempArr[6].checked = true;
        tempArr[6].start = moment(chefProfile.saterday_start * 1000).toDate();
        tempArr[6].end = moment(chefProfile.saterday_end * 1000).toDate();
      }
      onChangeDays(tempArr);
    }
  };

  const handleDayChanged = (newDay: any) => {
    var tempArr = [...days];
    var index = tempArr.findIndex(x => x.id == newDay.id);
    if (index >= 0) {
      tempArr[index] = newDay;
      onChangeDays(tempArr);
    }
  };

  const handleSubmit = async () => {
    var params: IChefProfile = {
      bio,
      minimum_order_amount: convertStringToNumber(amount),
      max_order_distance: convertStringToNumber(distance),
      sunday_start: days[0].checked ? getTimestampVal(days[0].start) : 0,
      sunday_end: days[0].checked ? getTimestampVal(days[0].end) : 0,
      monday_start: days[1].checked ? getTimestampVal(days[1].start) : 0,
      monday_end: days[1].checked ? getTimestampVal(days[1].end) : 0,
      tuesday_start: days[2].checked ? getTimestampVal(days[2].start) : 0,
      tuesday_end: days[2].checked ? getTimestampVal(days[2].end) : 0,
      wednesday_start: days[3].checked ? getTimestampVal(days[3].start) : 0,
      wednesday_end: days[3].checked ? getTimestampVal(days[3].end) : 0,
      thursday_start: days[4].checked ? getTimestampVal(days[4].start) : 0,
      thursday_end: days[4].checked ? getTimestampVal(days[4].end) : 0,
      friday_start: days[5].checked ? getTimestampVal(days[5].start) : 0,
      friday_end: days[5].checked ? getTimestampVal(days[5].end) : 0,
      saterday_start: days[6].checked ? getTimestampVal(days[6].start) : 0,
      saterday_end: days[6].checked ? getTimestampVal(days[6].end) : 0,
    };
    if (checkEmptyFieldInProfile(params) !== '') {
      ShowErrorToast(checkEmptyFieldInProfile(params));
      return;
    }
    dispatch(showLoading());
    if (chefProfile && chefProfile.id) {
      params = {...chefProfile, ...params};
      const resp = await UpdateAvailabiltyAPI(params, dispatch);
    } else {
      const resp = await CreateAvailabiltyAPI(params, dispatch);
    }
    dispatch(hideLoading());
    navigate.toChef.home();
  };

  const getTimestampVal = (date: Date | undefined) => {
    if (date) {
      return Math.floor(date.getTime() / 1000);
    }
    return 0;
  };

  const checkEmptyFieldInProfile = (params: IChefProfile) => {
    var profile = {...params};
    if (profile.bio == undefined || profile.bio.length == 0) {
      return 'Please enter your bio';
    }
    const isAvailableSunday =
      (profile.sunday_start ?? 0) > 0 && (profile.sunday_end ?? 0) > 0;
    const isAvailableMonday =
      (profile.monday_start ?? 0) > 0 && (profile.monday_end ?? 0) > 0;
    const isAvailableTuesday =
      (profile.tuesday_start ?? 0) > 0 && (profile.tuesday_end ?? 0) > 0;
    const isAvailableWednesday =
      (profile.wednesday_start ?? 0) > 0 && (profile.wednesday_end ?? 0) > 0;
    const isAvailableThursday =
      (profile.thursday_start ?? 0) > 0 && (profile.thursday_end ?? 0) > 0;
    const isAvailableFriday =
      (profile.friday_start ?? 0) > 0 && (profile.friday_end ?? 0) > 0;
    const isAvailableSaturday =
      (profile.saterday_start ?? 0) > 0 && (profile.saterday_end ?? 0) > 0;
    
    // Only validate that if a day is checked, it must have start and end times
    // Allow saving with no availability if user hasn't checked any days
    if (
      (days[0].checked === true && !isAvailableSunday) ||
      (days[1].checked === true && !isAvailableMonday) ||
      (days[2].checked === true && !isAvailableTuesday) ||
      (days[3].checked === true && !isAvailableWednesday) ||
      (days[4].checked === true && !isAvailableThursday) ||
      (days[5].checked === true && !isAvailableFriday) ||
      (days[6].checked === true && !isAvailableSaturday)
    ) {
      return 'Please select "Start" and "End" for the chosen day';
    }
    return '';
  };

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.pageView}>
          <View style={{gap: 10}}>
            <Text style={styles.title}>Bio </Text>
            <Text style={styles.text}>Introduce yourself to customers. </Text>
            <StyledTextInput
              label="My Bio"
              placeholder="My Bio"
              onChangeText={onChangeBio}
              value={bio}
              multiline
            />
          </View>

          <View style={{gap: 10}}>
            <Text style={styles.title}>Hours Available </Text>
            <Text style={styles.text}>
              Choose when you are available to take orders. This can be changed
              whenever you want.{' '}
            </Text>
            <View style={{gap: 5}}>
              <View style={styles.row}>
                <View style={styles.col_days}>
                  <Text style={styles.text}>Days </Text>
                </View>
                <View style={styles.col_start}>
                  <Text style={styles.text}>Start </Text>
                </View>
                <View style={styles.col_end}>
                  <Text style={styles.text}>End </Text>
                </View>
              </View>

              {days.map((day, idx) => {
                return (
                  <DayRowComponent
                    key={`drc_${idx}`}
                    day={day}
                    onDayChanged={newDay => {
                      handleDayChanged(newDay);
                    }}
                  />
                );
              })}
            </View>
          </View>

          {/* <View style={{gap: 10}}>
            <Text style={styles.title}>Minimium Order Amount ($) </Text>
            <Text style={styles.text}>
              Customers won’t be able to place the order with you if it doesn’t
              meet this amount.{' '}
            </Text>
            <StyledTextInput
              label="Minimium Order Amount ($)"
              placeholder="Minimium Order Amount ($)"
              onChangeText={onChangeAmount}
              onEndEditing={() =>
                onChangeAmount(convertStringToNumber(amount).toFixed(2))
              }
              value={amount}
              keyboardType={'decimal-pad'}
            />
          </View>

          <View style={{gap: 10}}>
            <Text style={styles.title}>Maximum Order Distance (miles) </Text>
            <Text style={styles.text}>
              Customers won’t be able to see you if they are not within this
              distance.{' '}
            </Text>
            <StyledTextInput
              label="Maximum Order Distance (miles)"
              placeholder="Maximum Order Distance (miles)"
              onChangeText={onChangeDistance}
              onEndEditing={() =>
                onChangeDistance(convertStringToNumber(distance).toFixed(2))
              }
              value={distance}
              keyboardType={'decimal-pad'}
            />
          </View> */}

          <StyledButton title={'SAVE '} onPress={handleSubmit} />
        </ScrollView>
      </Container>
  );
};

export default Profile;
