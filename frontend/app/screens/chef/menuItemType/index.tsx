import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import Container from '../../../layout/Container';
import { navigate } from '../../../utils/navigation';
import { AppColors, Spacing } from '../../../../constants/theme';

/**
 * Item-type picker shown before the menu-item wizard. Standard items use the
 * existing flow; meal-prep items branch into the meal-prep variant (extra
 * details step + meal-prep fields).
 */
const MenuItemType = () => {
  const options = [
    {
      type: 'standard' as const,
      emoji: '🍽️',
      title: 'Standard Item',
      description: 'A single dish you cook fresh in the customer\'s kitchen.',
      example: 'e.g. Margherita pizza, chicken alfredo, chicken tikka masala',
    },
    {
      type: 'meal_prep' as const,
      emoji: '🥗',
      title: 'Meal Prep',
      description: 'Several meals you cook in the customer\'s kitchen for them to store and reheat later.',
      example: 'e.g. 5 lunch bowls, a week of dinners, 10 breakfast burritos',
    },
  ];

  return (
    <SafeAreaView style={styles.main}>
      <Container backMode title="New Menu Item" containerStyle={{ marginBottom: 0 }}>
        <View style={styles.content}>
          <Text style={styles.heading}>What type of item is this?</Text>
          <Text style={styles.subheading}>
            Pick how this item works — you can add as many of each as you like.
          </Text>

          <View style={styles.cards}>
            {options.map(opt => (
              <TouchableOpacity
                key={opt.type}
                testID={`menuItemType.${opt.type}`}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => navigate.toChef.addMenuItem(undefined, opt.type)}
              >
                <Text style={styles.cardEmoji}>{opt.emoji}</Text>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{opt.title}</Text>
                  <Text style={styles.cardDescription}>{opt.description}</Text>
                  <Text style={styles.cardExample}>{opt.example}</Text>
                </View>
                <FontAwesomeIcon icon={faChevronRight} size={18} color={AppColors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  subheading: {
    fontSize: 15,
    color: AppColors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  cards: {
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardEmoji: {
    fontSize: 34,
    width: 44,
    textAlign: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  cardExample: {
    fontSize: 13,
    color: AppColors.primary,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 18,
  },
});

export default MenuItemType;
