# Storybook Setup Plan for Taist React Native App

## Overview

This document outlines the complete setup process for integrating Storybook into the Taist Expo/React Native frontend application.

**Current Stack:**
- React Native 0.81.5 with React 19.1.0
- Expo SDK 54 (managed workflow)
- expo-router for navigation
- TypeScript with strict mode
- StyleSheet API with centralized theme constants
- Redux Toolkit for state management

---

## Phase 1: Installation

### 1.1 Install Core Storybook Packages

```bash
npx storybook@latest init --type react_native
```

If the automatic installer doesn't work with Expo, install manually:

```bash
npm install --save-dev @storybook/react-native @storybook/addon-ondevice-controls @storybook/addon-ondevice-actions @storybook/addon-ondevice-backgrounds @storybook/addon-ondevice-notes @react-native-async-storage/async-storage
```

### 1.2 Install Additional Dependencies

```bash
# Safe area context (if not already installed)
npm install react-native-safe-area-context

# For web-based Storybook (optional but recommended for faster iteration)
npm install --save-dev @storybook/react-webpack5 @storybook/addon-essentials
```

### 1.3 Peer Dependencies Check

Ensure these are installed (most already exist in project):
- react-native-reanimated (already installed: ~4.1.1)
- react-native-gesture-handler (already installed: ~2.28.0)
- @react-native-async-storage/async-storage (may need to install)

---

## Phase 2: Configuration

### 2.1 Create Storybook Configuration Directory

Create `.storybook/` directory in frontend root:

```
frontend/
├── .storybook/
│   ├── main.ts           # Main Storybook config
│   ├── preview.tsx       # Global decorators and parameters
│   └── storybook.requires.ts  # Auto-generated story imports
```

### 2.2 Main Configuration (`.storybook/main.ts`)

```typescript
import type { StorybookConfig } from '@storybook/react-native';

const config: StorybookConfig = {
  stories: [
    '../app/components/**/*.stories.@(js|jsx|ts|tsx)',
    '../app/screens/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-ondevice-controls',
    '@storybook/addon-ondevice-actions',
    '@storybook/addon-ondevice-backgrounds',
    '@storybook/addon-ondevice-notes',
  ],
};

export default config;
```

### 2.3 Preview Configuration (`.storybook/preview.tsx`)

```typescript
import React from 'react';
import type { Preview } from '@storybook/react-native';
import { View } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppTheme } from '../../constants/theme';

// Global decorator to wrap all stories with required providers
const withProviders = (Story: React.ComponentType) => (
  <SafeAreaProvider>
    <PaperProvider theme={AppTheme}>
      <View style={{ flex: 1, padding: 16, backgroundColor: '#ffffff' }}>
        <Story />
      </View>
    </PaperProvider>
  </SafeAreaProvider>
);

const preview: Preview = {
  decorators: [withProviders],
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'surface', value: '#f5f5f5' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
```

### 2.4 Update Metro Configuration (`metro.config.js`)

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable Storybook
config.resolver.resolverMainFields = ['sbmodern', 'react-native', 'browser', 'main'];

// Watch the .storybook folder
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, '.storybook'),
];

module.exports = config;
```

### 2.5 Create Storybook Entry Point

Create `storybook.tsx` in frontend root:

```typescript
import { getStorybookUI } from '@storybook/react-native';
import './storybook.requires';

const StorybookUIRoot = getStorybookUI({
  // Options
  enableWebsockets: true,
  host: 'localhost',
  port: 7007,
});

export default StorybookUIRoot;
```

---

## Phase 3: App Integration

### 3.1 Environment-Based Loading

Create or update `app.config.js` to support Storybook mode:

```javascript
export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      storybookEnabled: process.env.STORYBOOK_ENABLED === 'true',
    },
  };
};
```

### 3.2 Update App Entry Point

Modify `App.tsx` or `_layout.tsx` to conditionally load Storybook:

```typescript
import Constants from 'expo-constants';

const STORYBOOK_ENABLED = Constants.expoConfig?.extra?.storybookEnabled;

let App = () => {
  // Your normal app
  return <YourApp />;
};

if (STORYBOOK_ENABLED) {
  App = require('./storybook').default;
}

export default App;
```

### 3.3 Add NPM Scripts

Update `package.json`:

```json
{
  "scripts": {
    "storybook": "STORYBOOK_ENABLED=true expo start",
    "storybook:ios": "STORYBOOK_ENABLED=true expo run:ios",
    "storybook:android": "STORYBOOK_ENABLED=true expo run:android",
    "storybook:generate": "sb-rn-get-stories",
    "prestorybook": "npm run storybook:generate"
  }
}
```

---

## Phase 4: Writing Stories

### 4.1 Story File Naming Convention

Place stories next to their components:

```
app/components/styledButton/
├── index.tsx
├── styles.ts
└── StyledButton.stories.tsx
```

### 4.2 Example Story: StyledButton

Create `app/components/styledButton/StyledButton.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react-native';
import StyledButton from './index';

const meta: Meta<typeof StyledButton> = {
  title: 'Components/StyledButton',
  component: StyledButton,
  argTypes: {
    title: {
      control: 'text',
      description: 'Button label text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    onPress: {
      action: 'pressed',
      description: 'Callback when button is pressed',
    },
  },
  args: {
    title: 'Click Me',
    disabled: false,
  },
};

export default meta;

type Story = StoryObj<typeof StyledButton>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const LongText: Story = {
  args: {
    title: 'This is a very long button label',
  },
};
```

### 4.3 Example Story: StyledTextInput

Create `app/components/styledTextInput/StyledTextInput.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import StyledTextInput from './index';

const meta: Meta<typeof StyledTextInput> = {
  title: 'Components/StyledTextInput',
  component: StyledTextInput,
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    secureTextEntry: { control: 'boolean' },
    editable: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof StyledTextInput>;

// Interactive wrapper for controlled input
const TextInputWrapper = (args: any) => {
  const [value, setValue] = useState('');
  return (
    <StyledTextInput
      {...args}
      value={value}
      onChangeText={setValue}
    />
  );
};

export const Default: Story = {
  render: (args) => <TextInputWrapper {...args} />,
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
  },
};

export const Password: Story = {
  render: (args) => <TextInputWrapper {...args} />,
  args: {
    label: 'Password',
    placeholder: 'Enter your password',
    secureTextEntry: true,
  },
};

export const Disabled: Story = {
  render: (args) => <TextInputWrapper {...args} />,
  args: {
    label: 'Disabled Input',
    placeholder: 'Cannot edit',
    editable: false,
  },
};
```

### 4.4 Example Story: Chef Menu Empty State

For complex screen components, create focused stories:

```typescript
// app/screens/chef/menu/EmptyMenuState.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-native';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { styles } from './styles';
import GlobalStyles from '../../../types/styles';

// Extract the empty list component for isolated testing
const EmptyMenuState = ({ onPress }: { onPress: () => void }) => (
  <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 }}>
    <Text style={styles.missingHeading}>
      Display UNLIMITED items on your menu
    </Text>
    <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end', marginHorizontal: -10 }}>
      <Image
        style={[styles.missingImgLeft, { marginLeft: -10 }]}
        source={require('../../../assets/images/2.png')}
      />
      <Image
        style={[styles.missingImgRight, { marginBottom: 60, marginRight: -10 }]}
        source={require('../../../assets/images/1.png')}
      />
    </View>
    <View style={{ alignItems: 'center', gap: 20 }}>
      <Text style={styles.missingSubheading}>
        Tap below to create your very first menu item
      </Text>
      <TouchableOpacity style={GlobalStyles.btn} onPress={onPress}>
        <Text style={GlobalStyles.btnTxt}>ADD</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const meta: Meta<typeof EmptyMenuState> = {
  title: 'Screens/Chef/EmptyMenuState',
  component: EmptyMenuState,
};

export default meta;

type Story = StoryObj<typeof EmptyMenuState>;

export const Default: Story = {
  args: {
    onPress: () => console.log('Add pressed'),
  },
};
```

---

## Phase 5: Component Documentation Guidelines

### 5.1 Recommended Stories for Each Component

| Component | Stories to Create |
|-----------|------------------|
| StyledButton | Default, Disabled, Loading, Custom Colors |
| StyledTextInput | Default, Password, Error State, Disabled |
| StyledSwitch | On, Off, Disabled |
| StyledCheckBox | Checked, Unchecked, Disabled |
| StyledTabButton | Active, Inactive |
| HeaderWithBack | Default, With Custom Title |
| GoLiveToggle | Live, Offline, Loading |
| EmptyListView | With Text, With Custom Icon |
| StyledPhotoPicker | Empty, With Photo, Multiple Photos |
| StyledProfileImage | With Image, Placeholder |

### 5.2 Story Categories Structure

```
Components/
├── Inputs/
│   ├── StyledTextInput
│   ├── StyledSwitch
│   └── StyledCheckBox
├── Buttons/
│   ├── StyledButton
│   └── StyledTabButton
├── Navigation/
│   ├── HeaderWithBack
│   └── BottomTabs
├── Display/
│   ├── EmptyListView
│   └── StyledProfileImage
└── Complex/
    ├── GoLiveToggle
    └── StyledPhotoPicker

Screens/
├── Chef/
│   ├── EmptyMenuState
│   └── MenuCard
├── Customer/
│   └── OrderCard
└── Common/
    └── LoginForm
```

---

## Phase 6: Testing Integration (Optional)

### 6.1 Add Storybook Test Runner

```bash
npm install --save-dev @storybook/test-runner jest
```

### 6.2 Configure Test Runner

Create `storybook-test-runner.config.js`:

```javascript
module.exports = {
  stories: ['../app/**/*.stories.@(js|jsx|ts|tsx)'],
};
```

### 6.3 Add Test Script

```json
{
  "scripts": {
    "test:storybook": "test-storybook"
  }
}
```

---

## Phase 7: Web Storybook (Optional - Faster Iteration)

For faster development, you can also set up web-based Storybook using react-native-web:

### 7.1 Install Web Dependencies

```bash
npm install --save-dev @storybook/react-webpack5 @storybook/addon-essentials webpack
```

### 7.2 Create Web Config

Create `.storybook-web/main.ts`:

```typescript
import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  stories: ['../app/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: '@storybook/react-webpack5',
  webpackFinal: async (config) => {
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        'react-native$': 'react-native-web',
      },
      extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js'],
    };
    return config;
  },
};

export default config;
```

### 7.3 Add Web Script

```json
{
  "scripts": {
    "storybook:web": "storybook dev -p 6006 -c .storybook-web"
  }
}
```

---

## Rollout Checklist

### Initial Setup
- [ ] Install core Storybook packages
- [ ] Create `.storybook/` configuration directory
- [ ] Configure `main.ts` and `preview.tsx`
- [ ] Update `metro.config.js`
- [ ] Create Storybook entry point
- [ ] Add environment-based loading
- [ ] Update npm scripts

### First Stories
- [ ] Create story for StyledButton
- [ ] Create story for StyledTextInput
- [ ] Create story for EmptyMenuState (the screen you're working on)
- [ ] Verify stories render correctly on device/simulator

### Documentation
- [ ] Document component props with JSDoc comments
- [ ] Add argTypes descriptions for all controls
- [ ] Create stories for each component state

### Team Onboarding
- [ ] Add Storybook usage to project README
- [ ] Create story template file for consistency
- [ ] Set up PR requirement for stories with new components

---

## Troubleshooting

### Common Issues

**1. Metro bundler conflicts**
- Stop all running Metro instances before starting Storybook
- Clear Metro cache: `expo start -c`

**2. AsyncStorage errors**
- Ensure `@react-native-async-storage/async-storage` is installed
- For Expo: Should be included automatically

**3. Stories not appearing**
- Run `npm run storybook:generate` to regenerate story imports
- Check file naming: must end with `.stories.tsx`

**4. Theme/styling issues**
- Ensure PaperProvider is included in preview decorators
- Import theme from correct path

**5. Navigation-dependent components**
- Mock navigation context in story decorators
- Extract presentational logic from navigation-dependent screens

---

## Estimated Setup Time

| Phase | Description | Effort |
|-------|-------------|--------|
| 1 | Installation | 15 min |
| 2 | Configuration | 30 min |
| 3 | App Integration | 20 min |
| 4 | First 3 Stories | 45 min |
| 5 | Full Component Coverage | 2-3 hours |
| 6 | Testing Integration | 30 min (optional) |
| 7 | Web Storybook | 30 min (optional) |

**Total for basic setup: ~2 hours**
**Total with all stories: ~4-5 hours**

---

## Resources

- [Storybook for React Native Docs](https://storybook.js.org/docs/react-native/get-started/introduction)
- [Expo + Storybook Guide](https://docs.expo.dev/guides/storybook/)
- [Storybook Addon Controls](https://storybook.js.org/docs/essentials/controls)
- [Writing Stories](https://storybook.js.org/docs/writing-stories)
