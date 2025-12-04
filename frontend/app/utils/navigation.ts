import { router, useSegments } from 'expo-router';
import { createRef, useEffect } from 'react';
import { IMenu, IOrder, IUser } from '../types';

// Create a navigation ref similar to the CLI project
export const navigationRef: any = createRef();
export const isReadyRef: any = createRef();

// Navigation helper functions
export const navigateToScreen = (name: string, params?: any) => {
  if (router.canGoBack()) {
    router.push({ pathname: name, params } as any);
  } else {
    router.replace({ pathname: name, params } as any);
  }
};

export const replace = (name: string, params?: any) => {
  router.replace({ pathname: name, params } as any);
};

export const goBack = () => {
  if (router.canGoBack()) {
    router.back();
  }
};

export const reset = (name: string, params?: any) => {
  router.dismissAll();
  router.replace({ pathname: name, params } as any);
};

// Initialize navigation ready state
export const initializeNavigation = () => {
  isReadyRef.current = true;
  
  // Also set a global flag for Firebase notifications
  setTimeout(() => {
    (global as any).navigationReady = true;
  }, 1000);
};

/**
 * Hook to protect routes that require authentication
 * @param isSignedIn Boolean indicating if user is signed in
 * @param userType User type (1 = Customer, 2 = Chef)
 */
export function useProtectedRoute(isSignedIn: boolean, userType?: number) {
  const segments = useSegments();
  const segmentString = segments[1] ? segments[1].toString() : ''; // Get the second segment (chef/customer/common)
  const isAuthGroup = segmentString === 'common'; // Only common screens are auth screens
  const isInChefTabs = segments.length >= 3 && segments[1] === 'chef' && segments[2] === '(tabs)';
  const isInCustomerScreens = segments.length >= 2 && segments[1] === 'customer';

  useEffect(() => {
    if (!isSignedIn && !isAuthGroup) {
      // Redirect to the login page if user is not signed in and not already on auth screens
      navigate.toAuthorizedStacks.noAuthorized();
    } else if (isSignedIn) {
      // Only redirect if we're on auth/common screens, not if we're already in the correct user area
      if (isAuthGroup && (segmentString === 'common' || segments.length <= 1)) {
        if (userType === 1) { // Customer
          navigate.toAuthorizedStacks.customerAuthorized();
        } else if (userType === 2) { // Chef
          navigate.toAuthorizedStacks.chefAuthorized();
        }
      }
      
      // Make sure customers can't access chef routes and vice versa (but don't interfere with tab navigation)
      if (userType === 1 && segmentString === 'chef' && !isInChefTabs) {
        navigate.toAuthorizedStacks.customerAuthorized();
      } else if (userType === 2 && segmentString === 'customer' && !isInCustomerScreens) {
        navigate.toAuthorizedStacks.chefAuthorized();
      }
    }
  }, [isSignedIn, segments, userType]);
}

/**
 * Helper function to navigate between screens with proper typing
 */
export const navigate = {
  // Main authorization stacks (equivalent to your CLI project's main stacks)
  toAuthorizedStacks: {
    noAuthorized: () => router.replace('/screens/common/splash' as any),
    chefAuthorized: () => {
      router.dismissAll();
      router.replace('/screens/chef/(tabs)' as any);
    },
    customerAuthorized: () => {
      router.dismissAll();
      router.replace('/screens/customer/(tabs)' as any);
    },
  },
  toCustomer: {
    home: () => router.navigate('/screens/customer/(tabs)/(home)' as any),
    tabs: () => router.replace('/screens/customer/(tabs)' as any),
    orders: () => router.navigate('/screens/customer/(tabs)/orders' as any),
    account: (params?: { scrollToAddress?: boolean }) => router.navigate({
      pathname: '/screens/customer/(tabs)/account',
      params: params ? { scrollToAddress: params.scrollToAddress?.toString() } : {}
    } as any),
    chefDetail: (params: {
      chefInfo: any;
      reviews: any[];
      menus: any[];
      weekDay: number;
    }) => router.push({
      pathname: '/screens/customer/(tabs)/(home)/chefDetail',
      params: { 
        chefInfo: JSON.stringify(params.chefInfo),
        reviews: JSON.stringify(params.reviews),
        menus: JSON.stringify(params.menus),
        weekDay: params.weekDay.toString()
      }
    } as any),
    addToOrder: (params: {
      orderMenu: any;
      chefInfo: any;
      reviews: any[];
      menus: any[];
    }) => router.push({
      pathname: '/screens/customer/(tabs)/(home)/addToOrder',
      params: { 
        orderMenu: JSON.stringify(params.orderMenu),
        chefInfo: JSON.stringify(params.chefInfo),
        reviews: JSON.stringify(params.reviews),
        menus: JSON.stringify(params.menus)
      }
    } as any),
    orderDetail: (orderInfo: IOrder, chefInfo?: IUser) => router.push({
      pathname: '/screens/customer/orderDetail',
      params: { 
        orderInfo: JSON.stringify(orderInfo),
        chefInfo: chefInfo ? JSON.stringify(chefInfo) : undefined
      }
    } as any),
    checkout: (params: {
      orders: IOrder[];
      chefInfo: IUser;
      weekDay: number;
      chefProfile: any;
    }) => router.push({
      pathname: '/screens/customer/(tabs)/(home)/checkout',
      params: { 
        orders: JSON.stringify(params.orders),
        chefInfo: JSON.stringify(params.chefInfo),
        weekDay: params.weekDay.toString(),
        chefProfile: JSON.stringify(params.chefProfile)
      }
    } as any),
    creditCard: (handleAddPaymentCard?: (details: any) => Promise<void>) => {
      // Store the callback globally since Expo Router can't pass functions as params
      if (handleAddPaymentCard) {
        (global as any).handleAddPaymentCardCallback = handleAddPaymentCard;
      }
      router.push('/screens/customer/(tabs)/(home)/checkout/creditCard' as any);
    },
    earnByCooking: () => router.push('/screens/customer/earnByCooking' as any),
    cart: () => router.push('/screens/customer/cart' as any),
  },
  toChef: {
    home: () => router.push('/screens/chef/(tabs)/home' as any),
    tabs: () => router.replace('/screens/chef/(tabs)' as any),
    orders: () => router.push('/screens/chef/(tabs)/orders' as any),
    menu: () => router.push('/screens/chef/(tabs)/menu' as any),
    profile: () => router.push('/screens/chef/(tabs)/profile' as any),
    earnings: () => router.push('/screens/chef/(tabs)/earnings' as any),
    chefWelcome: () => router.push('/screens/chef/chefWelcome' as any),
    safetyQuiz: () => router.push('/screens/chef/safetyQuiz' as any),
    orderDetail: (orderInfo: IOrder, customerInfo?: IUser) => router.push({
    pathname: '/screens/chef/orderDetail',
    params: { 
      orderId: orderInfo.id ? orderInfo.id.toString() : '0',
      customerId: customerInfo?.id?.toString() || '0'
    }
  } as any),
    orderDetailFromNotification: (orderData: {
      orderId: string;
      title?: string;
      ratings?: string;
      review?: string;
      tip?: string;
    }) => router.push({
      pathname: '/screens/chef/orderDetail',
      params: {
        orderInfo: JSON.stringify({
          id: orderData.orderId,
          title: orderData.title,
          ratings: orderData.ratings,
          review: orderData.review,
          tip: orderData.tip,
        })
      }
    } as any),
    howToDoIt: () => router.push('/screens/chef/howToDo' as any),
    menuDetails: () => router.push('/screens/chef/menu' as any),
    // Add menu item navigation
    addMenuItem: (menuItem?: IMenu) => router.push({
      pathname: '/screens/chef/addMenuItem',
      params: menuItem ? { info: JSON.stringify(menuItem) } : {}
    } as any),
    profileDetails: () => router.push('/screens/chef/profile' as any),
    setupStrip: () => router.push('/screens/chef/setupStrip' as any),
    addOnCustomization: (onAddCustomization?: (item: { name: string; upcharge_price: number }) => void) => {
      // Store the callback globally or use a different approach
      if (onAddCustomization) {
        (global as any).onAddCustomizationCallback = onAddCustomization;
      }
      router.push('/screens/chef/addOnCustomization' as any);
    },
    backgroundCheck: () => router.push('/screens/chef/backgroundCheck' as any),
    earningsDetails: () => router.push('/screens/chef/earnings' as any),
    cancelApplication: () => router.push('/screens/chef/cancelApplication' as any),
  },
  toCommon: {
    splash: () => router.replace('/screens/common/splash' as any),
    login: () => router.push('/screens/common/login' as any),
    signup: () => router.push('/screens/common/signup' as any),
    forget: () => router.push('/screens/common/forgot' as any),
    account: (user: IUser, from: string) => router.push({
      pathname: '/screens/common/account',
      params: { user: JSON.stringify(user), from }
    } as any),
    notification: () => router.push('/screens/common/notification' as any),
    terms: () => router.push('/screens/common/terms' as any),
    privacy: () => router.push('/screens/common/privacy' as any),
    contactUs: () => router.push('/screens/common/contactUs' as any),
    inbox: () => router.push('/screens/common/inbox' as any),
    map: (latitude: number, longitude: number) => router.push({
      pathname: '/screens/common/map',
      params: { latitude, longitude }
    } as any),
    chat: (userInfo: IUser, orderInfo: IOrder) => router.push({
      pathname: '/screens/common/chat',
      params: {  
        userInfo: JSON.stringify(userInfo), 
        orderInfo: JSON.stringify(orderInfo) 
   }
    } as any),
    UserInformation: () => router.push('/screens/common/userInformation' as any),

  }

};