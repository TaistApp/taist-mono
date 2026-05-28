import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from 'redux-persist';

import chefReducer from '../reducers/chefSlice';
import customerReducer from '../reducers/customerSlice';
import deviceReducer from '../reducers/deviceSlice';
import homeLoadingReducer from '../reducers/home_loading_slice';
import loadingReducer from '../reducers/loadingSlice';
import notificationReducer from '../reducers/notificationSlice';
import tableReducer from '../reducers/tableSlice';
import userReducer from '../reducers/userSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  blacklist: ['loading', 'homeLoaer'], // Don't persist loading states - they should always start as false
};

const appReducer = combineReducers({
  user: userReducer,
  loading: loadingReducer,
  homeLoaer:homeLoadingReducer,
  device: deviceReducer,
  table: tableReducer,
  customer: customerReducer,
  chef: chefReducer,
  notification: notificationReducer,
});

const rootReducer = (state: any, action: any) => {
  if (action.type === 'USER_LOGOUT') {
    // Reset the state of each reducer
    Object.keys(state).forEach(key => {
      state[key] = undefined;
    });
  }
  return appReducer(state, action);
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  // devTools: process.env.NODE_ENV !== 'production',
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;