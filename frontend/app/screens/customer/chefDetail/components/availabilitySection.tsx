import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import moment from 'moment';
import { IChefProfile } from '../../../../types/index';
import { GetAvailableTimeslotsAPI } from '../../../../services/api';
import { AppColors, Shadows, Spacing } from '../../../../../constants/theme';
import { StyleSheet } from 'react-native';

interface Props {
  chefId: number;
  initialDate: string; // "YYYY-MM-DD" from home screen
  chefProfile?: IChefProfile;
  selectedTime: string | null; // "HH:MM" or null
  onTimeSelect: (time: string | null, date: string) => void;
}

const hasValidTime = (value: string | number | undefined): boolean => {
  if (!value) return false;
  if (value === '' || value === '0' || value === 0) return false;
  if (typeof value === 'string' && value.includes(':')) return true;
  if (typeof value === 'number' && value > 86400) return true;
  if (typeof value === 'string' && /^\d{9,}$/.test(value)) return true;
  return false;
};

const getChefWorkingDays = (profile?: IChefProfile): number[] => {
  if (!profile) return [];
  const days: number[] = [];
  if (hasValidTime(profile.sunday_start)) days.push(0);
  if (hasValidTime(profile.monday_start)) days.push(1);
  if (hasValidTime(profile.tuesday_start)) days.push(2);
  if (hasValidTime(profile.wednesday_start)) days.push(3);
  if (hasValidTime(profile.thursday_start)) days.push(4);
  if (hasValidTime(profile.friday_start)) days.push(5);
  if (hasValidTime(profile.saterday_start)) days.push(6);
  return days;
};

const AvailabilitySection: React.FC<Props> = ({
  chefId,
  initialDate,
  chefProfile,
  selectedTime,
  onTimeSelect,
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [timeslots, setTimeslots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const requestRef = useRef<string | null>(null);

  const workingDays = getChefWorkingDays(chefProfile);

  // Generate date pills: today + next 6 days
  const datePills = Array.from({ length: 7 }, (_, i) => {
    const date = moment().add(i, 'days');
    return {
      dateStr: date.format('YYYY-MM-DD'),
      dayName: i === 0 ? 'Today' : date.format('ddd'),
      dayNum: date.format('D'),
      weekday: date.weekday(),
    };
  });

  useEffect(() => {
    fetchTimeslots(selectedDate);
  }, [selectedDate]);

  const fetchTimeslots = async (date: string) => {
    if (!chefId) {
      setTimeslots([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const requestId = `${chefId}-${date}-${Date.now()}`;
    requestRef.current = requestId;

    try {
      const resp = await GetAvailableTimeslotsAPI(chefId, date);
      if (requestRef.current !== requestId) return;

      if (resp.success === 1 && resp.data) {
        setTimeslots(resp.data);
      } else {
        setTimeslots([]);
      }
    } catch {
      if (requestRef.current === requestId) {
        setTimeslots([]);
      }
    } finally {
      if (requestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  const handleDatePress = (dateStr: string) => {
    setSelectedDate(dateStr);
    onTimeSelect(null, dateStr); // Clear time selection on date change
  };

  const handleTimePress = (time: string) => {
    if (selectedTime === time) {
      onTimeSelect(null, selectedDate); // Deselect
    } else {
      onTimeSelect(time, selectedDate);
    }
  };

  const formatTimeLabel = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return moment().hour(hours).minute(minutes).format('h:mm a');
  };

  const isChefWorkingDay = (weekday: number): boolean => {
    return workingDays.length === 0 || workingDays.includes(weekday);
  };

  return (
    <View style={s.container}>
      <Text style={s.heading}>Availability</Text>

      {/* Date pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.datePillRow}
      >
        {datePills.map((pill) => {
          const isSelected = pill.dateStr === selectedDate;
          const isWorking = isChefWorkingDay(pill.weekday);
          return (
            <TouchableOpacity
              key={pill.dateStr}
              style={[
                s.datePill,
                isSelected && s.datePillSelected,
                !isWorking && s.datePillDisabled,
              ]}
              onPress={() => handleDatePress(pill.dateStr)}
              disabled={!isWorking}
            >
              <Text
                style={[
                  s.datePillDay,
                  isSelected && s.datePillTextSelected,
                  !isWorking && s.datePillTextDisabled,
                ]}
              >
                {pill.dayName}
              </Text>
              <Text
                style={[
                  s.datePillNum,
                  isSelected && s.datePillTextSelected,
                  !isWorking && s.datePillTextDisabled,
                ]}
              >
                {pill.dayNum}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Time slots */}
      {isLoading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator size="small" color={AppColors.primary} />
          <Text style={s.loadingText}>Loading times...</Text>
        </View>
      ) : timeslots.length === 0 ? (
        <Text style={s.emptyText}>No times available for this date</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.timePillRow}
        >
          {timeslots.map((time) => {
            const isSelected = selectedTime === time;
            return (
              <TouchableOpacity
                key={time}
                style={[s.timePill, isSelected && s.timePillSelected]}
                onPress={() => handleTimePress(time)}
              >
                <Text
                  style={[
                    s.timePillText,
                    isSelected && s.timePillTextSelected,
                  ]}
                >
                  {formatTimeLabel(time)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: Spacing.sm,
  },
  datePillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: Spacing.xs,
  },
  datePill: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
    minWidth: 56,
  },
  datePillSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  datePillDisabled: {
    opacity: 0.35,
  },
  datePillDay: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  datePillNum: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
    marginTop: 2,
  },
  datePillTextSelected: {
    color: AppColors.textOnPrimary,
  },
  datePillTextDisabled: {
    color: AppColors.disabledText,
  },
  timePillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
  },
  timePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AppColors.background,
    ...Shadows.xs,
  },
  timePillSelected: {
    backgroundColor: AppColors.primary,
  },
  timePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
  },
  timePillTextSelected: {
    color: AppColors.textOnPrimary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
});

export default AvailabilitySection;
