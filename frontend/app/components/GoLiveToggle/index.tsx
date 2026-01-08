import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SetAvailabilityOverrideAPI, GetAvailabilityOverridesAPI } from '../../services/api';
import { ShowErrorToast, ShowSuccessToast } from '../../utils/toast';
import { styles } from './styles';
import { RootState } from '../../store';

// Use a fixed future date to avoid iOS date constraints
// iOS UIDatePicker in time mode still respects the date portion and
// disables times it considers "in the past" relative to current moment.
// Using a far-future date ensures ALL times are always selectable.
// IMPORTANT: Use Date.UTC to create noon UTC - this ensures the picker works
// correctly regardless of the device's timezone.
const PICKER_BASE_DATE = new Date(Date.UTC(2030, 0, 15, 12, 0, 0, 0)); // Jan 15, 2030 noon UTC

const getPickerBaseDate = () => {
  return new Date(PICKER_BASE_DATE.getTime());
};

// Day name mapping for weekly schedule lookup
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saterday'] as const;

// Get device timezone (IANA format, e.g., 'America/Chicago')
const getDeviceTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Chicago'; // Fallback
  }
};

// Helper to parse time value from chef profile (can be HH:MM string or timestamp)
const parseTimeValue = (value: string | number | undefined): { hours: number; minutes: number } | null => {
  if (!value || value === '' || value === 0) return null;

  if (typeof value === 'string') {
    const [hours, minutes] = value.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return { hours, minutes };
    }
  } else if (typeof value === 'number') {
    // Legacy timestamp format
    const date = new Date(value * 1000);
    return { hours: date.getHours(), minutes: date.getMinutes() };
  }
  return null;
};

const GoLiveToggle: React.FC = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);

  // Day selection state (Today vs Tomorrow)
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow' | null>(null);

  // Time confirmation state
  const [showTimeConfirm, setShowTimeConfirm] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);

  // Time picker state (for editing start or end time)
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingTime, setEditingTime] = useState<'start' | 'end' | null>(null);
  const [tempTime, setTempTime] = useState<Date | null>(null);

  // Confirmation modal state (for going offline)
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Get chef profile from Redux for weekly schedule
  const chefProfile = useSelector((state: RootState) => state.chef.profile);

  // Helper function to reset all go-live related state
  // Used to ensure consistent cleanup across all exit paths
  const resetGoLiveState = () => {
    setSelectedDay(null);
    setStartTime(null);
    setEndTime(null);
    setShowTimeConfirm(false);
    setShowDayPicker(false);
    setShowTimePicker(false);
    setEditingTime(null);
    setTempTime(null);
  };

  // Get weekly schedule for a specific day
  const getScheduleForDay = (day: 'today' | 'tomorrow') => {
    const targetDate = day === 'today' ? moment() : moment().add(1, 'day');
    const dayIndex = targetDate.day(); // 0 = Sunday, 1 = Monday, etc.
    const dayName = DAY_NAMES[dayIndex];

    // Handle typo in database: "saterday" instead of "saturday"
    const startKey = `${dayName}_start` as keyof typeof chefProfile;
    const endKey = `${dayName}_end` as keyof typeof chefProfile;

    const startValue = chefProfile?.[startKey];
    const endValue = chefProfile?.[endKey];

    const start = parseTimeValue(startValue as string | number | undefined);
    const end = parseTimeValue(endValue as string | number | undefined);

    return { start, end, dayName: targetDate.format('dddd') };
  };

  // Fetch status on mount and when screen focuses
  const fetchStatus = async () => {
    try {
      const today = moment().format('YYYY-MM-DD');
      const response = await GetAvailabilityOverridesAPI({
        start_date: today,
        end_date: today,
      });

      if (response.success === 1) {
        // Find today's override that is not cancelled
        const todayOverride = response.data?.find(
          (o: any) => o.override_date === today && o.status !== 'cancelled'
        );

        if (todayOverride && todayOverride.end_time) {
          // Check if current time is still within the override window
          // Times are stored in HH:mm format in the user's local timezone
          const now = moment();
          // Parse end_time as today's date with that time (in local timezone)
          const endTimeMoment = moment(`${today} ${todayOverride.end_time}`, 'YYYY-MM-DD HH:mm');

          if (now.isBefore(endTimeMoment)) {
            setIsOnline(true);
          } else {
            // Override has expired
            setIsOnline(false);
          }
        } else {
          setIsOnline(false);
        }
      }
    } catch (error) {
      console.error('Error fetching availability status:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
    }, [])
  );

  // Handle toggle press - show day picker first
  const handleTogglePress = () => {
    if (isOnline) {
      // Currently online - show confirmation to go offline
      setShowConfirmModal(true);
    } else {
      // Currently offline - show day picker first
      setShowDayPicker(true);
    }
  };

  // Handle day selection
  const handleDaySelect = (day: 'today' | 'tomorrow') => {
    setSelectedDay(day);
    setShowDayPicker(false);

    // Get schedule for selected day and pre-fill times
    const schedule = getScheduleForDay(day);

    const baseDate = getPickerBaseDate();

    if (schedule.start && schedule.end) {
      // Pre-fill with weekly schedule times
      const startDate = new Date(baseDate.getTime());
      startDate.setHours(schedule.start.hours, schedule.start.minutes, 0, 0);

      const endDate = new Date(baseDate.getTime());
      endDate.setHours(schedule.end.hours, schedule.end.minutes, 0, 0);

      setStartTime(startDate);
      setEndTime(endDate);
    } else {
      // No weekly schedule - use defaults
      const now = moment();

      // For today, start from now; for tomorrow, default to 9 AM
      const defaultStartDate = new Date(baseDate.getTime());
      if (day === 'today') {
        defaultStartDate.setHours(now.hours(), now.minutes(), 0, 0);
      } else {
        defaultStartDate.setHours(9, 0, 0, 0);
      }

      // Default end time: 3 hours after start
      const defaultEndDate = new Date(baseDate.getTime());
      if (day === 'today') {
        const threeHoursFromNow = moment().add(3, 'hours');
        defaultEndDate.setHours(threeHoursFromNow.hours(), threeHoursFromNow.minutes(), 0, 0);
      } else {
        defaultEndDate.setHours(12, 0, 0, 0);
      }

      setStartTime(defaultStartDate);
      setEndTime(defaultEndDate);
    }

    // Show time confirmation screen
    setShowTimeConfirm(true);
  };

  // Handle time tap to edit
  const handleTimePress = (which: 'start' | 'end') => {
    setEditingTime(which);
    setTempTime(which === 'start' ? startTime : endTime);
    setShowTimePicker(true);
  };

  // Auto-adjust times to maintain valid start < end relationship
  // Matches behavior from weekly availability (chef profile screen)
  const applyTimeWithAutoAdjust = (newTime: Date, type: 'start' | 'end') => {
    let newStart = type === 'start' ? newTime : startTime;
    let newEnd = type === 'end' ? newTime : endTime;

    if (newStart && newEnd) {
      const startMinutes = newStart.getHours() * 60 + newStart.getMinutes();
      const endMinutes = newEnd.getHours() * 60 + newEnd.getMinutes();

      if (startMinutes >= endMinutes) {
        const baseDate = getPickerBaseDate();
        if (type === 'start') {
          // User changed start time to be >= end, push end forward by 1 hour
          const newEndDate = new Date(baseDate.getTime());
          newEndDate.setHours(newStart.getHours() + 1, newStart.getMinutes(), 0, 0);
          newEnd = newEndDate;
        } else {
          // User changed end time to be <= start, pull start backward by 1 hour
          const newStartDate = new Date(baseDate.getTime());
          newStartDate.setHours(newEnd.getHours() - 1, newEnd.getMinutes(), 0, 0);
          newStart = newStartDate;
        }
      }
    }

    setStartTime(newStart);
    setEndTime(newEnd);
  };

  // Time picker change handler
  const onTimeChange = (event: any, selectedDate?: Date) => {
    // On Android, the picker closes automatically
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && selectedDate && editingTime) {
        applyTimeWithAutoAdjust(selectedDate, editingTime);
      }
      setEditingTime(null);
      return;
    }

    // On iOS with spinner mode, just update temp time as user scrolls
    if (Platform.OS === 'ios') {
      if (event.type === 'dismissed') {
        setTempTime(null);
        setShowTimePicker(false);
        setEditingTime(null);
      } else if (selectedDate) {
        setTempTime(selectedDate);
      }
    }
  };

  // Cancel time picker
  const handleCancelTimePicker = () => {
    setTempTime(null);
    setShowTimePicker(false);
    setEditingTime(null);
  };

  // Confirm time picker (iOS Done button)
  const handleConfirmTimePicker = () => {
    if (tempTime && editingTime) {
      applyTimeWithAutoAdjust(tempTime, editingTime);
    }
    setTempTime(null);
    setShowTimePicker(false);
    setEditingTime(null);
  };

  // Cancel entire flow
  const handleCancelFlow = () => {
    resetGoLiveState();
  };

  // Confirm and go live
  const handleConfirmGoLive = async () => {
    if (!selectedDay || !startTime || !endTime) return;

    setLoading(true);
    // Don't close modal yet - wait for API response

    try {
      const overrideDate = selectedDay === 'today'
        ? moment().format('YYYY-MM-DD')
        : moment().add(1, 'day').format('YYYY-MM-DD');

      const startTimeStr = moment(startTime).format('HH:mm');
      const endTimeStr = moment(endTime).format('HH:mm');

      console.log('GoLive - Creating override for:', overrideDate, 'from:', startTimeStr, 'to:', endTimeStr);

      const response = await SetAvailabilityOverrideAPI({
        override_date: overrideDate,
        start_time: startTimeStr,
        end_time: endTimeStr,
        status: 'confirmed',
        source: 'manual_toggle',
        timezone: getDeviceTimezone(),
      });

      if (response.success === 1) {
        // Only show as "Live" if this is for today
        if (selectedDay === 'today') {
          setIsOnline(true);
        }
        const dayLabel = selectedDay === 'today' ? 'today' : 'tomorrow';
        ShowSuccessToast(`You're set to be live ${dayLabel}!`);

        // Success - close modal and reset all state
        resetGoLiveState();
      } else {
        // Failure - keep modal open so user can retry
        ShowErrorToast(response.error || 'Failed to go online');
      }
    } catch (error) {
      // Error - keep modal open so user can retry
      console.error('Error going online:', error);
      ShowErrorToast('Failed to go online');
    } finally {
      setLoading(false);
      // Don't clear state in finally - only clear on success
    }
  };

  // Go offline
  const handleGoOffline = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      const today = moment().format('YYYY-MM-DD');

      const response = await SetAvailabilityOverrideAPI({
        override_date: today,
        status: 'cancelled',
        source: 'manual_toggle',
      });

      if (response.success === 1) {
        setIsOnline(false);
        ShowSuccessToast('You are now offline');
      } else {
        ShowErrorToast(response.error || 'Failed to go offline');
      }
    } catch (error) {
      console.error('Error going offline:', error);
      ShowErrorToast('Failed to go offline');
    } finally {
      setLoading(false);
      // Always reset go-live state to prevent stale data on next toggle
      resetGoLiveState();
    }
  };

  // Format time for display
  const formatDisplayTime = (date: Date | null) => {
    if (!date) return '--:--';
    return moment(date).format('h:mm A');
  };

  // Get display time for picker
  const getPickerDisplayTime = () => {
    if (tempTime) return tempTime;
    if (editingTime === 'start' && startTime) return startTime;
    if (editingTime === 'end' && endTime) return endTime;
    return getPickerBaseDate();
  };

  return (
    <>
      {/* Toggle Button */}
      <TouchableOpacity
        onPress={handleTogglePress}
        disabled={loading}
        style={[
          styles.container,
          isOnline ? styles.containerLive : styles.containerOffline,
        ]}
      >
        <View
          style={[
            styles.statusDot,
            isOnline ? styles.statusDotLive : styles.statusDotOffline,
          ]}
        />
        <Text
          style={[
            styles.statusText,
            isOnline ? styles.statusTextLive : styles.statusTextOffline,
          ]}
        >
          {isOnline ? 'Live' : 'Off'}
        </Text>
      </TouchableOpacity>

      {/* Day Picker Modal (Today vs Tomorrow) */}
      <Modal
        visible={showDayPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDayPicker(false)}
      >
        <Pressable
          style={styles.confirmModalOverlay}
          onPress={() => setShowDayPicker(false)}
        >
          <View
            style={styles.dayPickerContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.confirmTitle}>Check in for same-day orders</Text>
            <Text style={styles.dayPickerSubtitle}>
              Future orders still come through your weekly schedule.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.dayButton]}
                onPress={() => handleDaySelect('today')}
              >
                <Text style={[styles.confirmButtonText, styles.dayButtonText]}>
                  Today
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.dayButton]}
                onPress={() => handleDaySelect('tomorrow')}
              >
                <Text style={[styles.confirmButtonText, styles.dayButtonText]}>
                  Tomorrow
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Time Confirmation Modal */}
      <Modal
        visible={showTimeConfirm}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelFlow}
      >
        <Pressable
          style={styles.timePickerModalOverlay}
          onPress={showTimePicker ? handleCancelTimePicker : handleCancelFlow}
        >
          <View
            style={styles.timeConfirmContent}
            onStartShouldSetResponder={() => true}
            onResponderRelease={(e) => e.stopPropagation()}
          >
            {/* Show time picker inline on iOS, or show time selection UI */}
            {showTimePicker && Platform.OS === 'ios' ? (
              <>
                <View style={styles.timePickerModalHeader}>
                  <TouchableOpacity onPress={handleCancelTimePicker}>
                    <Text style={styles.timePickerModalCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.timePickerModalTitle}>
                    {editingTime === 'start' ? 'Start Time' : 'End Time'}
                  </Text>
                  <TouchableOpacity onPress={handleConfirmTimePicker}>
                    <Text style={styles.timePickerModalDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  mode="time"
                  display="spinner"
                  value={getPickerDisplayTime()}
                  minimumDate={new Date(2030, 0, 15, 0, 0, 0)}
                  maximumDate={new Date(2030, 0, 15, 23, 59, 59)}
                  onChange={onTimeChange}
                />
              </>
            ) : (
              <>
                <View style={styles.timePickerModalHeader}>
                  <TouchableOpacity onPress={handleCancelFlow} disabled={loading}>
                    <Text style={[styles.timePickerModalCancel, loading && styles.disabledText]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.timePickerModalTitle}>
                    {selectedDay === 'today' ? "Today's" : "Tomorrow's"} Hours
                  </Text>
                  <TouchableOpacity onPress={handleConfirmGoLive} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator size="small" color="#C75B12" />
                    ) : (
                      <Text style={styles.timePickerModalDone}>Confirm</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.timeRow}>
                  <TouchableOpacity
                    style={styles.timeBlock}
                    onPress={() => handleTimePress('start')}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.timeLabel}>Start</Text>
                    <Text style={styles.timeValue}>{formatDisplayTime(startTime)}</Text>
                  </TouchableOpacity>

                  <Text style={styles.timeSeparator}>to</Text>

                  <TouchableOpacity
                    style={styles.timeBlock}
                    onPress={() => handleTimePress('end')}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.timeLabel}>End</Text>
                    <Text style={styles.timeValue}>{formatDisplayTime(endTime)}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.timeHint}>Tap times to adjust</Text>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Android Time Picker - rendered outside modal */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          mode="time"
          display="default"
          value={getPickerDisplayTime()}
          minimumDate={new Date(2030, 0, 15, 0, 0, 0)}
          maximumDate={new Date(2030, 0, 15, 23, 59, 59)}
          onChange={onTimeChange}
        />
      )}

      {/* Confirmation Modal for going offline */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <Pressable
          style={styles.confirmModalOverlay}
          onPress={() => setShowConfirmModal(false)}
        >
          <View
            style={styles.confirmModalContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.confirmTitle}>Go Offline?</Text>
            <Text style={styles.confirmMessage}>
              You will stop appearing as available to customers for the rest of today.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonCancel]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={[styles.confirmButtonText, styles.confirmButtonTextCancel]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonConfirm]}
                onPress={handleGoOffline}
              >
                <Text style={[styles.confirmButtonText, styles.confirmButtonTextConfirm]}>
                  Go Offline
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export default GoLiveToggle;
