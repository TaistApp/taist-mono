import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text, View
} from 'react-native';

// NPM
import {
  faAngleDown,
  faClose,
  faLocationArrow,
  faSearch
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { SelectList } from 'react-native-dropdown-select-list';
import {
  check,
  checkNotifications,
  openSettings,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';
import * as Location from 'expo-location';

// Replace react-native-date-picker with community datetimepicker
import DateTimePicker from '@react-native-community/datetimepicker';

// Types & Services
import { IUser } from '../../../types/index';

// Reducers
// import {setUser} from 'reducers/userSlice';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import { navigate } from '@/app/utils/navigation';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import moment from 'moment';
import StyledButton from '../../../components/styledButton';
import StyledPhotoPicker from '../../../components/styledPhotoPicker';
import StyledProfileImage from '../../../components/styledProfileImage';
import StyledSwitch from '../../../components/styledSwitch';
import StyledTextInput from '../../../components/styledTextInput';
import Container from '../../../layout/Container';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import {
  LoginAPI,
  RegisterAPI,
  UpdateUserAPI,
  VerifyPhoneAPI,
} from '../../../services/api';
import { checkLocalPath, getImageURL } from '../../../utils/functions';
import { ShowErrorToast } from '../../../utils/toast';
import { getFormattedDate } from '../../../utils/validations';
import { AppColors } from '../../../../constants/theme';
import { styles } from './styles';



const Account = () => {
  const selfInfo = useAppSelector(x => x.user.user);
  const dispatch = useAppDispatch();
  const appState = useRef(AppState.currentState);
  const scrollViewRef = useRef<ScrollView>(null);
  const addressSectionRef = useRef<View>(null);
  const [addressSectionY, setAddressSectionY] = useState<number | null>(null);

  const params = useLocalSearchParams();

  const from: string = Array.isArray(params?.from)
    ? params.from[0] ?? ''
    : params?.from ?? '';
const user: IUser = typeof params?.user === 'string'
    ? JSON.parse(params.user)
    : (params?.user as IUser) || {};
  
  const scrollToAddress: boolean = Array.isArray(params?.scrollToAddress)
    ? params.scrollToAddress[0] === 'true'
    : params?.scrollToAddress === 'true';
  
  const [errors, setErrors] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [userInfo, setUserInfo] = useState<IUser>({});
  const [openBirthdayPicker, setOpenBirthdayPicker] = useState(false);
  const [pushNotifications, onChangePushNotifications] = useState(true);
  const [locationServices, onChangeLocationServices] = useState(true);
  const [felony, onChangeFelony] = useState(false);
  const [visibleVerifyCode, onChangeVisibleVerifyCode] = useState(false);
  const [verificationCode, onChangeVerificationCode] = useState('');
  const [verificationCode1, onChangeVerificationCode1] = useState(''); //server
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const statesData = [
    {key: '1', value: 'Alabama '},
    {key: '2', value: 'Alaska '},
    {key: '3', value: 'Arizona '},
    {key: '4', value: 'Arkansas '},
    {key: '5', value: 'California '},
    {key: '6', value: 'Colorado '},
    {key: '7', value: 'Connecticut '},
    {key: '8', value: 'Delaware '},
    {key: '9', value: 'Florida '},
    {key: '10', value: 'Georgia '},
    {key: '11', value: 'Hawaii '},
    {key: '12', value: 'Idaho '},
    {key: '13', value: 'Illinois '},
    {key: '14', value: 'Indiana '},
    {key: '15', value: 'Iowa '},
    {key: '16', value: 'Kansas '},
    {key: '17', value: 'Kentucky '},
    {key: '18', value: 'Louisiana '},
    {key: '19', value: 'Maine '},
    {key: '20', value: 'Maryland '},
    {key: '21', value: 'Massachusetts '},
    {key: '22', value: 'Michigan '},
    {key: '23', value: 'Minnesota '},
    {key: '24', value: 'Mississippi '},
    {key: '25', value: 'Missouri '},
    {key: '26', value: 'Montana '},
    {key: '27', value: 'Nebraska '},
    {key: '28', value: 'Nevada '},
    {key: '29', value: 'New Hampshire '},
    {key: '30', value: 'New Jersey '},
    {key: '31', value: 'New Mexico '},
    {key: '32', value: 'New York '},
    {key: '33', value: 'North Carolina '},
    {key: '34', value: 'North Dakota '},
    {key: '35', value: 'Ohio '},
    {key: '36', value: 'Oklahoma '},
    {key: '37', value: 'Oregon '},
    {key: '38', value: 'Pennsylvania '},
    {key: '39', value: 'Rhode Island '},
    {key: '40', value: 'South Carolina '},
    {key: '41', value: 'South Dakota '},
    {key: '42', value: 'Tennessee '},
    {key: '43', value: 'Texas '},
    {key: '44', value: 'Utah '},
    {key: '45', value: 'Vermont '},
    {key: '46', value: 'Virginia '},
    {key: '47', value: 'Washington '},
    {key: '48', value: 'West Virginia '},
    {key: '49', value: 'Wisconsin '},
    {key: '50', value: 'Wyoming '},
  ];

  useEffect(() => {
    // NOTE: 'Signup' flow is DEPRECATED for chefs (they now use multi-step signup)
    // This screen is now primarily for EDITING existing accounts
    if (from === 'Signup') {
      setUserInfo(user);
    } else {
      setUserInfo(selfInfo);
    }
  }, []);

  // Scroll to address section when navigating from home screen location click
  useFocusEffect(
    useCallback(() => {
      if (scrollToAddress && addressSectionY !== null && scrollViewRef.current) {
        // Small delay to ensure layout is complete
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: addressSectionY - 20, animated: true });
        }, 300);
      }
    }, [scrollToAddress, addressSectionY])
  );

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

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        ShowErrorToast('Please enable location services in your device settings');
        setIsGettingLocation(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        ShowErrorToast('Location permission is required');
        setIsGettingLocation(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 0,
      });

      console.log('✅ Got location:', location.coords);

      // Reverse geocode to get address
      const [addressData] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      console.log('✅ Reverse geocoded address:', addressData);

      if (addressData) {
        const streetAddress = [
          addressData.streetNumber,
          addressData.street,
        ].filter(Boolean).join(' ');
        
        setUserInfo({
          ...userInfo,
          address: streetAddress || userInfo.address,
          city: addressData.city || userInfo.city,
          state: addressData.region || userInfo.state,
          zip: addressData.postalCode || userInfo.zip,
        });
        ShowErrorToast('Address filled from your location!');
      } else {
        ShowErrorToast('Could not determine address from location');
      }
    } catch (error: any) {
      console.error('❌ Location error:', error);
      const errorMessage = error?.message || 'Unknown error';
      
      if (errorMessage.includes('unavailable') || errorMessage.includes('location services')) {
        ShowErrorToast('Location unavailable. Please enter address manually');
      } else if (errorMessage.includes('timed out')) {
        ShowErrorToast('Location request timed out. Please enter manually');
      } else {
        ShowErrorToast('Could not get location. Please enter manually');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleCheckFieldsAndVerifyPhone = async () => {
    if (checkEmptyFieldInUserInfo() !== '') {
      ShowErrorToast(checkEmptyFieldInUserInfo());
      return;
    }

    var params: any = {...userInfo};
    const path = userInfo.photo;
    if (checkLocalPath(path)) {
      params.photo = {
        uri: userInfo.photo,
        type: 'image/jpeg',
        name: 'photo.jpg',
      };
    }

    dispatch(showLoading());
    const resp = await VerifyPhoneAPI(userInfo.phone ?? '');
    dispatch(hideLoading());
    if (resp.success == 0) {
      ShowErrorToast(resp.error || resp.message);
      return;
    }
    const code = resp.data.code;
    onChangeVerificationCode1(code);
    onChangeVisibleVerifyCode(true);
  };

  const handleVerify = () => {
    console.log('verificationCode:', verificationCode + ' --->>' + verificationCode1);
    if (verificationCode != verificationCode1) {
      ShowErrorToast('Please enter the verification code again');
      return;
    }
    onChangeVisibleVerifyCode(false);
    if (from == 'Signup') {
      handleSignUp();
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    if (checkEmptyFieldInUserInfo() !== '') {
      ShowErrorToast(checkEmptyFieldInUserInfo());
      return;
    }

    var params: any = {...userInfo};
    const path = userInfo.photo;
    if (checkLocalPath(path)) {
      params.photo = {
        uri: userInfo.photo,
        type: 'image/jpeg',
        name: 'photo.jpg',
      };
    }

    dispatch(showLoading());
    const resp = await UpdateUserAPI(params, dispatch);
    dispatch(hideLoading());
    if (resp.success == 1) {
      console.log("Response Success:",resp.success);
      console.log("User data:",resp.data);
      console.log("Current user info from Redux:",selfInfo);
      
      // Show alert if user entered service area
      if (resp.zip_change_info?.entered_service_area) {
        alert('Welcome to Taist! Taist is now available in your area. Check out local chefs!');
      } else if (resp.zip_change_info?.left_service_area) {
        alert('Unfortunately, Taist is not yet available in your new location.');
      }
      
      // Navigate based on user type - check both response and current user info
      const userType = resp.data?.user_type || userInfo.user_type || selfInfo?.user_type;
      
      console.log("Determined user type for navigation:",userType);
      
      if (userType === 1) {
        // Customer - go to customer tabs
        console.log("Navigating to customer tabs");
        navigate.toCustomer.tabs();
      } else if (userType === 2) {
        // Chef - go to chef tabs (equivalent to chef dashboard)
        console.log("Navigating to chef tabs");
        navigate.toChef.tabs();
      } else {
        // Fallback error
        console.error("Unable to determine user type for navigation", {
          respUserType: resp.data?.user_type,
          userInfoUserType: userInfo.user_type,
          selfInfoUserType: selfInfo?.user_type
        });
        // Default to chef tabs since the logs show user_type: 2
        navigate.toChef.tabs();
      }
    }
  };

  const handleSignUp = async () => {
    if (checkEmptyFieldInUserInfo() !== '') {
      ShowErrorToast(checkEmptyFieldInUserInfo());
      return;
    }

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
    const resp_register = await RegisterAPI(params, dispatch);
    if (resp_register.success == 0) {
      dispatch(hideLoading());
      ShowErrorToast(resp_register.message ?? resp_register.error);
      return;
    }

    const resp_login = await LoginAPI(
      {email: userInfo.email, password: userInfo.password, remember: true},
      dispatch,
    );

    if (resp_login.success == 0) {
      dispatch(hideLoading());
      ShowErrorToast(resp_login.message ?? resp_login.error);
      return;
    }

    dispatch(hideLoading());

    // Replace navigator.reset with router.replace for Expo Router
    const homeRoute = resp_login.data?.user?.user_type == 1
      ? '/screens/customer/home'
      : '/screens/chef/(tabs)/home';
      
    router.replace(homeRoute);
    
  };

  const checkEmptyFieldInUserInfo = () => {
    // Required for all users
    if (userInfo.phone == undefined || userInfo.phone.length == 0) {
      return 'Please enter the phone number';
    }
    if (userInfo.zip == undefined || userInfo.zip.length == 0) {
      return 'Please enter the zip code';
    }

    // Chef-specific required fields
    if (userInfo.user_type === 2) {
      if (userInfo.first_name == undefined || userInfo.first_name.length == 0) {
        return 'Please enter the first name';
      }
      if (userInfo.last_name == undefined || userInfo.last_name.length == 0) {
        return 'Please enter the last name';
      }
      if (userInfo.birthday == undefined || userInfo.birthday == 0) {
        return 'Please select the birthday';
      }
      if (userInfo.address == undefined || userInfo.address.length == 0) {
        return 'Please enter the address';
      }
      if (userInfo.city == undefined || userInfo.city.length == 0) {
        return 'Please enter the city';
      }
      if (userInfo.state == undefined || userInfo.state.length == 0) {
        return 'Please select a state';
      }
      if (userInfo.photo == undefined || userInfo.photo.length == 0) {
        return 'Please add your photo';
      }
    }

    // For customers (user_type === 1): first_name, last_name, birthday, address, city, state are all optional
    // They can be collected later when actually needed (e.g., at checkout)
    
    return '';
  };

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

  return (
    <SafeAreaView style={styles.main}>
      <Container
        backMode={
          from == 'Signup' ? true : userInfo.user_type === 1 ? false : true
        }
        title={from == 'Signup' ? 'Sign Up' : 'ACCOUNT'}>
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.pageView}
        >
          <View style={styles.profileImageSection}>
            <StyledPhotoPicker
              content={
                <View style={{alignItems: 'center'}}>
                  <StyledProfileImage
                    url={getImageURL(userInfo.photo)}
                    size={160}
                  />
                  <Text style={{
                    marginTop: 12,
                    fontSize: 14,
                    color: AppColors.primary,
                    fontWeight: '600',
                    letterSpacing: 0.3
                  }}>
                    {userInfo.user_type === 1 ? '(Optional) ' : ''}Tap to {userInfo.photo ? 'change' : 'add'} photo
                  </Text>
                </View>
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
          <StyledTextInput
            label={userInfo.user_type === 1 ? "First Name (Optional)" : "First Name"}
            placeholder="First Name"
            onChangeText={val => {
              setUserInfo({...userInfo, first_name: val});
            }}
            value={userInfo.first_name ?? ''}
          />
          <StyledTextInput
            label={userInfo.user_type === 1 ? "Last Name (Optional)" : "Last Name"}
            placeholder="Last Name"
            onChangeText={val => setUserInfo({...userInfo, last_name: val})}
            value={userInfo.last_name ?? ''}
          />
          <StyledTextInput
            label={userInfo.user_type === 1 ? "Birthday (Optional)" : "Birthday"}
            placeholder="Birthday"
            onPress={() => setOpenBirthdayPicker(true)}
            value={
              userInfo.birthday && typeof userInfo.birthday == 'number'
                ? getFormattedDate(userInfo.birthday * 1000)
                : ''
            }
          />
          <StyledTextInput
            label="Phone Number"
            placeholder="Phone Number"
            keyboardType={'phone-pad'}
            onChangeText={val => setUserInfo({...userInfo, phone: val})}
            value={userInfo.phone ?? ''}
          />
          <View 
            ref={addressSectionRef}
            onLayout={(event) => {
              const { y } = event.nativeEvent.layout;
              setAddressSectionY(y);
            }}
            style={styles.addressTextWrapper}
          >
            <Text style={styles.addressText}>
              {userInfo.user_type === 1 ? "ADDRESS (Optional for now)" : "ADDRESS"}
            </Text>
            <Pressable 
              onPress={handleUseCurrentLocation} 
              disabled={isGettingLocation}
              style={styles.locationIconButton}
            >
              <FontAwesomeIcon 
                icon={faLocationArrow} 
                size={20} 
                color={isGettingLocation ? "#999" : "#fa4616"} 
              />
            </Pressable>
          </View>
          <Text style={styles.helperText}>
            {userInfo.user_type === 1 
              ? "We'll ask for your full address when you place your first order. Tap the 📍 icon to auto-fill from your location."
              : "Tap the 📍 icon above to auto-fill your address from your current location."}
          </Text>
          <StyledTextInput
            label={userInfo.user_type === 1 ? "Address (Optional)" : "Address"}
            placeholder="123 Main St"
            onChangeText={val => setUserInfo({...userInfo, address: val})}
            value={userInfo.address ?? ''}
          />
          <StyledTextInput
            label={userInfo.user_type === 1 ? "City (Optional)" : "City"}
            placeholder="City"
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
            placeholder={userInfo.state ? `${userInfo.state}` : (userInfo.user_type === 1 ? 'State (Optional)' : 'State')}
            searchPlaceholder="Search"
            boxStyles={styles.dropdownBox}
            inputStyles={styles.dropdownInput}
            dropdownStyles={styles.dropdown}
            dropdownTextStyles={styles.dropdownText}
            arrowicon={
              <FontAwesomeIcon icon={faAngleDown} size={20} color="#666666" />
            }
            searchicon={
              <FontAwesomeIcon icon={faSearch} size={15} color="#666666" />
            }
            closeicon={
              <FontAwesomeIcon icon={faClose} size={15} color="#666666" />
            }
          />
          <StyledTextInput
            label="ZIP"
            placeholder="ZIP"
            onChangeText={val => setUserInfo({...userInfo, zip: val})}
            value={userInfo.zip ?? ''}
          />

          <View style={styles.switchWrapper}>
            <StyledSwitch
              label="Push Notifications"
              value={pushNotifications}
              onPress={() => openSettings()}
            />
          </View>
          <View style={styles.switchWrapper}>
            <StyledSwitch
              label="Location Services"
              value={locationServices}
              onPress={() => {
                openSettings();
              }}
            />
          </View>
          <View style={styles.vcenter}>
            <StyledButton
              title={from == 'Signup' ? 'Sign Up' : 'SAVE'}
              onPress={() => {
                from == 'Signup'
                  ? handleCheckFieldsAndVerifyPhone()
                  : handleSave();
              }}
            />
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
      <Modal transparent visible={visibleVerifyCode}>
        <Pressable
          onPress={() => onChangeVisibleVerifyCode(false)}
          style={styles.modalBG}>
          <View style={styles.modal}>
            <Text style={styles.modalText}>Please check your phone</Text>
            <StyledTextInput
              label="Verification Code"
              value={verificationCode}
              onChangeText={onChangeVerificationCode}
            />
            <StyledButton title="Verify" onPress={handleVerify} />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default Account;