import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import StyledCheckBox from '../../../../components/styledCheckBox';
import { getFormattedTimeA } from '../../../../utils/validations';
import { styles } from '../styles';

// Use a fixed future date to avoid iOS date constraints
// iOS UIDatePicker in time mode still respects the date portion and
// disables times it considers "in the past" relative to current moment.
// Using a far-future date ensures ALL times are always selectable.
const PICKER_BASE_DATE = new Date(2030, 0, 15, 12, 0, 0, 0); // Jan 15, 2030 noon

const getPickerBaseDate = () => {
  return new Date(PICKER_BASE_DATE);
};

type Props = {day: any; onDayChanged: (newDay: any) => void};

export const DayRowComponent = ({day, onDayChanged}: Props) => {
  const [openStartPicker, setOpenStartPicker] = useState(false);
  const [openEndPicker, setOpenEndPicker] = useState(false);
  // Temporary time values for iOS spinner mode
  const [tempStartTime, setTempStartTime] = useState<Date | null>(null);
  const [tempEndTime, setTempEndTime] = useState<Date | null>(null);

  // Create display times using fixed future date to avoid iOS "past time" disabling
  const startTime = getPickerBaseDate();
  const endTime = getPickerBaseDate();
  if (day.start) {
    const t = day.start as Date;
    startTime.setHours(t.getHours());
    startTime.setMinutes(t.getMinutes());
  }
  if (day.end) {
    const t = day.end as Date;
    endTime.setHours(t.getHours());
    endTime.setMinutes(t.getMinutes());
  }

  // Use temp time if set (for iOS spinner), otherwise use the day's time
  const displayStartTime = tempStartTime || startTime;
  const displayEndTime = tempEndTime || endTime;

  // Handler for Start time picker
  const onStartTimeChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || displayStartTime;
    
    // On Android, the picker closes automatically
    if (Platform.OS === 'android') {
      setOpenStartPicker(false);
      if (event.type === 'set' && selectedDate) {
        const newDay = {...day, start: selectedDate};
        onDayChanged(newDay);
      }
      return;
    }
    
    // On iOS, handle spinner mode events
    if (Platform.OS === 'ios') {
      if (event.type === 'set') {
        // User confirmed the time
        const newDay = {...day, start: currentDate};
        onDayChanged(newDay);
        setTempStartTime(null);
        setOpenStartPicker(false);
      } else if (event.type === 'dismissed') {
        // User cancelled
        setTempStartTime(null);
        setOpenStartPicker(false);
      } else if (selectedDate) {
        // For spinner mode, update temp time as user scrolls
        setTempStartTime(selectedDate);
      }
    }
  };

  // Handler for End time picker
  const onEndTimeChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || displayEndTime;
    
    // On Android, the picker closes automatically
    if (Platform.OS === 'android') {
      setOpenEndPicker(false);
      if (event.type === 'set' && selectedDate) {
        const newDay = {...day, end: selectedDate};
        onDayChanged(newDay);
      }
      return;
    }
    
    // On iOS, handle spinner mode events
    if (Platform.OS === 'ios') {
      if (event.type === 'set') {
        // User confirmed the time
        const newDay = {...day, end: currentDate};
        onDayChanged(newDay);
        setTempEndTime(null);
        setOpenEndPicker(false);
      } else if (event.type === 'dismissed') {
        // User cancelled
        setTempEndTime(null);
        setOpenEndPicker(false);
      } else if (selectedDate) {
        // For spinner mode, update temp time as user scrolls
        setTempEndTime(selectedDate);
      }
    }
  };

  return (
    <View style={styles.row} key={`drc_${day.id}`}>
      <View style={styles.col_days}>
        <StyledCheckBox
          label={day.day}
          value={day.checked}
          onPress={() => onDayChanged({...day, checked: !day.checked})}
        />
      </View>
      <View style={styles.col_start}>
        <TouchableOpacity
          style={styles.timeBox}
          onPress={() => {
            setTempStartTime(null);
            setOpenStartPicker(true);
          }}
          disabled={day?.checked != true}>
          <Text style={styles.text}>
            {day.checked ? getFormattedTimeA(day.start) : ''}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.col_end}>
        <TouchableOpacity
          style={styles.timeBox}
          onPress={() => {
            setTempEndTime(null);
            setOpenEndPicker(true);
          }}
          disabled={day?.checked != true}>
          <Text style={styles.text}>
            {day.checked ? getFormattedTimeA(day.end) : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Start Time Picker */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={openStartPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setTempStartTime(null);
            setOpenStartPicker(false);
          }}
        >
          <Pressable 
            style={styles.timePickerModalOverlay}
            onPress={() => {
              setTempStartTime(null);
              setOpenStartPicker(false);
            }}
          >
            <View style={styles.timePickerModalContent}>
              <View style={styles.timePickerModalHeader}>
                <Pressable 
                  onPress={() => {
                    setTempStartTime(null);
                    setOpenStartPicker(false);
                  }}
                >
                  <Text style={styles.timePickerModalCancel}>Cancel</Text>
                </Pressable>
                <Text style={styles.timePickerModalTitle}>Select Start Time</Text>
                <Pressable 
                  onPress={() => {
                    // Save the current display time (temp if set, otherwise original)
                    const timeToSave = tempStartTime || displayStartTime;
                    const newDay = {...day, start: timeToSave};
                    onDayChanged(newDay);
                    setTempStartTime(null);
                    setOpenStartPicker(false);
                  }}
                >
                  <Text style={styles.timePickerModalDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                mode="time"
                display="spinner"
                value={displayStartTime}
                onChange={onStartTimeChange}
              />
            </View>
          </Pressable>
        </Modal>
      ) : (
        openStartPicker && (
          <DateTimePicker
            mode="time"
            display="default"
            value={displayStartTime}
            onChange={onStartTimeChange}
          />
        )
      )}

      {/* End Time Picker */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={openEndPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setTempEndTime(null);
            setOpenEndPicker(false);
          }}
        >
          <Pressable 
            style={styles.timePickerModalOverlay}
            onPress={() => {
              setTempEndTime(null);
              setOpenEndPicker(false);
            }}
          >
            <View style={styles.timePickerModalContent}>
              <View style={styles.timePickerModalHeader}>
                <Pressable 
                  onPress={() => {
                    setTempEndTime(null);
                    setOpenEndPicker(false);
                  }}
                >
                  <Text style={styles.timePickerModalCancel}>Cancel</Text>
                </Pressable>
                <Text style={styles.timePickerModalTitle}>Select End Time</Text>
                <Pressable 
                  onPress={() => {
                    // Save the current display time (temp if set, otherwise original)
                    const timeToSave = tempEndTime || displayEndTime;
                    const newDay = {...day, end: timeToSave};
                    onDayChanged(newDay);
                    setTempEndTime(null);
                    setOpenEndPicker(false);
                  }}
                >
                  <Text style={styles.timePickerModalDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                mode="time"
                display="spinner"
                value={displayEndTime}
                onChange={onEndTimeChange}
              />
            </View>
          </Pressable>
        </Modal>
      ) : (
        openEndPicker && (
          <DateTimePicker
            mode="time"
            display="default"
            value={displayEndTime}
            onChange={onEndTimeChange}
          />
        )
      )}
    </View>
  );
};
