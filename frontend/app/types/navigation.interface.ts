import {IUser} from '../types/index';

type NavigationStackType =
  | {
      NoAuthorizedStack: undefined;
      Splash: undefined;
      Login: undefined;
      Signup: undefined;
      Forgot: undefined;
      Terms: undefined;
      Privacy: undefined;
      ContactUs: undefined;
      UserInformation: undefined;
      Inbox: undefined;
      Notification: undefined;
      Chat: undefined;
      Map: undefined;

      CustomerAuthorizedStack: any;
      CustomerHomeStack: undefined;
      CustomerOrdersStack: undefined;
      CustomerAccountStack: undefined;

      ChefAuthorizedStack: any;
      ChefHomeStack: undefined;
      ChefOrdersStack: undefined;
      ChefMenuStack: undefined;
      ChefProfileStack: undefined;
      ChefEarningStack: undefined;

      Drawer: undefined;
      Tab: undefined;
      Home: undefined;
      ChefDetail: undefined;
      AddToOrder: undefined;
      Checkout: undefined;
      CreditCard: undefined;
      Orders: undefined;
      OrderDetail: undefined;
      Account: undefined;
      Profile: undefined;
      EarnByCooking: undefined;
      Onboarding: undefined;
      AddMenuItem: undefined;
      AddOnCustomization: undefined;
      HowToDoIt: undefined;
      BackgroundCheck: undefined;
      CancelApplication: undefined;
      Feedback: undefined;
    }
  | Record<string, object | undefined>;

export default NavigationStackType;
