import React, { useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { navigate } from '../../../utils/navigation';
import { AppColors } from '../../../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_COUNT = 2;

const ChefWelcome = () => {
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

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
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
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
        </View>

        {/* PAGE 2 — What You'll Need */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <Text style={styles.needTitle}>What You'll Need</Text>
          <Text style={styles.cardSubtitle}>
            You'll cook in the customer's kitchen. Bring these for each order:
          </Text>

          <View style={styles.checklistItem}>
            <Text style={styles.arrow}>➜</Text>
            <Text style={styles.checklistText}>
              Your mobile equipment (🧊 cooler with ice, 🍲 pots, 🍳 pans, 🍴 cooking utensils)
            </Text>
          </View>

          <View style={styles.checklistItem}>
            <Text style={styles.arrow}>➜</Text>
            <Text style={styles.checklistText}>
              All ingredients 🥕 (bring extras just in case!)
            </Text>
          </View>

          <View style={styles.checklistItem}>
            <Text style={styles.arrow}>➜</Text>
            <Text style={styles.checklistText}>
              Cleaning supplies (🧼 dish soap, 🧽 sponge, 🧴 surface-cleaning spray, 🧻 paper towels)
            </Text>
          </View>
        </View>
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
    paddingHorizontal: 24,
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
