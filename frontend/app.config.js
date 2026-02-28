export default ({ config }) => {
  const APP_ENV = process.env.APP_ENV || 'production';
  const isDevelopment = APP_ENV === 'development';
  const storybookEnabled = process.env.STORYBOOK_ENABLED === 'true';

  // Dev screen preview - only works in __DEV__ mode
  const devScreen = process.env.DEV_SCREEN || null;
  const devUserType = process.env.DEV_USER_TYPE || null; // 'chef' or 'customer'

  // Google Maps API key from env (EAS secret) or fallback for local dev
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';

  // Filter out expo-dev-client from plugins for non-development builds,
  // and inject Google Maps API key from env.
  const plugins = (config.plugins || []).map(plugin => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;

    // Inject Google Maps API key from EAS secret
    if (pluginName === 'expo-maps' && googleMapsApiKey) {
      return ['expo-maps', { ...((Array.isArray(plugin) && plugin[1]) || {}), googleMapsApiKey }];
    }

    return plugin;
  }).filter(plugin => {
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

