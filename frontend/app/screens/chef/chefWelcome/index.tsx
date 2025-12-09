import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { navigate } from '../../../utils/navigation';
import { AppColors } from '../../../../constants/theme';

const { width } = Dimensions.get('window');

const ChefWelcome = () => {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[AppColors.primary, '#FF8C5A', AppColors.primary]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.welcomeTitle}>Welcome to Taist!</Text>
            <Text style={styles.subtitle}>Let's get you started as a chef!</Text>
          </View>

          {/* Hero Image */}
          <View style={styles.heroContainer}>
            <Image
              source={require('../../../assets/images/chefDelivery.png')}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>

          {/* Scroll Indicator */}
          <View style={styles.scrollIndicator}>
            <Text style={styles.scrollText}>Scroll to learn more</Text>
            <Text style={styles.scrollArrow}>↓</Text>
          </View>

          {/* Benefits Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Here's What Chefs Love</Text>

            <View style={styles.benefitRow}>
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>⏰</Text>
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Work 24/7</Text>
                <Text style={styles.benefitDescription}>
                  You choose when and how much you want to work
                </Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>💰</Text>
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Set Your Prices</Text>
                <Text style={styles.benefitDescription}>
                  Control your own pricing and profit margins
                </Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>🍳</Text>
              </View>
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
                Cooler with ice for cold ingredients
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
            <LinearGradient
              colors={['#FFFFFF', '#F5F5F5']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={styles.ctaText}>Start Safety Quiz</Text>
              <Text style={styles.ctaSubtext}>5 quick questions →</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.spacer} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
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
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.95,
    paddingHorizontal: 10,
  },
  heroContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  heroImage: {
    width: '100%',
    height: 280,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  scrollIndicator: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scrollText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  scrollArrow: {
    fontSize: 20,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
    marginBottom: 20,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: AppColors.primaryLight || '#FFE8DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
  },
  benefitText: {
    flex: 1,
    paddingTop: 4,
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
    color: '#4CAF50',
    fontWeight: '700',
    marginRight: 12,
    marginTop: 2,
  },
  checklistText: {
    flex: 1,
    fontSize: 16,
    color: AppColors.text,
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  infoText: {
    fontSize: 16,
    color: '#FFFFFF',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 22,
    fontWeight: '800',
    color: AppColors.primary,
    marginBottom: 4,
  },
  ctaSubtext: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontWeight: '600',
  },
  spacer: {
    height: 20,
  },
});

export default ChefWelcome;
