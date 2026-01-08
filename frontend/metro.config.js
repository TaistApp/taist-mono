const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable Storybook
config.resolver.resolverMainFields = ['sbmodern', 'react-native', 'browser', 'main'];

// Watch the .storybook folder
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, '.storybook'),
];

module.exports = config;
