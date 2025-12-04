import {
  faAngleDown,
  faClose,
  faLocationArrow,
  faSearch
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text } from '@react-native-material/core';
import { useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  View
} from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';
import {
  PERMISSIONS,
  RESULTS,
  check,
  checkNotifications,
  openSettings,
} from 'react-native-permissions';
import StyledButton from '../../../components/styledButton';
import StyledPhotoPicker from '../../../components/styledPhotoPicker';
import StyledProfileImage from '../../../components/styledProfileImage';
import StyledSwitch from '../../../components/styledSwitch';
import StyledTextInput from '../../../components/styledTextInput';
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';
import Container from '../../../layout/Container';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { RegisterAPI } from '../../../services/api';
import { IUser } from '../../../types/index';
import { checkLocalPath, getImageURL } from '../../../utils/functions';
import { ShowErrorToast } from '../../../utils/toast';
import { getFormattedDate } from '../../../utils/validations';
import { styles } from './styles';

const UserInformation = ({navigation, route}: any) => {
  const selfInfo = useAppSelector(x => x.user.user);
  const dispatch = useAppDispatch();
  const appState = useRef(AppState.currentState);

  const [errors, setErrors] = React.useState('');
  const [userInfo, setUserInfo] = useState<IUser>({});
  const [openBirthdayPicker, setOpenBirthdayPicker] = useState(false);
  const [pushNotifications, onChangePushNotifications] = React.useState(true);
  const [locationServices, onChangeLocationServices] = React.useState(true);
 
  const statesData = [
    {key: '1', value: 'Alabama'},
    {key: '2', value: 'Alaska'},
    {key: '3', value: 'Arizona'},
    {key: '4', value: 'Arkansas'},
    {key: '5', value: 'California'},
    {key: '6', value: 'Colorado'},
    {key: '7', value: 'Connecticut'},
    {key: '8', value: 'Delaware'},
    {key: '9', value: 'Florida'},
    {key: '10', value: 'Georgia'},
    {key: '11', value: 'Hawaii'},
    {key: '12', value: 'Idaho'},
    {key: '13', value: 'Illinois'},
    {key: '14', value: 'Indiana'},
    {key: '15', value: 'Iowa'},
    {key: '16', value: 'Kansas'},
    {key: '17', value: 'Kentucky'},
    {key: '18', value: 'Louisiana'},
    {key: '19', value: 'Maine'},
    {key: '20', value: 'Maryland'},
    {key: '21', value: 'Massachusetts'},
    {key: '22', value: 'Michigan'},
    {key: '23', value: 'Minnesota'},
    {key: '24', value: 'Mississippi'},
    {key: '25', value: 'Missouri'},
    {key: '26', value: 'Montana'},
    {key: '27', value: 'Nebraska'},
    {key: '28', value: 'Nevada'},
    {key: '29', value: 'New Hampshire'},
    {key: '30', value: 'New Jersey'},
    {key: '31', value: 'New Mexico'},
    {key: '32', value: 'New York'},
    {key: '33', value: 'North Carolina'},
    {key: '34', value: 'North Dakota'},
    {key: '35', value: 'Ohio'},
    {key: '36', value: 'Oklahoma'},
    {key: '37', value: 'Oregon'},
    {key: '38', value: 'Pennsylvania'},
    {key: '39', value: 'Rhode Island'},
    {key: '40', value: 'South Carolina'},
    {key: '41', value: 'South Dakota'},
    {key: '42', value: 'Tennessee'},
    {key: '43', value: 'Texas'},
    {key: '44', value: 'Utah'},
    {key: '45', value: 'Vermont'},
    {key: '46', value: 'Virginia'},
    {key: '47', value: 'Washington'},
    {key: '48', value: 'West Virginia'},
    {key: '49', value: 'Wisconsin'},
    {key: '50', value: 'Wyoming'},
  ];
// Handler for the new DateTimePicker
  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || (userInfo.birthday ? moment(userInfo.birthday * 1000).toDate() : new Date());
    
    // On Android, the picker closes automatically
    if (Platform.OS === 'android') {
      setOpenBirthdayPicker(false);
      if (event.type === 'set' && selectedDate) {
        setUserInfo({...userInfo, birthday: selectedDate.getTime() / 1000});
      }
      return;
    }
    
    // On iOS, handle spinner mode events
    if (Platform.OS === 'ios') {
      if (event.type === 'set') {
        // User confirmed the date
        setUserInfo({...userInfo, birthday: currentDate.getTime() / 1000});
        setOpenBirthdayPicker(false);
      } else if (event.type === 'dismissed') {
        // User cancelled
        setOpenBirthdayPicker(false);
      } else if (selectedDate) {
        // For spinner mode, update date as user scrolls
        setUserInfo({...userInfo, birthday: selectedDate.getTime() / 1000});
      }
    }
  };
  useEffect(() => {
    if (route.params.from === 'Signup') {
      setUserInfo(route.params.user);
    } else {
      setUserInfo(selfInfo);
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState == 'active'
      ) {
        console.log('App has come to the foreground!');
        handleCheckPermissions();
      }
      appState.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      handleCheckPermissions();
      return () => {};
    }, [appState]),
  );

  const handleCheckPermissions = async () => {
    if (Platform.OS === 'android') {
      check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION).then(result => {
        if (result === RESULTS.GRANTED) onChangeLocationServices(true);
        else
          check(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION).then(result1 => {
            if (result1 == RESULTS.GRANTED) onChangeLocationServices(true);
            else onChangeLocationServices(false);
          });
      });
    } else {
      check(PERMISSIONS.IOS.LOCATION_ALWAYS).then(result => {
        if (result === RESULTS.GRANTED) onChangeLocationServices(true);
        else
          check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE).then(result1 => {
            if (result1 == RESULTS.GRANTED) onChangeLocationServices(true);
            else onChangeLocationServices(false);
          });
      });
    }

    checkNotifications().then(({status, settings}) => {
      if (status === RESULTS.GRANTED) onChangePushNotifications(true);
      else onChangePushNotifications(false);
    });
  };

  const handleSignUp = async () => {
    var params: any = {...userInfo};
    const path = userInfo.photo;
    if (checkLocalPath(path)) {
      params.photo = {
        uri: userInfo.photo,
        type: 'image/jpeg',
        name: 'photo.jpg',
      };
    }
    params.is_pending = 1;

    dispatch(showLoading());
    const resp = await RegisterAPI(userInfo, dispatch);
    dispatch(hideLoading());
    if (resp.success == 0) {
      ShowErrorToast(resp.message ?? resp.error);
      return;
    }
    // navigation.reset({
    //   index: 0,
    //   routes: [
    //     {
    //       name:
    //         user.user_type == 1
    //           ? 'CustomerAuthorizedStack'
    //           : 'ChefAuthorizedStack',
    //     },
    //   ],
    // });
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container backMode={true} title="Sign Up">
        <ScrollView contentContainerStyle={styles.pageView}>
          {userInfo.user_type == 2 && (
            <View>
              <StyledPhotoPicker
                content={
                  <StyledProfileImage
                    url={getImageURL(userInfo.photo)}
                    size={160}
                  />
                }
                onPhoto={path => {
                  setUserInfo({
                    ...userInfo,
                    photo: path,
                  });
                }}
                onHide={() => {}}
              />
            </View>
          )}
          <StyledTextInput
            label="First Name "
            placeholder="First Name "
            onChangeText={val => {
              setUserInfo({...userInfo, first_name: val});
            }}
            value={userInfo.first_name ?? ''}
          />
          <StyledTextInput
            label="Last Name "
            placeholder="Last Name "
            onChangeText={val => setUserInfo({...userInfo, last_name: val})}
            value={userInfo.last_name ?? ''}
          />
          <StyledTextInput
            label="Birthday "
            placeholder="Birthday "
            onPress={() => setOpenBirthdayPicker(true)}
            value={
              userInfo.birthday
                ? getFormattedDate(userInfo.birthday * 1000)
                : ''
            }
          />
          <StyledTextInput
            label="Phone Number "
            placeholder="Phone Number "
            onChangeText={val => setUserInfo({...userInfo, phone: val})}
            value={userInfo.phone ?? ''}
          />
          <View style={styles.addressTextWrapper}>
            <Text style={styles.addressText}>ADDRESS </Text>
            <FontAwesomeIcon icon={faLocationArrow} size={20} color="#ffffff" />
          </View>
          <StyledTextInput
            label="Address "
            placeholder="Address "
            onChangeText={val => setUserInfo({...userInfo, address: val})}
            value={userInfo.address ?? ''}
          />
          <StyledTextInput
            label="City "
            placeholder="City "
            onChangeText={val => setUserInfo({...userInfo, city: val})}
            value={userInfo.city ?? ''}
          />
          <SelectList
            setSelected={(key: string) => {
              const opt = statesData.find(x => x.key == key);
              if (opt) setUserInfo({...userInfo, state: opt.value});
            }}
            data={statesData}
            save={'key'}
            placeholder={userInfo.state ?? 'State '}
            searchPlaceholder="Search "
            boxStyles={styles.dropdownBox}
            inputStyles={styles.dropdownInput}
            dropdownStyles={styles.dropdown}
            dropdownTextStyles={styles.dropdownText}
            arrowicon={
              <FontAwesomeIcon icon={faAngleDown} size={20} color="#ffffff" />
            }
            searchicon={
              <FontAwesomeIcon icon={faSearch} size={15} color="#ffffff" />
            }
            closeicon={
              <FontAwesomeIcon icon={faClose} size={15} color="#ffffff" />
            }
          />
          <StyledTextInput
            label="ZIP "
            placeholder="ZIP "
            onChangeText={val => setUserInfo({...userInfo, zip: val})}
            value={userInfo.zip ?? ''}
          />

          <View style={styles.switchWrapper}>
            <StyledSwitch
              label="Push notifications "
              value={pushNotifications}
              onPress={() => openSettings()}
            />
          </View>
          <View style={styles.switchWrapper}>
            <StyledSwitch
              label="Location Services "
              value={locationServices}
              onPress={() => {
                // Geolocation.setRNConfiguration({
                //   skipPermissionRequests: true,
                //   authorizationLevel: 'auto',
                //   locationProvider: 'auto',
                // });
                openSettings();
              }}
            />
          </View>
          {/* {userInfo.user_type == 1 && (
            <View style={styles.switchWrapper}>
              <StyledSwitch
                label="Have you ever been convicted of a felony? "
                labelLines={0}
                value={felony}
                onPress={() => onChangeFelony(!felony)}
              />
            </View>
          )} */}
          <View style={styles.vcenter}>
            <StyledButton title={'SAVE '} onPress={() => handleSignUp()} />
          </View>
        </ScrollView>
       {/* Replace DatePicker with DateTimePicker */}
        {Platform.OS === 'ios' ? (
          <Modal
            visible={openBirthdayPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setOpenBirthdayPicker(false)}
          >
            <Pressable 
              style={styles.datePickerModalOverlay}
              onPress={() => setOpenBirthdayPicker(false)}
            >
              <View style={styles.datePickerModalContent}>
                <View style={styles.datePickerModalHeader}>
                  <Pressable onPress={() => setOpenBirthdayPicker(false)}>
                    <Text style={styles.datePickerModalCancel}>Cancel</Text>
                  </Pressable>
                  <Text style={styles.datePickerModalTitle}>Select Birthday</Text>
                  <Pressable 
                    onPress={() => {
                      setOpenBirthdayPicker(false);
                    }}
                  >
                    <Text style={styles.datePickerModalDone}>Done</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={
                    userInfo.birthday
                      ? moment(userInfo.birthday * 1000).toDate()
                      : moment().subtract(18, 'years').toDate()
                  }
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  minimumDate={moment().subtract(120, 'years').toDate()}
                  style={styles.datePickerPicker}
                />
              </View>
            </Pressable>
          </Modal>
        ) : (
          openBirthdayPicker && (
            <DateTimePicker
              value={
                userInfo.birthday
                  ? moment(userInfo.birthday * 1000).toDate()
                  : moment().subtract(18, 'years').toDate()
              }
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
              minimumDate={moment().subtract(120, 'years').toDate()}
            />
          )
        )}
      </Container>
    </SafeAreaView>
  );
};

export default UserInformation;
