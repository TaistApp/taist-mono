import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { navigate } from '../../../utils/navigation';
import { AppColors } from '../../../../constants/theme';

const ChefWelcome = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/images/logo-2.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.pageTitle}>What Chefs Love</Text>
        </View>

        {/* Benefits */}
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

          <View style={styles.benefitRow}>
            <Text style={styles.icon}>🍳</Text>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Custom Menus</Text>
              <Text style={styles.benefitDescription}>
                Make whatever you'd like and switch out items anytime
              </Text>
            </View>
          </View>
        </View>

        {/* Equipment Checklist Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What You'll Need</Text>
          <Text style={styles.cardSubtitle}>
            You'll cook in the customer's kitchen. Bring these for each order:
          </Text>

          <View style={styles.checklistItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.checklistText}>
              Your cooking equipment (pots, pans, utensils)
            </Text>
          </View>

          <View style={styles.checklistItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.checklistText}>
              All ingredients (bring extras just in case!)
            </Text>
          </View>

          <View style={styles.checklistItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.checklistText}>
              Cooler with ice for perishable ingredients
            </Text>
          </View>

          <View style={styles.checklistItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.checklistText}>
              Cleaning supplies (soap, sponge, spray, paper towels)
            </Text>
          </View>
        </View>

        {/* Insurance Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            🛡️ <Text style={styles.infoBold}>We cover your insurance</Text>
          </Text>
          <Text style={styles.infoText}>
            ✅ <Text style={styles.infoBold}>Background check required</Text>
          </Text>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigate.toChef.safetyQuiz()}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>Start Safety Quiz</Text>
          <Text style={styles.ctaSubtext}>5 quick questions →</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 60,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: AppColors.text,
    textAlign: 'center',
  },
  card: {
    backgroundColor: AppColors.surface,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    minHeight: 50,
  },
  icon: {
    fontSize: 28,
    width: 44,
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
  checkmark: {
    fontSize: 20,
    color: AppColors.success,
    fontWeight: '700',
    width: 24,
    marginTop: 2,
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
    marginHorizontal: 24,
    marginBottom: 24,
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
  ctaButton: {
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: AppColors.primary,
    paddingVertical: 20,
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
  spacer: {
    height: 20,
  },
});

export default ChefWelcome;
