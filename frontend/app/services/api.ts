import Geolocation from "@react-native-community/geolocation";
import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { GetFCMToken } from "../firebase";
import { updateChefPaymentMthod, updateChefProfile } from "../reducers/chefSlice";

import moment from "moment";
import {
  addOrUpdateConverstations,
  addOrUpdateMenus,
  addOrUpdateOrders,
  addOrUpdateReviews,
  addOrUpdateUsers,
  updateAllergen,
  updateAppliances,
  updateCategories,
  updateZipcodes
} from "../reducers/tableSlice";
import { setUser } from "../reducers/userSlice";
import {
  IChefProfile,
  IMenu,
  IMenuCustomization,
  IMessage,
  IOrder,
  IPayment,
  IReview,
  IUser,
} from "../types/index";
import {
  ReadDataFromStorage,
  StoreDataToStorage,
  StoreLoginData,
} from "../utils/storage";

// Environment-based configuration
const APP_ENV = Constants.expoConfig?.extra?.APP_ENV || 'production';

// Determine URLs based on environment
const getEnvironmentUrls = () => {
  switch (APP_ENV) {
    case 'local':
      // Local development - Android emulator needs 10.0.2.2 to reach host's localhost
      // iOS simulator and web can use localhost
      const localHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      return {
        BASE_URL: `http://${localHost}:8000/mapi/`,
        Photo_URL: `http://${localHost}:8000/assets/uploads/images/`,
        HTML_URL: `http://${localHost}:8000/assets/uploads/html/`,
      };
    
    case 'staging':
    case 'development':
    // Staging environment
    return {
      BASE_URL: 'https://taist.cloudupscale.com/mapi/',
      Photo_URL: 'https://taist.cloudupscale.com/assets/uploads/images/',
      HTML_URL: 'https://taist.cloudupscale.com/assets/uploads/html/',
    };
    
    case 'production':
    default:
    // Production environment
    return {
      BASE_URL: 'https://taist.codeupscale.com/mapi/',
      Photo_URL: 'https://taist.codeupscale.com/assets/uploads/images/',
      HTML_URL: 'https://taist.codeupscale.com/assets/uploads/html/',
    };
  }
};

const environmentUrls = getEnvironmentUrls();

export const BASE_URL = environmentUrls.BASE_URL;
export const Photo_URL = environmentUrls.Photo_URL;
export const HTML_URL = environmentUrls.HTML_URL;

// Log current environment for debugging
console.log('🌍 Environment:', APP_ENV);
console.log('🔗 API URL:', BASE_URL);

const API_KEY =
  "ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k";

export const GET_VERSION = BASE_URL + 'get-version'

// var API_TOKEN = '';

const APICODE = {
  success: 200,
  conditional: 201,
  error: 400,
};

////////////////////////////////////////////////////////////////////////////

export const GETVERSIONAPICALL = async () => {
  const headers = {
    "Content-Type": "application/json",
  };

  try {
    console.log("Full API URL:", GET_VERSION);
    console.log("Headers:", headers);

    var response = await axios.get(GET_VERSION, { headers: headers });
    console.log("<<<API Response", response.data);
    return response.data;
  } catch (error) {
    // console.error("<<<API Error", error.response?.status, error.response?.data || error.message);
    return { success: 0, message: "Some problems occurred. please try again." };
  }
};


export const GETAPICALL = async (endpoint: string, params: {}) => {
  const token = await ReadDataFromStorage("API_TOKEN"); // Ensure the token is fetched
  var url = BASE_URL + endpoint;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    apiKey: API_KEY,
  };

  try {
    var response = await axios.get(url, { headers: headers, params: params });
    console.log("<<<API Response", endpoint);
    return JSON.parse(JSON.stringify(response.data));
  } catch (error) {
    console.error("<<<API Error", endpoint, error);
    return { success: 0, message: "Some problems occurred. please try again." };
  } finally {
    // console.log('<<<Finial GET API');
  }
};

export const POSTAPICALL = async (
  endpoint: string,
  data: {} | FormData | URLSearchParams,
  headers?: {}
) => {
  const token = await ReadDataFromStorage("API_TOKEN"); // Ensure the token is fetched
  var url = BASE_URL + endpoint;
  headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Bearer ${token}`,
    apiKey: API_KEY,
    ...headers,
  };

  try {
    var response = await axios({ url, data, method: "post", headers });
    console.log("<<<API Response", endpoint);
    return JSON.parse(JSON.stringify(response.data));
  } catch (error) {
    console.error("<<<API Error", endpoint, data, error);
    return { success: 0, message: "Some problems occurred. please try again." };
  } finally {
    // console.log('<<<Finial POST API');
  }
};

export const DELETEAPICALL = async (
  endpoint: string,
  params: {} | FormData
) => {
  const token = await ReadDataFromStorage("API_TOKEN"); // Ensure the token is fetched
  var url = BASE_URL + endpoint;
  const headers = {
    "Content-Type": "multipart/form-data",
    Authorization: `Bearer ${token}`,
    apiKey: API_KEY,
  };

  try {
    var response = await axios.delete(url, { headers: headers, data: params });
    console.log("<<<API Response", endpoint, params);
    return JSON.parse(JSON.stringify(response.data));
  } catch (error) {
    console.error("<<<API Error", endpoint, error);
    return { success: 0, message: "Some problems occurred. please try again." };
  } finally {
    // console.log('<<<Finial DELETE API');
  }
};

/////////////////////////////////////////////////////////////////////

//////////-------User-------/////////////////////

export const LoginAPI = async (params: IUser, dispatch?: any) => {
  var response = await POSTAPICALL("login", params);
  console.log("LOGIN====", response);
  if (response.success == 0) {
    return response;
  }
  StoreDataToStorage("API_TOKEN", response.data.api_token);
  // await AsyncStorage.setItem('API_TOKEN', response.data.api_token);

  // API_TOKEN = response.data.api_token;

  if (params.remember) {
    await StoreLoginData({
      email: params.email,
      password: params.password,
      role: response?.data?.user?.user_type,
    });
  }
  dispatch(setUser(response.data.user));

  await GetAppliancesAPI({}, dispatch);
  await GetCategoriesAPI({}, dispatch);
  await GetAllergensAPI({}, dispatch);
  await GetUsersAPI({}, dispatch);
  await GetZipCodes({}, dispatch);
  if (response.data.user.user_type == 2) {
    await GetChefProfileAPI({ user_id: response.data.user.id }, dispatch);
    await GetChefMenusAPI({ user_id: response.data.user.id }, dispatch);
    const resp_paymentMethod = await GetPaymentMethodAPI();
    if (resp_paymentMethod.success == 1) {
      const tmp = resp_paymentMethod.data.find((x: IPayment) => x.active == 1);
      dispatch(updateChefPaymentMthod(tmp));
    }
  }

  const token = await GetFCMToken();

  if (token !== "") {
    const resp_fcmToken = await UpdateFCMTokenAPI(token);
  }

  Geolocation.getCurrentPosition(
    async (position) => {
      console.log("Geolocation", position, response.data.user.id);
      await UpdateUserAPI(
        {
          id: response.data.user.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        dispatch
      );
    },
    (error) => {
      console.warn("GelocationError", error);
    }
  );

  return response;
};

export const LogOutAPI = async () => {
  var response = await GETAPICALL("logout", {});
  return response;
};

export const RegisterAPI = async (params: IUser, dispatch?: any) => {
  const headers = {
    "Content-Type": "multipart/form-data",
  };
  const formData = ConvertObjectToFormdata(params);
  var response = await POSTAPICALL(`register`, formData, headers);
  if (response.success == 1 && dispatch) {
    dispatch(setUser(response.data));
  }
  return response;
};

export const ForgotAPI = async (email: string) => {
  var response = await POSTAPICALL("forgot", { email });
  return response;
};

export const ResetPasswordAPI = async ({ code, password }: any) => {
  var response = await POSTAPICALL("reset_password", { code, password });
  return response;
};

export const UpdatePasswordAPI = async ({ password }: any) => {
  const formData = new FormData();
  formData.append("password", password);
  var response = await POSTAPICALL("update_password", formData);
  return response;
};

export const BackgroundCheckAPI = async (params: any, dispatch?: any) => {
  var response = await POSTAPICALL(`background_check/${params.id}`, params);
  return response;
};

export const RemoveUserAPI = async (params: IUser) => {
  var response = await POSTAPICALL(`remove_user/${params.id}`, params);
  return response;
};

//////////-------Customer-------/////////////////////

export const GetCustomerOrdersAPI = async (
  params: { user_id: number; start_time: number; end_time: number },
  dispatch?: any
) => {
  var response = await GETAPICALL("get_orders_by_customer", params);
  if (response.success == 1 && dispatch) {
    dispatch(addOrUpdateOrders(response.data));
  }
  return response;
};

export const GetSearchChefAPI = async (
  params: {
    week_day?: number;
    category_id?: number;
    time_slot?: number;
    timezone_gap?: number;
    user_id: number;
  },
  dispatch?: any
) => {
  var response = await GETAPICALL(
    `get_search_chefs/${params?.user_id}`,
    params
  );
  if (response.success == 1 && dispatch) {
    response.data.map((item: any, index: number) => {
      dispatch(addOrUpdateUsers([item]));
      dispatch(addOrUpdateMenus(item.menus));
      dispatch(addOrUpdateReviews(item.reviews));
    });
  }
  return response;
};

export const GetChefMenusAPI = async (
  params: { user_id?: number; allergen?: number },
  dispatch?: any
) => {
  var response = await GETAPICALL("get_chef_menus", params);
  if (response.success == 1 && dispatch) {
    console.log("menus===>", response.data);
    dispatch(addOrUpdateMenus(response.data));
  }
  return response;
};

//////////-------Chef-------/////////////////////

export const GetChefOrdersAPI = async (
  params: { user_id: number; start_time: number; end_time: number },
  dispatch?: any
) => {
  const now_timex = moment().toDate().getTime() / 1000;
  const paramsx = {
    user_id: params.user_id,
    start_time: 0,
    end_time: now_timex,
  };

  var response = await GETAPICALL("get_orders_by_chef", paramsx);
  if (response.success == 1 && dispatch) {
    dispatch(addOrUpdateOrders(response.data));
  }
  return response;
};

export const GetChefProfileAPI = async (
  params: { user_id: number },
  dispatch?: any
) => {
  var response = await GETAPICALL("get_availability_by_user_id", params);
  if (response.success == 1 && dispatch) {
    dispatch(updateChefProfile(response.data));
  }
  return response;
};

// Done
export const GetEarningsAPI = async (id: any, dispatch?: any) => {
  var params = {}
  var res = await GetChefOrdersAPI(id, dispatch)
  var response = await GETAPICALL("get_earnings", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

export const GetOrderCountAPI = async (params: {}, dispatch?: any) => {
  var response = await GETAPICALL("get_order_count", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

//////////-------Common-------/////////////////////

export const GetNotifcationDataAPI = async (
  params: { user_id: number },
  dispatch?: any
) => {
  var response = await GETAPICALL(
    `get_notifications_by_id/${params.user_id}`,
    params
  );
  if (response.success == 1 && dispatch) {
    // addOrUpdateOrders([response.data]);
  }
  return response;
};

export const GetOrderDataAPI = async (
  params: { order_id: number },
  dispatch?: any
) => {
  console.log("GetOrderDataAPI orderID===>>>", params.order_id);
  var response = await GETAPICALL(`get_order_data/${params.order_id}`, params);
  if (response.success == 1 && dispatch) {
    // addOrUpdateOrders([response.data]);
  }
  return response;
};

export const CreateConverstationAPI = async (
  params: IMessage,
  dispatch?: any
) => {
  var response = await POSTAPICALL("create_conversation", params);
  if (response.success == 1 && dispatch) {
    addOrUpdateConverstations([response.data]);
  }
  return response;
};

export const GetConversationListAPI = async (
  params: { user_id?: number },
  dispatch?: any
) => {
  var response = await GETAPICALL("get_conversation_list_by_user_id", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

// user_id: other user id
export const GetConversationsByUserAPI = async (
  params: { user_id?: number },
  dispatch?: any
) => {
  var response = await GETAPICALL("get_conversations_by_user_id", params);
  if (response.success == 1 && dispatch) {
    addOrUpdateConverstations(response.data);
  }
  return response;
};

export const GetConversationsByOrderAPI = async (
  params: { order_id?: number },
  dispatch?: any
) => {
  var response = await GETAPICALL("get_conversations_by_order_id", params);
  if (response.success == 1 && dispatch) {
    addOrUpdateConverstations(response.data);
  }
  return response;
};

export const UpdateConverstationAPI = async (
  params: IMessage,
  dispatch?: any
) => {
  var response = await POSTAPICALL(`update_conversation/${params.id}`, params);
  if (response.success == 1 && dispatch) {
    dispatch(addOrUpdateConverstations([response.data]));
  }
  return response;
};

export const CreateReviewAPI = async (params: IReview, dispatch?: any) => {
  console.log("CreateReviewAPI===>>>", params);
  var response = await POSTAPICALL("create_review", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

export const GetReviewsAPI = async (
  params: { user_id?: number },
  dispatch?: any
) => {
  var response = await GETAPICALL("get_reviews_by_user_id", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

export const GetUsersAPI = async (params: {}, dispatch?: any) => {
  var response = await GETAPICALL("get_users", params);
  if (response.success == 1 && dispatch) {
    dispatch(addOrUpdateUsers(response.data));
  }
  return response;
};

export const GetAppliancesAPI = async (params: {}, dispatch?: any) => {
  var response = await GETAPICALL("get_appliances", params);
  if (response.success == 1 && dispatch) {
    dispatch(updateAppliances(response.data));
  }
  return response;
};
// ------->>>>> user by id
export const GetUserById = async (id: string) => {
  var response = await GETAPICALL("get_user/" + id, {});
  // if (response.success == 1 && dispatch) {
  //   dispatch(setUser(response.data));
  // }
  return response;
};

export const CreateCategoryAPI = async (
  params: {
    name: string;
  },
  dispatch?: any
) => {
  var response = await POSTAPICALL("create_category", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

export const GetCategoriesAPI = async (params: {}, dispatch?: any) => {
  var response = await GETAPICALL("get_categories", params);
  if (response.success == 1 && dispatch) {
    dispatch(updateCategories(response.data));
  }
  return response;
};

export const GetAllergensAPI = async (params: {}, dispatch?: any) => {
  var response = await GETAPICALL("get_allergens", params);
  if (response.success == 1 && dispatch) {
    dispatch(updateAllergen(response.data));
  }
  return response;
};

export const GetZipCodes = async (params: {}, dispatch?: any) => {
  var response = await GETAPICALL("get_zipcodes", params);
  if (response.success == 1 && dispatch) {
    dispatch(
      updateZipcodes(response.data.zipcodes.replace(/\s/g, "").split(","))
    );
  }
  return response;
};

export const CreateMenuAPI = async (params: IMenu, dispatch?: any) => {
  var response = await POSTAPICALL("create_menu", params);
  if (response.success == 1 && dispatch) {
    dispatch(addOrUpdateMenus([response.data]));
  }
  return response;
};

export const UpdateMenuAPI = async (params: IMenu, dispatch?: any) => {
  var response = await POSTAPICALL(`update_menu/${params.id}`, params);
  if (response.success == 1 && dispatch) {
    dispatch(addOrUpdateMenus([response.data]));
  }
  return response;
};

export const GetMenuAPI = async (params: { id: number }, dispatch?: any) => {
  var response = await GETAPICALL(`get_menu/${params.id}`, params);
  if (response.success == 1 && dispatch) {
    dispatch(addOrUpdateMenus([response.data]));
  }
  return response;
};

export const CreateCustomizationAPI = async (
  params: IMenuCustomization,
  dispatch?: any
) => {
  var response = await POSTAPICALL("create_customization", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

export const CreateAvailabiltyAPI = async (
  params: IChefProfile,
  dispatch?: any
) => {
  var response = await POSTAPICALL("create_availability", params);
  if (response.success == 1 && dispatch) {
    dispatch(updateChefProfile(response.data));
  }
  return response;
};

export const UpdateAvailabiltyAPI = async (
  params: IChefProfile,
  dispatch?: any
) => {
  var response = await POSTAPICALL(`update_availability/${params.id}`, params);
  if (response.success == 1 && dispatch) {
    dispatch(updateChefProfile(response.data));
  }
  return response;
};

export const UpdateUserAPI = async (params: IUser, dispatch?: any) => {
  const headers = {
    "Content-Type": "multipart/form-data",
  };
  const formData = ConvertObjectToFormdata(params);
  var response = await POSTAPICALL(
    `update_user/${params.id}`,
    formData,
    headers
  );
  if (response.success == 1 && dispatch) {
    dispatch(setUser(response.data));
    
    // Check if zip code changed and user entered service area
    if (response.zip_change_info?.entered_service_area) {
      // Refresh zip codes to get latest list
      await GetZipCodes({}, dispatch);
    }
  }
  return response;
};

export const CreateTicketAPI = async (
  params: { user_id: number; subject: string; message: string },
  dispatch?: any
) => {
  var response = await POSTAPICALL("create_ticket", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

export const CreateOrderAPI = async (params: IOrder, dispatch?: any) => {
  var response = await POSTAPICALL("create_order", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

export const UpdateOrderStatusAPI = async (params: IOrder, dispatch?: any) => {
  var response = await POSTAPICALL(`update_order_status/${params.id}`, params);
  if (response.success == 1 && dispatch) {
    dispatch(addOrUpdateOrders([response.data]));
  }
  return response;
};

export const AddPaymentMethodAPI = async (params: any, dispatch?: any) => {
  var response = await POSTAPICALL("add_payment_method", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

export const GetPaymentMethodAPI = async (params?: any, dispatch?: any) => {
  var response = await POSTAPICALL("get_payment_methods", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

export const DeletePaymentMethodAPI = async (params: any, dispatch?: any) => {
  var response = await POSTAPICALL("delete_payment_method", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

export const AddStripAccountAPI = async (
  params: { email: string },
  dispatch?: any
) => {
  var response = await POSTAPICALL("add_stripe_account", params);
  if (response.success == 1 && dispatch) {
    const resp_paymentMethod = await GetPaymentMethodAPI();
    if (resp_paymentMethod.success == 1) {
      const tmp = resp_paymentMethod.data.find((x: IPayment) => x.active == 1);
      dispatch(updateChefPaymentMthod(tmp));
    }
  }
  return response;
};

export const CreatePaymentIntentAPI = async (
  params: { order_id: number },
  dispatch?: any
) => {
  var response = await POSTAPICALL("create_payment_intent", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

export const CancelOrderPaymentAPI = async (
  params: { order_id: number },
  dispatch?: any
) => {
  console.log("CancelOrderPaymentAPI===>>>", params);
  var response = await POSTAPICALL("cancel_order_payment", params);
  if (response.success == 1 && dispatch) {
  }
  console.log("CancelOrderPaymentAPI Res===>>>", response);

  return response;
};

export const RejectOrderPaymentAPI = async (
  params: { order_id: number },
  dispatch?: any
) => {
  var response = await POSTAPICALL("reject_order_payment", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

export const CompleteOrderPaymentAPI = async (
  params: { order_id: number },
  dispatch?: any
) => {
  var response = await POSTAPICALL("complete_order_payment", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

export const TipOrderPaymentAPI = async (
  params: { order_id: number; tip_amount: number },
  dispatch?: any
) => {
  console.log("TipOrderPaymentAPI===>>>", params);
  var response = await POSTAPICALL("tip_order_payment", params);
  if (response.success == 1 && dispatch) {
  }
  return response;
};

//////////////////////////////////////////////////////

export const UpdateFCMTokenAPI = async (token: string) => {
  var response = await POSTAPICALL("update_fcm_token", { fcm_token: token });
  console.log("UpdateFCMTokenAPIgashjdhjasdj====>", response);
  return response;
};

export const VerifyPhoneAPI = async (phone_number: string) => {
  var response = await POSTAPICALL("verify_phone", { phone_number });
  return response;
};

///////////////////////////////////////////////////////

const ConvertObjectToFormdata = (obj: any) => {
  const formData = new FormData();
  for (var key in obj) {
    formData.append(key, obj[key]);
  }
  return formData;
};
