import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet } from 'react-native';
import Container from '../../../layout/Container';
import { AppColors } from '../../../../constants/theme';
import PrepList from '../components/prepList';

/**
 * Drawer reminder: what a chef brings to every order. Same content as the
 * onboarding "What You'll Need" screen (shared via PrepList).
 */
const BeforeYourOrders = () => {
  return (
    <SafeAreaView style={styles.main}>
      <Container backMode title="Before Your Orders">
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>What You'll Need</Text>
          <Text style={styles.subtitle}>
            You'll cook in the customer's kitchen. Bring these for each order:
          </Text>
          <PrepList />
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
});

export default BeforeYourOrders;
