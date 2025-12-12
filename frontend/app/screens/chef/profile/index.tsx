import moment from 'moment';
import { useEffect, useState, useRef } from 'react';
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
  Keyboard,
  useWindowDimensions,
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

// Use tomorrow's date to avoid any iOS date constraints
// iOS UIDatePicker in time mode still respects date - using tomorrow
// ensures no times are ever "in the past" relative to current time
const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
};

// Convert a time value (string "HH:MM" or legacy timestamp) to a Date for the time picker
// Handles both new format ("09:00") and legacy format (Unix timestamp like 946767600)
const timeValueToDate = (value: string | number | undefined): Date | undefined => {
  if (!value) return undefined;

  // Handle "HH:MM" string format (new format)
  if (typeof value === 'string' && value.includes(':')) {
    const [hours, minutes] = value.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      const result = getTomorrowDate();
      result.setHours(hours, minutes, 0, 0);
      return result;
    }
    return undefined;
  }

  // Handle legacy Unix timestamp (9+ digit number)
  const numValue = typeof value === 'number' ? value : parseInt(value, 10);
  if (!isNaN(numValue) && numValue > 0) {
    // If it's a large number (timestamp), convert it
    // Timestamps are typically 10 digits (seconds since 1970)
    if (numValue > 86400) { // More than seconds in a day = likely a timestamp
      const date = new Date(numValue * 1000);
      const result = getTomorrowDate();
      result.setHours(date.getHours(), date.getMinutes(), 0, 0);
      return result;
    }
  }

  return undefined;
};

// Legacy function name for backwards compatibility during refactor
const timestampToTimeDate = (timestamp: number): Date => {
  const result = timeValueToDate(timestamp);
  return result || getTomorrowDate();
};

// Create a time Date with tomorrow's date from hours and minutes
const createTimeDate = (hours: number, minutes: number = 0): Date => {
  const result = getTomorrowDate();
  result.setHours(hours, minutes, 0, 0);
  return result;
};

// Normalize any Date to use tomorrow's date (preserving hours/minutes)
const normalizeTimeDate = (date: Date): Date => {
  const result = getTomorrowDate();
  result.setHours(date.getHours(), date.getMinutes(), 0, 0);
  return result;
};

const Profile = () => {
  const chefProfile: IChefProfile = useAppSelector(x => x.chef.profile);
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();

  // Use abbreviated day names on narrow screens (< 360px)
  const useShortDayNames = width < 360;

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
  const [tempTime, setTempTime] = useState<Date>(createTimeDate(9, 0)); // Use fixed date
  const [showPicker, setShowPicker] = useState(false);

  // Refs for scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  const hoursLayoutY = useRef<number>(0);

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
        const startVal = chefProfile[fields.start];
        const endVal = chefProfile[fields.end];

        // Use timeValueToDate which handles both "HH:MM" strings and legacy timestamps
        const startDate = timeValueToDate(startVal);
        const endDate = timeValueToDate(endVal);

        if (startDate && endDate) {
          return {
            ...day,
            checked: true,
            start: startDate,
            end: endDate,
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
            start: createTimeDate(9, 0),
            end: createTimeDate(17, 0),
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
      const normalizedTime = currentTime ? normalizeTimeDate(currentTime) : createTimeDate(9, 0);
      setTempTime(normalizedTime);
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
      setTempTime(normalizeTimeDate(selectedDate));
    }
  };

  const confirmTimePicker = () => {
    if (activePickerDay) {
      updateDayTime(activePickerDay, activePickerType, tempTime);
    }
    setShowPicker(false);
  };

  const updateDayTime = (dayId: string, type: 'start' | 'end', time: Date) => {
    // Normalize incoming time to fixed date
    const normalizedTime = normalizeTimeDate(time);

    onChangeDays(prevDays =>
      prevDays.map(day => {
        if (day.id !== dayId) return day;

        let newStart = type === 'start' ? normalizedTime : day.start;
        let newEnd = type === 'end' ? normalizedTime : day.end;

        // Enforce constraint: start must be before end
        // Auto-adjust the other time if needed to maintain validity
        if (newStart && newEnd) {
          // Compare only hours and minutes
          const startMinutes = newStart.getHours() * 60 + newStart.getMinutes();
          const endMinutes = newEnd.getHours() * 60 + newEnd.getMinutes();

          if (startMinutes >= endMinutes) {
            if (type === 'start') {
              // User changed start time to be >= end, push end forward by 1 hour
              newEnd = createTimeDate(newStart.getHours() + 1, newStart.getMinutes());
            } else {
              // User changed end time to be <= start, pull start backward by 1 hour
              newStart = createTimeDate(newEnd.getHours() - 1, newEnd.getMinutes());
            }
          }
        }

        return {
          ...day,
          start: newStart,
          end: newEnd,
        };
      })
    );
  };

  const formatTime = (date?: Date) => {
    if (!date) return '--:--';
    return moment(date).format('h:mm A');
  };

  // No time constraints needed - we auto-adjust times in updateDayTime()
  // to maintain valid start < end relationship

  const handleSubmit = async () => {
    // Check if at least one day has hours configured
    const hasHoursConfigured = days.some(day => day.checked);

    if (!hasHoursConfigured) {
      // Dismiss keyboard so user can see the Hours section
      Keyboard.dismiss();

      // Show error and scroll to hours section
      ShowErrorToast('Please set your available hours for at least one day');

      // Small delay to let keyboard dismiss, then scroll to hours
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: hoursLayoutY.current, animated: true });
      }, 100);
      return;
    }

    var params: IChefProfile = {
      bio,
      sunday_start: days[0].checked ? getTimeString(days[0].start) : '',
      sunday_end: days[0].checked ? getTimeString(days[0].end) : '',
      monday_start: days[1].checked ? getTimeString(days[1].start) : '',
      monday_end: days[1].checked ? getTimeString(days[1].end) : '',
      tuesday_start: days[2].checked ? getTimeString(days[2].start) : '',
      tuesday_end: days[2].checked ? getTimeString(days[2].end) : '',
      wednesday_start: days[3].checked ? getTimeString(days[3].start) : '',
      wednesday_end: days[3].checked ? getTimeString(days[3].end) : '',
      thursday_start: days[4].checked ? getTimeString(days[4].start) : '',
      thursday_end: days[4].checked ? getTimeString(days[4].end) : '',
      friday_start: days[5].checked ? getTimeString(days[5].start) : '',
      friday_end: days[5].checked ? getTimeString(days[5].end) : '',
      saterday_start: days[6].checked ? getTimeString(days[6].start) : '',
      saterday_end: days[6].checked ? getTimeString(days[6].end) : '',
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

  // Convert Date to "HH:MM" string format for saving
  const getTimeString = (date: Date | undefined): string => {
    if (date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return '';
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
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
        <View
          style={styles.section}
          onLayout={(e) => { hoursLayoutY.current = e.nativeEvent.layout.y; }}
        >
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
                  <Text
                    style={[
                      styles.dayName,
                      day.checked && styles.dayNameActive
                    ]}
                    numberOfLines={1}
                  >
                    {useShortDayNames ? day.day : day.fullDay}
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
            <Pressable style={styles.modalContent} onPress={() => {}}>
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
              />
            </Pressable>
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.divider,
    gap: 8,
  },
  dayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 100,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AppColors.border,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '500',
    color: AppColors.textSecondary,
    flexShrink: 1,
  },
  dayNameActive: {
    color: AppColors.text,
    fontWeight: '600',
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  timeButton: {
    backgroundColor: AppColors.background,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
    minWidth: 70,
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
