import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SetAvailabilityOverrideAPI, GetAvailabilityOverridesAPI } from '../../services/api';
import { ShowErrorToast, ShowSuccessToast } from '../../utils/toast';
import { styles } from './styles';

// Use a fixed future date to avoid iOS date constraints
// iOS UIDatePicker in time mode still respects the date portion and
// disables times it considers "in the past" relative to current moment.
// Using a far-future date ensures ALL times are always selectable.
const PICKER_BASE_DATE = new Date(2030, 0, 15, 12, 0, 0, 0); // Jan 15, 2030 noon

const getPickerBaseDate = () => {
  return new Date(PICKER_BASE_DATE);
};

const GoLiveToggle: React.FC = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [onlineUntil, setOnlineUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date | null>(null);

  // Confirmation modal state (for going offline)
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Default end time: 3 hours from now, but using fixed future date for picker
  const getDefaultEndTime = () => {
    const threeHoursFromNow = moment().add(3, 'hours');
    const result = getPickerBaseDate();
    result.setHours(threeHoursFromNow.hours(), threeHoursFromNow.minutes(), 0, 0);
    return result;
  };

  const displayTime = tempTime || getDefaultEndTime();

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
          const now = moment();
          const endTime = moment(todayOverride.end_time, 'HH:mm');

          if (now.isBefore(endTime)) {
            setIsOnline(true);
            setOnlineUntil(todayOverride.end_time);
          } else {
            // Override has expired
            setIsOnline(false);
            setOnlineUntil(null);
          }
        } else {
          setIsOnline(false);
          setOnlineUntil(null);
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

  // Handle toggle press
  const handleTogglePress = () => {
    if (isOnline) {
      // Currently online - show confirmation to go offline
      setShowConfirmModal(true);
    } else {
      // Currently offline - show time picker to go online
      setTempTime(null);
      setShowTimePicker(true);
    }
  };

  // Go online with selected end time
  const handleGoOnline = async (endTime: Date) => {
    setLoading(true);
    try {
      const now = moment();
      let endMoment = moment(endTime);

      // Determine override date (today or tomorrow if time rolled over)
      let overrideDate = now.format('YYYY-MM-DD');

      // If selected time is in the past, roll to tomorrow
      if (endMoment.isSameOrBefore(now)) {
        console.log('GoLive - time was in past, rolling to tomorrow');
        endMoment.add(1, 'day');
        overrideDate = endMoment.format('YYYY-MM-DD');
      }

      console.log('GoLive - Creating override for:', overrideDate, 'until:', endMoment.format('HH:mm'));

      const response = await SetAvailabilityOverrideAPI({
        override_date: overrideDate,
        start_time: now.format('HH:mm'),
        end_time: endMoment.format('HH:mm'),
        status: 'confirmed',
        source: 'manual_toggle',
      });

      if (response.success === 1) {
        setIsOnline(true);
        setOnlineUntil(endMoment.format('HH:mm'));
        ShowSuccessToast('You are now live!');
      } else {
        ShowErrorToast(response.error || 'Failed to go online');
      }
    } catch (error) {
      console.error('Error going online:', error);
      ShowErrorToast('Failed to go online');
    } finally {
      setLoading(false);
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
        setOnlineUntil(null);
        ShowSuccessToast('You are now offline');
      } else {
        ShowErrorToast(response.error || 'Failed to go offline');
      }
    } catch (error) {
      console.error('Error going offline:', error);
      ShowErrorToast('Failed to go offline');
    } finally {
      setLoading(false);
    }
  };

  // Time picker change handler (follows dayRowComponent pattern exactly)
  const onTimeChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || displayTime;

    // On Android, the picker closes automatically
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && selectedDate) {
        handleGoOnline(selectedDate);
      }
      return;
    }

    // On iOS, handle spinner mode events
    if (Platform.OS === 'ios') {
      if (event.type === 'set') {
        // User confirmed the time
        handleGoOnline(currentDate);
        setTempTime(null);
        setShowTimePicker(false);
      } else if (event.type === 'dismissed') {
        // User cancelled
        setTempTime(null);
        setShowTimePicker(false);
      } else if (selectedDate) {
        // For spinner mode, update temp time as user scrolls
        setTempTime(selectedDate);
      }
    }
  };

  // Cancel time picker
  const handleCancelTimePicker = () => {
    setTempTime(null);
    setShowTimePicker(false);
  };

  // Confirm time picker (iOS Done button)
  const handleConfirmTimePicker = () => {
    const timeToSave = tempTime || displayTime;
    handleGoOnline(timeToSave);
    setTempTime(null);
    setShowTimePicker(false);
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

      {/* Time Picker Modal - follows dayRowComponent pattern exactly */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showTimePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancelTimePicker}
        >
          <Pressable
            style={styles.timePickerModalOverlay}
            onPress={handleCancelTimePicker}
          >
            <View
              style={styles.timePickerModalContent}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.timePickerModalHeader}>
                <Pressable onPress={handleCancelTimePicker}>
                  <Text style={styles.timePickerModalCancel}>Cancel</Text>
                </Pressable>
                <Text style={styles.timePickerModalTitle}>Available Until</Text>
                <Pressable onPress={handleConfirmTimePicker}>
                  <Text style={styles.timePickerModalDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                mode="time"
                display="spinner"
                value={displayTime}
                onChange={onTimeChange}
              />
            </View>
          </Pressable>
        </Modal>
      ) : (
        showTimePicker && (
          <DateTimePicker
            mode="time"
            display="default"
            value={displayTime}
            onChange={onTimeChange}
          />
        )
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
              You will stop appearing as available to customers.
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
