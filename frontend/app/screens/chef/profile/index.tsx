import moment from 'moment';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faClock } from '@fortawesome/free-solid-svg-icons';

// Types & Services
import { IChefProfile } from '../../../types/index';

// Reducers
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import StyledButton from '../../../components/styledButton';
import StyledTextInput from '../../../components/styledTextInput';
import Container from '../../../layout/Container';

import { navigate } from '@/app/utils/navigation';
import {
  CreateAvailabiltyAPI,
  UpdateAvailabiltyAPI
} from '../../../services/api';
import { ShowErrorToast } from '../../../utils/toast';
import { AppColors, Spacing, Shadows } from '../../../../constants/theme';

type HoursAvailableType = {
  id: string;
  day: string;
  fullDay: string;
  checked: boolean;
  start?: Date;
  end?: Date;
};

const Profile = () => {
  const chefProfile: IChefProfile = useAppSelector(x => x.chef.profile);
  const dispatch = useAppDispatch();

  const [bio, onChangeBio] = useState('');
  const [days, onChangeDays] = useState<Array<HoursAvailableType>>([
    { id: '0', day: 'Sun', fullDay: 'Sunday', checked: false },
    { id: '1', day: 'Mon', fullDay: 'Monday', checked: false },
    { id: '2', day: 'Tue', fullDay: 'Tuesday', checked: false },
    { id: '3', day: 'Wed', fullDay: 'Wednesday', checked: false },
    { id: '4', day: 'Thu', fullDay: 'Thursday', checked: false },
    { id: '5', day: 'Fri', fullDay: 'Friday', checked: false },
    { id: '6', day: 'Sat', fullDay: 'Saturday', checked: false },
  ]);

  // Time picker state
  const [activePickerDay, setActivePickerDay] = useState<string | null>(null);
  const [activePickerType, setActivePickerType] = useState<'start' | 'end'>('start');
  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, [chefProfile]);

  const loadData = async () => {
    if (chefProfile) {
      onChangeBio(chefProfile.bio ?? '');

      // Map of day index to profile field names
      const dayFieldMap: Array<{ start: keyof IChefProfile; end: keyof IChefProfile }> = [
        { start: 'sunday_start', end: 'sunday_end' },
        { start: 'monday_start', end: 'monday_end' },
        { start: 'tuesday_start', end: 'tuesday_end' },
        { start: 'wednesday_start', end: 'wednesday_end' },
        { start: 'thursday_start', end: 'thursday_end' },
        { start: 'friday_start', end: 'friday_end' },
        { start: 'saterday_start', end: 'saterday_end' },
      ];

      // Create new array with new object references for each day
      const newDays = days.map((day, index) => {
        const fields = dayFieldMap[index];
        const startVal = chefProfile[fields.start] as number | undefined;
        const endVal = chefProfile[fields.end] as number | undefined;

        if (startVal && endVal && startVal > 0 && endVal > 0) {
          return {
            ...day,
            checked: true,
            start: moment(startVal * 1000).toDate(),
            end: moment(endVal * 1000).toDate(),
          };
        }
        return { ...day }; // Return new object even if unchanged
      });

      onChangeDays(newDays);
    }
  };

  const handleDayToggle = (dayId: string) => {
    onChangeDays(prevDays =>
      prevDays.map(day => {
        if (day.id !== dayId) return day;

        const newChecked = !day.checked;
        // Set default times if checking the day and no times set yet
        if (newChecked && !day.start) {
          return {
            ...day,
            checked: newChecked,
            start: moment().startOf('day').add(9, 'hours').toDate(),
            end: moment().startOf('day').add(17, 'hours').toDate(),
          };
        }
        return {
          ...day,
          checked: newChecked,
        };
      })
    );
  };

  const openTimePicker = (dayId: string, type: 'start' | 'end') => {
    const day = days.find(d => d.id === dayId);
    if (day) {
      const currentTime = type === 'start' ? day.start : day.end;
      setTempTime(currentTime || moment().startOf('day').add(9, 'hours').toDate());
      setActivePickerDay(dayId);
      setActivePickerType(type);
      setShowPicker(true);
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate && activePickerDay) {
        updateDayTime(activePickerDay, activePickerType, selectedDate);
      }
      return;
    }

    // iOS - update temp time
    if (selectedDate) {
      setTempTime(selectedDate);
    }
  };

  const confirmTimePicker = () => {
    if (activePickerDay) {
      updateDayTime(activePickerDay, activePickerType, tempTime);
    }
    setShowPicker(false);
  };

  const updateDayTime = (dayId: string, type: 'start' | 'end', time: Date) => {
    onChangeDays(prevDays =>
      prevDays.map(day => {
        if (day.id !== dayId) return day;
        // Create new object with updated time
        return {
          ...day,
          [type]: time,
        };
      })
    );
  };

  const formatTime = (date?: Date) => {
    if (!date) return '--:--';
    return moment(date).format('h:mm A');
  };

  // Get min/max time constraints for the picker based on active day and type
  const getTimeConstraints = (): { minimumDate?: Date; maximumDate?: Date } => {
    if (!activePickerDay) return {};

    const day = days.find(d => d.id === activePickerDay);
    if (!day) return {};

    if (activePickerType === 'start' && day.end) {
      // Start time must be before end time (at least 1 hour gap)
      return { maximumDate: moment(day.end).subtract(1, 'hour').toDate() };
    }

    if (activePickerType === 'end' && day.start) {
      // End time must be after start time (at least 1 hour gap)
      return { minimumDate: moment(day.start).add(1, 'hour').toDate() };
    }

    return {};
  };

  const handleSubmit = async () => {
    var params: IChefProfile = {
      bio,
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
      await UpdateAvailabiltyAPI(params, dispatch);
    } else {
      await CreateAvailabiltyAPI(params, dispatch);
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

  const checkEmptyFieldInProfile = (_params: IChefProfile) => {
    // Bio and hours are optional - allow saving without them
    // so users can proceed to payment info setup
    return '';
  };

  return (
    <Container backMode title="Profile">
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.sectionSubtitle}>Introduce yourself to customers.</Text>
          <StyledTextInput
            label="My Bio"
            placeholder="Tell customers about your cooking style, experience, and specialties..."
            onChangeText={onChangeBio}
            value={bio}
            multiline
          />
        </View>

        {/* Hours Available Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesomeIcon icon={faClock} size={20} color={AppColors.primary} />
            <Text style={styles.sectionTitle}>Hours Available</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Choose when you're available to take orders. You can change this anytime.
          </Text>

          <View style={styles.daysContainer}>
            {days.map((day) => (
              <View key={day.id} style={styles.dayRow}>
                {/* Day checkbox and name */}
                <TouchableOpacity
                  style={styles.dayToggle}
                  onPress={() => handleDayToggle(day.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkbox,
                    day.checked && styles.checkboxChecked
                  ]}>
                    {day.checked && (
                      <FontAwesomeIcon icon={faCheck} size={12} color="#fff" />
                    )}
                  </View>
                  <Text style={[
                    styles.dayName,
                    day.checked && styles.dayNameActive
                  ]}>
                    {day.fullDay}
                  </Text>
                </TouchableOpacity>

                {/* Time inputs */}
                <View style={styles.timeInputs}>
                  <TouchableOpacity
                    style={[
                      styles.timeButton,
                      !day.checked && styles.timeButtonDisabled
                    ]}
                    onPress={() => day.checked && openTimePicker(day.id, 'start')}
                    disabled={!day.checked}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.timeText,
                      !day.checked && styles.timeTextDisabled
                    ]}>
                      {day.checked ? formatTime(day.start) : '--:--'}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.timeSeparator}>to</Text>

                  <TouchableOpacity
                    style={[
                      styles.timeButton,
                      !day.checked && styles.timeButtonDisabled
                    ]}
                    onPress={() => day.checked && openTimePicker(day.id, 'end')}
                    disabled={!day.checked}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.timeText,
                      !day.checked && styles.timeTextDisabled
                    ]}>
                      {day.checked ? formatTime(day.end) : '--:--'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        </ScrollView>

        {/* Fixed Save Button */}
        <View style={styles.fixedButtonContainer}>
          <StyledButton title="Save Changes" onPress={handleSubmit} />
        </View>
      </KeyboardAvoidingView>

      {/* Time Picker Modal for iOS */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowPicker(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </Pressable>
                <Text style={styles.modalTitle}>
                  Select {activePickerType === 'start' ? 'Start' : 'End'} Time
                </Text>
                <Pressable onPress={confirmTimePicker}>
                  <Text style={styles.modalDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                mode="time"
                display="spinner"
                value={tempTime}
                onChange={handleTimeChange}
                themeVariant="light"
                textColor="#000000"
                style={styles.picker}
                {...getTimeConstraints()}
              />
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Android Time Picker */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          mode="time"
          display="default"
          value={tempTime}
          onChange={handleTimeChange}
          {...getTimeConstraints()}
        />
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 20,
  },
  daysContainer: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 4,
    ...Shadows.sm,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.divider,
  },
  dayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AppColors.border,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  dayNameActive: {
    color: AppColors.text,
    fontWeight: '600',
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeButton: {
    backgroundColor: AppColors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
    minWidth: 80,
    alignItems: 'center',
  },
  timeButtonDisabled: {
    backgroundColor: AppColors.disabled,
    borderColor: AppColors.divider,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
  },
  timeTextDisabled: {
    color: AppColors.disabledText,
  },
  timeSeparator: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  keyboardView: {
    flex: 1,
  },
  fixedButtonContainer: {
    padding: Spacing.lg,
    paddingBottom: 20,
    backgroundColor: AppColors.background,
    borderTopWidth: 1,
    borderTopColor: AppColors.divider,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.divider,
  },
  modalCancel: {
    fontSize: 16,
    color: AppColors.textSecondary,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: AppColors.text,
  },
  modalDone: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '600',
  },
  picker: {
    width: '100%',
    height: 216, // iOS standard picker height
    backgroundColor: 'white',
  },
});

export default Profile;
