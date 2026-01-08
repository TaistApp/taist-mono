export default ({ config }) => {
  const APP_ENV = process.env.APP_ENV || 'production';
  const isDevelopment = APP_ENV === 'development';
  const storybookEnabled = process.env.STORYBOOK_ENABLED === 'true';

  // Dev screen preview - only works in __DEV__ mode
  const devScreen = process.env.DEV_SCREEN || null;
  const devUserType = process.env.DEV_USER_TYPE || null; // 'chef' or 'customer'

  // Filter out expo-dev-client from plugins for non-development builds
  const plugins = (config.plugins || []).filter(plugin => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
    // Only include expo-dev-client in development builds
    if (pluginName === 'expo-dev-client') {
      return isDevelopment;
    }
    return true;
  });

  return {
    ...config,
    plugins,
    extra: {
      ...config.extra,
      APP_ENV: APP_ENV,
      storybookEnabled,
      devScreen,
      devUserType,
    },
  };
};

