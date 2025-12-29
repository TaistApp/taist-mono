import moment from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CustomCalendarProps {
  selectedDate: moment.Moment;
  onDateSelect: (date: moment.Moment) => void;
  minDate: moment.Moment;
  maxDate: moment.Moment;
  datesWhitelist?: (date: moment.Moment) => boolean;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  selectedDate,
  onDateSelect,
  minDate,
  maxDate,
  datesWhitelist,
}) => {
  // Track which week is being VIEWED (separate from selected date)
  // This allows browsing weeks without triggering a search
  const [viewedWeekStart, setViewedWeekStart] = useState(() =>
    selectedDate.clone().startOf('week')
  );

  // Sync viewed week when selectedDate changes from outside (e.g., tapping a day)
  useEffect(() => {
    const selectedWeekStart = selectedDate.clone().startOf('week');
    if (!selectedWeekStart.isSame(viewedWeekStart, 'day')) {
      setViewedWeekStart(selectedWeekStart);
    }
  }, [selectedDate]);

  // Generate week dates for the VIEWED week (not selected date)
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(viewedWeekStart.clone().add(i, 'days'));
    }
    return dates;
  }, [viewedWeekStart]);

  // Get month/year display text based on VIEWED week
  const monthYearText = useMemo(() => {
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];

    if (weekStart.month() !== weekEnd.month()) {
      return `${weekStart.format('MMMM')} / ${weekEnd.format('MMMM YYYY')}`;
    }
    return weekStart.format('MMMM YYYY');
  }, [weekDates]);

  const handleDayPress = (date: moment.Moment) => {
    if (isDateSelectable(date)) {
      onDateSelect(date);
    }
  };

  // Navigate week only changes the VIEW, does NOT trigger search
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = viewedWeekStart.clone().add(direction === 'next' ? 7 : -7, 'days');
    const newWeekEnd = newWeekStart.clone().add(6, 'days');

    // Allow navigation if ANY day in the new week is within bounds
    if (newWeekEnd.isSameOrAfter(minDate, 'day') && newWeekStart.isSameOrBefore(maxDate, 'day')) {
      setViewedWeekStart(newWeekStart);
    }
  };

  const isDateSelectable = (date: moment.Moment) => {
    const inRange = date.isBetween(minDate, maxDate, 'day', '[]');
    const whitelisted = datesWhitelist ? datesWhitelist(date) : true;
    return inRange && whitelisted;
  };

  const isDateSelected = (date: moment.Moment) => {
    return date.isSame(selectedDate, 'day');
  };

  const handleTodayPress = () => {
    const today = moment();
    if (isDateSelectable(today)) {
      onDateSelect(today);
      // Also navigate view to today's week
      setViewedWeekStart(today.clone().startOf('week'));
    }
  };

  // Show "Today" button if viewing a different week OR a different day is selected
  const today = moment();
  const todayWeekStart = today.clone().startOf('week');
  const isViewingTodayWeek = viewedWeekStart.isSame(todayWeekStart, 'day');
  const isTodaySelected = today.isSame(selectedDate, 'day');
  const showTodayButton = !isViewingTodayWeek || !isTodaySelected;

  return (
    <View style={styles.container}>
      {/* Month/Year Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigateWeek('prev')}
        >
          <Text style={styles.navButtonText}>{'<'}</Text>
        </TouchableOpacity>
        
        <View style={styles.centerContent}>
          <Text style={styles.monthYearText}>{monthYearText}</Text>
          {showTodayButton && (
            <TouchableOpacity
              style={styles.todayButton}
              onPress={handleTodayPress}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigateWeek('next')}
        >
          <Text style={styles.navButtonText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* Week Strip */}
      <View style={styles.weekContainer}>
          {weekDates.map((date, index) => {
            const isSelected = isDateSelected(date);
            const isSelectable = isDateSelectable(date);
            const dayName = date.format('ddd').toUpperCase();
            const dayNumber = date.format('D');

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayContainer,
                  isSelected && styles.selectedDayContainer,
                  !isSelectable && styles.disabledDayContainer,
                ]}
                onPress={() => handleDayPress(date)}
                disabled={!isSelectable}
              >
                <Text style={[
                  styles.dayName,
                  isSelected && styles.selectedDayName,
                  !isSelectable && styles.disabledText,
                ]}>
                  {dayName}
                </Text>
                <Text style={[
                  styles.dayNumber,
                  isSelected && styles.selectedDayNumber,
                  !isSelectable && styles.disabledText,
                ]}>
                  {dayNumber}
                </Text>
              </TouchableOpacity>
            );
          })}
      </View>
    </View>
  );
};

// Exact same styles as home screen calendar
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  centerContent: {
    alignItems: 'center',
    gap: 6,
  },
  monthYearText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  todayButton: {
    backgroundColor: '#fa4616',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    color: '#fa4616',
    fontSize: 20,
    fontWeight: 'bold',
  },
  weekContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    justifyContent: 'space-between',
    width: '100%',
  },
  dayContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    minWidth: 48,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  selectedDayContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fa4616',
  },
  disabledDayContainer: {
    opacity: 0.4,
  },
  dayName: {
    color: '#666666',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedDayName: {
    color: '#fa4616',
  },
  dayNumber: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectedDayNumber: {
    color: '#fa4616',
  },
  disabledText: {
    color: '#cccccc',
  },
});

export default CustomCalendar;
