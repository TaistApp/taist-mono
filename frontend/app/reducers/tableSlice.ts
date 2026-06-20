import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {
  IAllergy,
  ICategory,
  IMenu,
  IOrder,
  IUser,
  IReview,
  IMessage,
} from '../types/index';

interface TablesState {
  users: Array<IUser>;
  categories: Array<ICategory>;
  allergens: Array<IAllergy>;
  zipcodes: Array<string>;
  orders: Array<IOrder>;
  menus: Array<IMenu>;
  reviews: Array<IReview>;
  conversations: Array<IMessage>;
}

const initialState: TablesState = {
  users: [],
  categories: [],
  allergens: [],
  zipcodes: [],
  orders: [],
  menus: [],
  reviews: [],
  conversations: [],
};

const getNewArr = (oldArr: Array<any>, payloadArr: Array<any>) => {
  var arr = [...oldArr];
  payloadArr.map((item, index) => {
    const sameIndex = arr.findIndex(
      x => x?.id !== undefined && x?.id === item.id,
    );
    if (sameIndex == -1) {
      arr = [...arr, item];
    } else {
      arr[sameIndex] = {...arr[sameIndex], ...item};
    }
  });
  return arr;
};

const tablesSlicer = createSlice({
  name: 'tables',
  initialState: initialState,
  reducers: {
    clearTable: state => {
      state.users = [];
      state.categories = [];
      state.allergens = [];
      state.zipcodes = [];
      state.orders = [];
      state.menus = [];
      state.reviews = [];
      state.conversations = [];
    },
    addOrUpdateUsers: (state, action: PayloadAction<Array<IUser>>) => {
      var arr = getNewArr([...state.users], action.payload);
      state.users = [...arr];
    },

    updateUsers: (state, action: PayloadAction<Array<IUser>>) => {
      state.users = [...action.payload];
    },

    updateCategories: (state, action: PayloadAction<Array<ICategory>>) => {
      const categories_status2 = action.payload.filter(x => x.status == 2);
      // Guard against duplicate cuisine chips: collapse same-named categories
      // (case-insensitive, ignoring surrounding whitespace), keeping the first
      // occurrence. The API returns categories ordered by id ascending, so this
      // keeps the lowest id — matching the backend de-dupe.
      const seen = new Set<string>();
      const deduped = categories_status2.filter(x => {
        const key = (x.name ?? '').trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      state.categories = [...deduped];
    },

    updateAllergen: (state, action: PayloadAction<Array<IAllergy>>) => {
      state.allergens = [...action.payload];
    },

    updateZipcodes: (state, action: PayloadAction<Array<string>>) => {
      state.zipcodes = [...action.payload];
    },

    addOrUpdateOrders: (state, action: PayloadAction<Array<IOrder>>) => {
      var arr = getNewArr([...state.orders], action.payload);
      state.orders = [...arr];
    },

    updateOrders: (state, action: PayloadAction<Array<IOrder>>) => {
      state.orders = [...action.payload];
    },

    addOrUpdateMenus: (state, action: PayloadAction<Array<IMenu>>) => {
      var arr = getNewArr([...state.menus], action.payload);
      state.menus = [...arr];
    },

    updateMenus: (state, action: PayloadAction<Array<IMenu>>) => {
      state.menus = [...action.payload];
    },

    addOrUpdateReviews: (state, action: PayloadAction<Array<IReview>>) => {
      var arr = getNewArr([...state.reviews], action.payload);
      state.reviews = [...arr];
    },
    addOrUpdateConverstations: (
      state,
      action: PayloadAction<Array<IMessage>>,
    ) => {
      var arr = getNewArr([...state.conversations], action.payload);
      state.conversations = [...arr];
    },
  },
});

export const {
  clearTable,
  addOrUpdateUsers,
  updateUsers,
  updateCategories,
  updateAllergen,
  updateZipcodes,
  addOrUpdateOrders,
  updateOrders,
  addOrUpdateMenus,
  updateMenus,
  addOrUpdateReviews,
  addOrUpdateConverstations,
} = tablesSlicer.actions;

export default tablesSlicer.reducer;
