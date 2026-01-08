import React from 'react';
import type { Preview } from '@storybook/react-native';
import { View } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppTheme } from '../constants/theme';

const preview: Preview = {
  decorators: [
    (Story) => (
      <SafeAreaProvider>
        <PaperProvider theme={AppTheme}>
          <View style={{ flex: 1, padding: 16, backgroundColor: '#ffffff' }}>
            <Story />
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
