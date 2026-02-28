import Constants from 'expo-constants';

const APP_ENV = Constants.expoConfig?.extra?.APP_ENV || 'production';

const getStripePublishableKey = () => {
  switch (APP_ENV) {
    case 'local':
    case 'staging':
    case 'development':
      return 'pk_test_51KWXqKKujvfsOOCM7ZW1LSWIwvGfwx7D2iLN0SHjerkhMHTlAuTBDacSbR7ayZRg1ds9WNIXXemf6Kf4eF8bjv9O00TYxsJNqs';
    case 'production':
    default:
      return 'pk_live_51KWXqKKujvfsOOCM9AOP40oBdH9RxKdL2o5DM5F3dsxFJfuyeo4LmsVxkDQIAmeXJmEt55fFyQTni8CO8qWMQsGo000AuSlz7G';
  }
};

export const StripPublishableKey = getStripePublishableKey();
