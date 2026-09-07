import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleDown, faClose, faCreditCard, faSearch } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment-timezone';
import { SelectList } from 'react-native-dropdown-select-list';

import StyledButton from '../../../components/styledButton';
import StyledTextInput from '../../../components/styledTextInput';
import Container from '../../../layout/Container';
import { useAddCardSheet } from '../../../hooks/useAddCardSheet';
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import {
  CancelPoolRequestAPI,
  CreatePoolRequestAPI,
  GetMyPoolRequestsAPI,
  GetPaymentMethodAPI,
  GetPoolQuoteAPI,
} from '../../../services/api';
import { IPayment } from '../../../types/index';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';
import { navigate } from '../../../utils/navigation';
import {
  REQUEST_LEAD_HOURS,
  isRequestSlotStillValid,
  requestTimeSlotsForDay,
} from '../../../utils/requestTimes';
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
  const self = useAppSelector(x => x.user.user);
  const { presentAddCardSheet } = useAddCardSheet();

  const [myRequests, setMyRequests] = useState<Array<any>>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [portions, setPortions] = useState(1);
  const [DAY, onChangeDay] = useState(moment().add(1, 'day'));
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<IPayment | undefined>();
  const [isAddingCard, setIsAddingCard] = useState(false);
  // What the chefs who'd get this request charge, fetched as soon as there's
  // enough to price so the customer sees it before committing.
  const [quote, setQuote] = useState<any>(null);

  const categoryData = useMemo(
    () =>
      (categories ?? [])
        .filter((c: any) => c.status == 2)
        .map((c: any) => ({ key: `${c.id}`, value: c.name })),
    [categories],
  );

  // Half-hour slots, breakfast through dinner, minus anything already past
  // (or inside the lead window) for the selected day — same rule the chef
  // ordering path applies, so the two paths can't disagree.
  const timeData = useMemo(() => requestTimeSlotsForDay(DAY), [DAY]);

  // A slot picked for tomorrow may be unreachable on today; drop it rather
  // than sending a request the backend will reject.
  useEffect(() => {
    if (timeSlot && !isRequestSlotStillValid(DAY, timeSlot)) {
      setTimeSlot('');
    }
  }, [DAY, timeSlot]);

  const loadMyRequests = async () => {
    const resp = await GetMyPoolRequestsAPI();
    if (resp.success == 1) {
      setMyRequests(resp.data ?? []);
    }
  };

  const loadPaymentMethod = async () => {
    const resp = await GetPaymentMethodAPI();
    if (resp.success == 1) {
      setPaymentMethod(resp.data?.find((x: IPayment) => x.active == 1));
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMyRequests();
      loadPaymentMethod();
    }, []),
  );

  // Price range preview: refreshed whenever the priced inputs change so the
  // number on screen always matches what would actually be sent.
  useEffect(() => {
    let cancelled = false;
    if (!categoryId) {
      setQuote(null);
      return;
    }
    (async () => {
      const resp = await GetPoolQuoteAPI({ category_id: categoryId, portions });
      if (!cancelled) {
        setQuote(resp.success == 1 ? resp.data : null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId, portions]);

  const formatRange = (min?: number | null, max?: number | null) => {
    if (min == null) return null;
    return max != null && Number(max) !== Number(min)
      ? `$${Number(min).toFixed(0)}–$${Number(max).toFixed(0)}`
      : `$${Number(min).toFixed(0)}`;
  };

  const quoteRange = formatRange(quote?.price_min, quote?.price_max);

  const handleAddCard = async () => {
    if (isAddingCard) return;
    setIsAddingCard(true);
    try {
      const result = await presentAddCardSheet(self);
      if (result.status === 'added') {
        setPaymentMethod(result.paymentMethod);
        ShowSuccessToast('Card saved');
      } else if (result.status === 'failed') {
        ShowErrorToast(result.message);
      }
    } finally {
      setIsAddingCard(false);
    }
  };

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
    if (when.isBefore(moment().add(REQUEST_LEAD_HOURS, 'hours'))) {
      ShowErrorToast(`Requests need at least ${REQUEST_LEAD_HOURS} hours of lead time`);
      return;
    }

    // A claim charges the saved card straight away, so ask for one here
    // instead of letting the server bounce the request back.
    if (!paymentMethod?.last4) {
      Alert.alert(
        'Add a payment method',
        "You'll only be charged when a chef accepts, but we need a card on file before your request goes out.",
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Add card', onPress: handleAddCard },
        ],
      );
      return;
    }

    // Last look at the price before the request is locked in.
    const confirmed = await new Promise<boolean>(resolve => {
      Alert.alert(
        'Send this request?',
        [
          quoteRange
            ? `Chefs who make this charge ${quoteRange} for ${portions} portion${portions === 1 ? '' : 's'}.`
            : 'Each chef charges their own menu price.',
          `You'll be charged that chef's price on ${paymentMethod.card_type ?? 'your card'} ending in ${paymentMethod.last4} only when one accepts.`,
        ].join('\n\n'),
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Send request', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (!confirmed) return;

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
      const range =
        formatRange(resp.data?.request?.price_min, resp.data?.request?.price_max) ?? '$0';
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

          {!!categoryId && (
            <View testID="requestDish.priceRange" style={styles.quoteBox}>
              {quote?.chef_count > 0 && quoteRange ? (
                <>
                  <Text style={styles.quotePrice}>{quoteRange}</Text>
                  <Text style={styles.quoteText}>
                    {`${quote.chef_count} chef${quote.chef_count === 1 ? '' : 's'} make this. You pay whichever accepts, at their menu price.`}
                  </Text>
                </>
              ) : (
                <Text style={styles.quoteText}>
                  No chefs near you cook this yet — try another category.
                </Text>
              )}
            </View>
          )}

          <Text style={styles.label}>When?</Text>
          <CustomCalendar
            selectedDate={DAY}
            onDateSelect={(day: moment.Moment) => onChangeDay(day)}
            minDate={moment()}
            maxDate={moment().add(1, 'month')}
          />
          {timeData.length > 0 ? (
            <SelectList
              // Remount per day so the box can't keep showing a time that is
              // no longer offered for the newly selected date.
              key={`slots_${DAY.format('YYYY-MM-DD')}`}
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
          ) : (
            <Text testID="requestDish.noSlots" style={styles.noSlotsText}>
              {`No times left today — chefs need ${REQUEST_LEAD_HOURS} hours' notice. Pick another day.`}
            </Text>
          )}

          <Text style={styles.label}>Payment</Text>
          <TouchableOpacity
            testID="requestDish.paymentMethod"
            style={styles.paymentRow}
            disabled={isAddingCard}
            onPress={handleAddCard}
          >
            <FontAwesomeIcon icon={faCreditCard} size={18} color="#666666" />
            <Text style={styles.paymentText}>
              {paymentMethod?.last4
                ? `${paymentMethod.card_type ?? 'Card'} ending in ${paymentMethod.last4}`
                : isAddingCard
                  ? 'Opening…'
                  : 'Add payment method'}
            </Text>
            {!paymentMethod?.last4 && (
              <Text style={styles.paymentAction}>ADD</Text>
            )}
          </TouchableOpacity>

          <StyledTextInput
            label="Anything the chef should know? (optional)"
            placeholder="Allergies, spice level, special requests…"
            value={notes}
            onChangeText={setNotes}
          />

          <StyledButton
            testID="requestDish.submitButton"
            title={submitting ? 'SENDING…' : 'SEND REQUEST TO CHEFS'}
            disabled={submitting || !categoryId || !timeSlot}
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
