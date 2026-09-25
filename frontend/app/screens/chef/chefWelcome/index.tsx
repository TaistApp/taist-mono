import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  Linking,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { navigate } from '../../../utils/navigation';
import { AppColors } from '../../../../constants/theme';
import PrepList from '../components/prepList';
import PushPermissionModal from '../../../components/PushPermissionModal';
import { GetFCMToken, RequestPushPermission } from '../../../firebase';
import { OptInPushNotificationsAPI } from '../../../services/api';
import { useAppSelector } from '../../../hooks/useRedux';
import { ReadDataFromStorage, StoreDataToStorage } from '../../../utils/storage';
import {
  PUSH_PROMPT_DELAY_MS,
  PUSH_PROMPT_KEYS,
  PushPromptRecord,
  enablePushForUser,
  parsePushPromptRecord,
  recordPushPromptOutcome,
  shouldOpenSystemSettings,
  shouldShowPushPrompt,
} from '../../../utils/pushPrompt';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_COUNT = 2;

/**
 * The chef notification prompt lives on the chef home screen, but a chef who
 * has not finished the safety quiz is redirected off that screen the moment it
 * mounts — and the prompt is explicitly suppressed while that redirect is
 * pending. In production that is 133 of 174 chefs: they are sent here instead
 * and were never asked, while 77 of them already had an FCM token stored, so
 * Firebase reported every send as a success and the device dropped it.
 *
 * This is where that cohort actually lands, so this is where they get asked.
 * It shares PUSH_PROMPT_KEYS.chef with the home screen, so nobody is asked
 * twice and the cooldown and decline cap carry across both surfaces.
 */
const ChefWelcome = () => {
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const self = useAppSelector(x => x.user.user);
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushRecord, setPushRecord] = useState<PushPromptRecord | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const record = parsePushPromptRecord(
        await ReadDataFromStorage(PUSH_PROMPT_KEYS.chef),
      );
      setPushRecord(record);
      if (!shouldShowPushPrompt({ record, userId: self?.id })) return;
      timer = setTimeout(() => setShowPushModal(true), PUSH_PROMPT_DELAY_MS);
    })();

    // Leaving for the quiz within the delay must not fire the prompt onto a
    // screen that is on its way out.
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [self?.id]);

  const persistPushOutcome = async (outcome: 'accepted' | 'declined') => {
    const next = recordPushPromptOutcome(pushRecord, outcome);
    setPushRecord(next);
    await StoreDataToStorage(PUSH_PROMPT_KEYS.chef, next);
  };

  const handleAcceptPush = async () => {
    setShowPushModal(false);

    // Android stops showing the OS dialog after a denial and just returns
    // "denied", so settings is the only route that still works.
    if (shouldOpenSystemSettings(pushRecord)) {
      await persistPushOutcome('declined');
      Linking.openSettings().catch(() => {});
      return;
    }

    const granted = await enablePushForUser(
      {
        requestPermission: RequestPushPermission,
        registerToken: GetFCMToken,
        optIn: OptInPushNotificationsAPI,
        reportOptInFailure: reason =>
          console.warn('[push] chef opt-in failed:', reason),
      },
      self?.id,
    );
    await persistPushOutcome(granted ? 'accepted' : 'declined');
  };

  const handleDeclinePush = async () => {
    setShowPushModal(false);
    await persistPushOutcome('declined');
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== page) setPage(idx);
  };

  const goNext = () => {
    if (page === 0) {
      scrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: true });
      setPage(1);
    } else {
      navigate.toChef.safetyQuiz();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed header */}
      <View style={styles.header}>
        <Image
          source={require('../../../assets/images/logo-2.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={styles.pager}
      >
        {/* PAGE 1 — What Chefs Love + insurance/background */}
        <ScrollView
          style={{ width: SCREEN_WIDTH }}
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>What Chefs Love</Text>

          <View style={styles.card}>
            <View style={styles.benefitRow}>
              <Text style={styles.icon}>⏰</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Work 24/7</Text>
                <Text style={styles.benefitDescription}>
                  You choose when and how much you want to work
                </Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <Text style={styles.icon}>💰</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Set Your Prices</Text>
                <Text style={styles.benefitDescription}>
                  Control your own pricing and profit margins
                </Text>
              </View>
            </View>

            <View style={[styles.benefitRow, styles.benefitRowLast]}>
              <Text style={styles.icon}>🍳</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Custom Menus</Text>
                <Text style={styles.benefitDescription}>
                  Make whatever you'd like and switch out items anytime
                </Text>
              </View>
            </View>
          </View>

          {/* Insurance / background check (moved ahead of What You'll Need) */}
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              👍 <Text style={styles.infoBold}>We cover your insurance</Text>
            </Text>
            <Text style={styles.infoText}>
              ✅ <Text style={styles.infoBold}>Background check required</Text>
            </Text>
          </View>
        </ScrollView>

        {/* PAGE 2 — What You'll Need */}
        <ScrollView
          style={{ width: SCREEN_WIDTH }}
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.needTitle}>What You'll Need</Text>
          <Text style={styles.cardSubtitle}>
            You'll cook in the customer's kitchen. Bring these for each order:
          </Text>

          <PrepList />
        </ScrollView>
      </ScrollView>

      {/* Pager dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: PAGE_COUNT }, (_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      {/* CTA — advances to page 2, then into the quiz */}
      <TouchableOpacity style={styles.ctaButton} onPress={goNext} activeOpacity={0.9}>
        <Text style={styles.ctaText}>
          {page === 0 ? 'Continue' : 'Start Safety Quiz'}
        </Text>
        <Text style={styles.ctaSubtext}>
          {page === 0 ? 'What you’ll need →' : '5 quick questions →'}
        </Text>
      </TouchableOpacity>

      <PushPermissionModal
        visible={showPushModal}
        title={
          shouldOpenSystemSettings(pushRecord)
            ? 'Notifications are off'
            : 'Turn on notifications'
        }
        body={
          shouldOpenSystemSettings(pushRecord)
            ? "Notifications are switched off for Taist, so we can't tell you when your application moves forward. Open settings to turn them back on."
            : "We'll let you know the moment your application moves forward, and whenever a customer sends you an order."
        }
        acceptLabel={
          shouldOpenSystemSettings(pushRecord)
            ? 'Open settings'
            : 'Turn on notifications'
        }
        onAccept={handleAcceptPush}
        onDecline={handleDeclinePush}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  logo: {
    width: 110,
    height: 48,
  },
  pager: {
    flex: 1,
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  needTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: AppColors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  card: {
    backgroundColor: AppColors.surface,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
  },
  cardSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  benefitRowLast: {
    marginBottom: 0,
  },
  icon: {
    fontSize: 26,
    width: 40,
    textAlign: 'center',
    marginRight: 12,
  },
  benefitText: {
    flex: 1,
    flexShrink: 1,
    paddingTop: 2,
  },
  benefitTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  arrow: {
    fontSize: 20,
    color: AppColors.primary,
    fontWeight: '700',
    width: 28,
    marginTop: 1,
  },
  checklistText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    color: AppColors.text,
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  infoText: {
    fontSize: 16,
    color: AppColors.text,
    marginBottom: 12,
    lineHeight: 24,
  },
  infoBold: {
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: AppColors.primary,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: AppColors.primary,
  },
  ctaButton: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: AppColors.primary,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 22,
    fontWeight: '800',
    color: AppColors.textOnPrimary,
    marginBottom: 4,
  },
  ctaSubtext: {
    fontSize: 14,
    color: AppColors.textOnPrimary,
    opacity: 0.9,
    fontWeight: '600',
  },
});

export default ChefWelcome;
