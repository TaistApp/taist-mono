import React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
import Container from '../../../layout/Container';
import { AppColors } from '../../../../constants/theme';

type Step = { emoji: string; text: string };
type Section = { title: string; steps: Step[] };

const ORDER_SECTIONS: Section[] = [
  {
    title: 'Before the order',
    steps: [
      { emoji: '📲', text: 'Accept the order request in the Taist app' },
      { emoji: '🛒', text: 'Buy the ingredients you\'ll need' },
      { emoji: '❄️', text: 'Keep cold ingredients refrigerated until you leave, and cold in transit' },
    ],
  },
  {
    title: 'At the customer\'s kitchen',
    steps: [
      { emoji: '🧊', text: 'Set your cooler on the floor; the rest of your equipment on the counter' },
      { emoji: '🧼', text: 'Wash your hands and clean surfaces before you start' },
      { emoji: '🍳', text: 'Cook using the customer\'s appliances' },
      { emoji: '🧽', text: 'Clean as you go, not just at the end' },
      { emoji: '🍽️', text: 'Plate the finished order' },
    ],
  },
  {
    title: 'Before you leave',
    steps: [
      { emoji: '🧴', text: 'Wash your equipment and wipe down surfaces' },
      { emoji: '✅', text: 'Leave the kitchen exactly as you found it' },
    ],
  },
];

const YourOrders = () => {
  return (
    <SafeAreaView style={styles.main}>
      <Container backMode title="Your Orders">
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Your Orders</Text>
          <Text style={styles.subtitle}>
            How an order works, start to finish.
          </Text>

          {ORDER_SECTIONS.map((section, i) => (
            <View key={`sec_${i}`} style={styles.section}>
              <View style={styles.headingRow}>
                <Text style={styles.arrow}>➜</Text>
                <Text style={styles.heading}>{section.title}</Text>
              </View>
              {section.steps.map((step, j) => (
                <View key={`step_${i}_${j}`} style={styles.subItem}>
                  <Text style={styles.subBullet}>{step.emoji}</Text>
                  <Text style={styles.subText}>{step.text}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: AppColors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  arrow: {
    fontSize: 18,
    color: AppColors.primary,
    fontWeight: '700',
    width: 26,
    marginTop: 1,
  },
  heading: {
    flex: 1,
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.text,
    lineHeight: 23,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingLeft: 26,
  },
  subBullet: {
    fontSize: 16,
    width: 28,
  },
  subText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    color: AppColors.text,
    lineHeight: 22,
  },
});

export default YourOrders;
