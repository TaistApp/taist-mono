import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import {
  faAngleDown,
  faClose,
  faLocationArrow,
  faSearch
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { SelectList } from 'react-native-dropdown-select-list';  
// Reducers
import { setUser } from '../../../reducers/userSlice';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import DateTimePicker from '@react-native-community/datetimepicker';
 import moment from 'moment';
import StyledButton from '../../../components/styledButton';
import StyledSwitch from '../../../components/styledSwitch';
import StyledTextInput from '../../../components/styledTextInput';
import Container from '../../../layout/Container';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { BackgroundCheckAPI } from '../../../services/api';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';
import { getFormattedDate } from '../../../utils/validations';
import { styles } from './styles';
import { goBack } from '@/app/utils/navigation';

 
const BackgroundCheck = () => {
  const self = useAppSelector(x => x.user.user);
  const dispatch = useAppDispatch();

  const [errors, setErrors] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [bgInfo, setBgInfo] = useState<any>({});
  const [agree, onChangeAgree] = useState(false);
  const [openBirthdayPicker, setOpenBirthdayPicker] = useState(false);

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
    setBgInfo(self);
  }, []);

  const handleSave = async () => {
    dispatch(showLoading());
    const resp = await BackgroundCheckAPI(bgInfo);
    dispatch(hideLoading());
    if (resp.success == 1) {
      dispatch(setUser({...self, applicant_guid: 'temp'}));
      ShowSuccessToast(resp.message);
      goBack();
    } else {
      ShowErrorToast(resp.error ?? resp.message);
    }
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container backMode title="Background Check">
        <ScrollView contentContainerStyle={styles.pageView}>
          <View style={styles.vcenter}>
            <StyledTextInput
              label="First Name "
              placeholder="First Name "
              onChangeText={val => {
                setBgInfo({...bgInfo, first_name: val});
              }}
              value={bgInfo.first_name ?? ''}
            />
            <StyledTextInput
              label="Last Name "
              placeholder="Last Name "
              onChangeText={val => setBgInfo({...bgInfo, last_name: val})}
              value={bgInfo.last_name ?? ''}
            />
            <StyledTextInput
              label="Birthday "
              placeholder="Birthday "
              onPress={() => setOpenBirthdayPicker(true)}
              value={
                bgInfo.birthday ? getFormattedDate(bgInfo.birthday * 1000) : ''
              }
            />
          </View>

          <View style={styles.vcenter}>
            <View style={styles.addressTextWrapper}>
              <Text style={styles.addressText}>ADDRESS </Text>
              <FontAwesomeIcon
                icon={faLocationArrow}
                size={20}
                color="#ffffff"
              />
            </View>
            <StyledTextInput
              label="Address "
              placeholder="Address "
              onChangeText={val => setBgInfo({...bgInfo, address: val})}
              value={bgInfo.address ?? ''}
            />
            <StyledTextInput
              label="City "
              placeholder="City "
              onChangeText={val => setBgInfo({...bgInfo, city: val})}
              value={bgInfo.city ?? ''}
            />
            <SelectList
              setSelected={(key: string) => {
                const opt = statesData.find(x => x.key == key);
                if (opt) setBgInfo({...bgInfo, state: opt.value});
              }}
              data={statesData}
              save={'key'}
              placeholder={bgInfo.state ? `${bgInfo.state} ` : 'State '}
              searchPlaceholder="Search "
              boxStyles={styles.dropdownBox}
              inputStyles={styles.dropdownInput}
              dropdownStyles={styles.dropdown}
              dropdownTextStyles={styles.dropdownText}
              dropdownProps={{ nestedScrollEnabled: true }}
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
              onChangeText={val => setBgInfo({...bgInfo, zip: val})}
              value={bgInfo.zip ?? ''}
            />
          </View>

          <View style={styles.vcenter}>
            <StyledTextInput
              label="Social Security Number "
              placeholder="Social Security Number "
              onChangeText={val => setBgInfo({...bgInfo, ssn: val})}
              value={bgInfo.ssn ?? ''}
            />
            <StyledTextInput
              label="Phone Number "
              placeholder="Phone Number "
              onChangeText={val => setBgInfo({...bgInfo, phone: val})}
              value={bgInfo.phone ?? ''}
            />
          </View>
          <View style={styles.switchWrapper}>
            <Text style={styles.agreeText}>
              I agree to submit this information to Taist’s third party
              background check service. Taist does not retain any of the
              information provided{' '}
            </Text>
            <StyledSwitch
              label="Yes "
              value={agree}
              onPress={() => onChangeAgree(!agree)}
            />
          </View>
          <View style={styles.vcenter}>
            <StyledButton
              title={'SAVE '}
              onPress={() => handleSave()}
              disabled={!agree}
            />
          </View>
        </ScrollView>
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
                    bgInfo.birthday
                      ? moment(bgInfo.birthday * 1000).toDate()
                      : moment().subtract(18, 'years').toDate()
                  }
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    if (event.type === 'set' && date) {
                      setBgInfo({...bgInfo, birthday: date.getTime() / 1000});
                      setOpenBirthdayPicker(false);
                    } else if (event.type === 'dismissed') {
                      setOpenBirthdayPicker(false);
                    } else if (date) {
                      // For spinner mode, update date as user scrolls
                      setBgInfo({...bgInfo, birthday: date.getTime() / 1000});
                    }
                  }}
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
              mode="date"
              value={
                bgInfo.birthday
                  ? moment(bgInfo.birthday * 1000).toDate()
                  : moment().subtract(18, 'years').toDate()
              }
              onChange={(event, date) => {
                setOpenBirthdayPicker(false);
                if (event.type === 'set' && date) {
                  setBgInfo({...bgInfo, birthday: date.getTime() / 1000});
                }
              }}
              maximumDate={new Date()}
              minimumDate={moment().subtract(120, 'years').toDate()}
            />
          )
        )}
      </Container>
    </SafeAreaView>
  );
};

export default BackgroundCheck;
