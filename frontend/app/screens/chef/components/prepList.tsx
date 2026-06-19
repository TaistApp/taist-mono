import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppColors } from '../../../../constants/theme';

type PrepItem = { emoji?: string; text: string };
type PrepSection = { title: string; note?: string; items?: PrepItem[] };

// What a chef brings to every order. Shared by the onboarding welcome screen
// and the "Before Your Orders" drawer reminder so they stay in sync.
export const PREP_SECTIONS: PrepSection[] = [
  {
    title: 'Your mobile equipment',
    items: [
      { emoji: '🧊', text: 'Cooler with ice' },
      { emoji: '🍳', text: 'Pots and pans' },
      { emoji: '🥄', text: 'Cooking utensils' },
    ],
  },
  {
    title: 'All ingredients',
    note: '(bring extras just in case!)',
  },
  {
    title: 'Cleaning supplies',
    items: [
      { emoji: '🧼', text: 'Dish soap' },
      { emoji: '🧽', text: 'Sponge' },
      { text: 'Surface-cleaning spray' },
      { text: 'Paper towels' },
    ],
  },
];

export const PrepList: React.FC = () => {
  return (
    <View>
      {PREP_SECTIONS.map((section, i) => (
        <View key={`prep_${i}`} style={styles.section}>
          <View style={styles.headingRow}>
            <Text style={styles.arrow}>➜</Text>
            <Text style={styles.heading}>
              {section.title}
              {section.note ? <Text style={styles.note}> {section.note}</Text> : null}
            </Text>
          </View>
          {section.items?.map((item, j) => (
            <View key={`prep_${i}_${j}`} style={styles.subItem}>
              <Text style={styles.subBullet}>{item.emoji ? item.emoji : '•'}</Text>
              <Text style={styles.subText}>{item.text}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
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
  note: {
    fontSize: 14,
    fontWeight: '400',
    color: AppColors.textSecondary,
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
    textAlign: 'left',
  },
  subText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    color: AppColors.text,
    lineHeight: 22,
  },
});

export default PrepList;
