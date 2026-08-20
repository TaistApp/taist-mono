import { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleDown, faClose, faSearch } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment-timezone';
import { SelectList } from 'react-native-dropdown-select-list';

import StyledButton from '../../../components/styledButton';
import StyledTextInput from '../../../components/styledTextInput';
import Container from '../../../layout/Container';
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { CancelPoolRequestAPI, CreatePoolRequestAPI, GetMyPoolRequestsAPI } from '../../../services/api';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';
import { navigate } from '../../../utils/navigation';
import CustomCalendar from '../../chef/orders/components/customCalendar';
import { styles } from './styles';

const STATUS_LABELS: Record<string, string> = {
  open: 'Waiting for a chef…',
  claimed: 'Chef accepted! 🎉',
  expired: 'No chef this time',
  cancelled: 'Cancelled',
};

/**
 * Uber-style dish request: pick a category, portions, and time; every
 * eligible chef gets the request and the first to accept cooks it at their
 * own menu price.
 */
const RequestDish = () => {
  const dispatch = useAppDispatch();
  const categories = useAppSelector(x => x.table.categories);

  const [myRequests, setMyRequests] = useState<Array<any>>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [portions, setPortions] = useState(1);
  const [DAY, onChangeDay] = useState(moment().add(1, 'day'));
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categoryData = useMemo(
    () =>
      (categories ?? [])
        .filter((c: any) => c.status == 2)
        .map((c: any) => ({ key: `${c.id}`, value: c.name })),
    [categories],
  );

  // Half-hour slots, lunch through dinner
  const timeData = useMemo(() => {
    const slots: Array<{ key: string; value: string }> = [];
    for (let h = 8; h <= 20; h++) {
      for (const m of [0, 30]) {
        const hhmm = `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
        slots.push({ key: hhmm, value: moment(hhmm, 'HH:mm').format('h:mm A') });
      }
    }
    return slots;
  }, []);

  const loadMyRequests = async () => {
    const resp = await GetMyPoolRequestsAPI();
    if (resp.success == 1) {
      setMyRequests(resp.data ?? []);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMyRequests();
    }, []),
  );

  const handleCancelRequest = async (poolRequestId: number) => {
    const resp = await CancelPoolRequestAPI({ pool_request_id: poolRequestId });
    if (resp.success == 1) {
      ShowSuccessToast('Request cancelled');
    } else {
      ShowErrorToast(resp.error ?? 'Could not cancel this request');
    }
    loadMyRequests();
  };

  const handleSubmit = async () => {
    if (!categoryId) {
      ShowErrorToast('Pick a cuisine or dish category first');
      return;
    }
    if (!timeSlot) {
      ShowErrorToast('Pick a time for your order');
      return;
    }

    const tz = moment.tz.guess();
    const when = moment.tz(`${DAY.format('YYYY-MM-DD')} ${timeSlot}`, 'YYYY-MM-DD HH:mm', tz);
    if (when.isBefore(moment().add(2, 'hours'))) {
      ShowErrorToast('Requests need at least 2 hours of lead time');
      return;
    }

    setSubmitting(true);
    dispatch(showLoading());
    const resp = await CreatePoolRequestAPI({
      category_id: categoryId,
      portions,
      notes: notes || undefined,
      request_date: when.format('YYYY-MM-DD'),
      request_time: when.format('HH:mm'),
      request_timestamp: when.unix(),
      timezone: tz,
    });
    dispatch(hideLoading());
    setSubmitting(false);

    if (resp.success == 1) {
      const min = resp.data?.request?.price_min;
      const max = resp.data?.request?.price_max;
      const range = min && max && min !== max
        ? `$${Number(min).toFixed(0)}–$${Number(max).toFixed(0)}`
        : `$${Number(min ?? 0).toFixed(0)}`;
      ShowSuccessToast(
        `Request sent to ${resp.data?.chef_count} chef${resp.data?.chef_count === 1 ? '' : 's'}! Price will be ${range} depending on who accepts.`,
      );
      setNotes('');
      loadMyRequests();
    } else {
      ShowErrorToast(resp.error ?? 'Could not send your request');
    }
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container backMode title="Request a Dish">
        <ScrollView contentContainerStyle={styles.pageView} keyboardShouldPersistTaps="handled">
          <Text style={styles.subtitle}>
            Tell us what you're craving — every chef who makes it gets your
            request, and the first to accept cooks for you at their menu
            price.
          </Text>

          {myRequests.length > 0 && (
            <View style={styles.myRequests}>
              {myRequests.slice(0, 3).map(r => (
                <TouchableOpacity
                  key={`myreq_${r.id}`}
                  style={styles.myRequestRow}
                  disabled={!r.order_id}
                  onPress={() => r.order_id && navigate.toCustomer.orders()}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.myRequestTitle}>
                      {`${r.category_name} × ${r.portions} — ${moment(r.request_timestamp * 1000).format('MMM D, h:mm A')}`}
                    </Text>
                    <Text style={[styles.myRequestStatus, r.status === 'claimed' && { color: '#2e7d32' }]}>
                      {STATUS_LABELS[r.status] ?? r.status}
                      {r.status === 'claimed' && r.chef_first_name ? ` Chef ${r.chef_first_name} is cooking.` : ''}
                    </Text>
                  </View>
                  {r.status === 'open' && (
                    <TouchableOpacity
                      testID={`requestDish.cancel.${r.id}`}
                      style={styles.cancelBtn}
                      onPress={() => handleCancelRequest(r.id)}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>What are you craving?</Text>
          <SelectList
            setSelected={(key: string) => setCategoryId(parseInt(key, 10))}
            data={categoryData}
            save={'key'}
            placeholder="Select a cuisine or dish type"
            searchPlaceholder="Search"
            boxStyles={styles.dropdownBox}
            inputStyles={styles.dropdownInput}
            dropdownStyles={styles.dropdown}
            dropdownTextStyles={styles.dropdownText}
            arrowicon={<FontAwesomeIcon icon={faAngleDown} size={20} color="#666666" />}
            searchicon={<FontAwesomeIcon icon={faSearch} size={15} color="#666666" />}
            closeicon={<FontAwesomeIcon icon={faClose} size={15} color="#666666" />}
          />

          <Text style={styles.label}>How many portions?</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              testID="requestDish.minusPortion"
              style={styles.stepperBtn}
              onPress={() => setPortions(Math.max(1, portions - 1))}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{portions}</Text>
            <TouchableOpacity
              testID="requestDish.plusPortion"
              style={styles.stepperBtn}
              onPress={() => setPortions(Math.min(10, portions + 1))}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>When?</Text>
          <CustomCalendar
            selectedDate={DAY}
            onDateSelect={(day: moment.Moment) => onChangeDay(day)}
            minDate={moment()}
            maxDate={moment().add(1, 'month')}
          />
          <SelectList
            setSelected={(key: string) => setTimeSlot(key)}
            data={timeData}
            save={'key'}
            placeholder="Select a time"
            searchPlaceholder="Search"
            boxStyles={styles.dropdownBox}
            inputStyles={styles.dropdownInput}
            dropdownStyles={styles.dropdown}
            dropdownTextStyles={styles.dropdownText}
            arrowicon={<FontAwesomeIcon icon={faAngleDown} size={20} color="#666666" />}
            searchicon={<FontAwesomeIcon icon={faSearch} size={15} color="#666666" />}
            closeicon={<FontAwesomeIcon icon={faClose} size={15} color="#666666" />}
          />

          <StyledTextInput
            label="Anything the chef should know? (optional)"
            placeholder="Allergies, spice level, special requests…"
            value={notes}
            onChangeText={setNotes}
          />

          <StyledButton
            testID="requestDish.submitButton"
            title={submitting ? 'SENDING…' : 'SEND REQUEST TO CHEFS'}
            disabled={submitting}
            onPress={handleSubmit}
            titleStyle={{ fontSize: 16, letterSpacing: 0.5 }}
          />
          <Text style={styles.finePrint}>
            You'll only be charged when a chef accepts — at that chef's menu
            price, within the range we show you.
          </Text>
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
};

export default RequestDish;
