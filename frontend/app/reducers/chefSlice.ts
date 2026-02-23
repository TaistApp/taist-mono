import {PayloadAction, createSlice} from '@reduxjs/toolkit';
import {IChefProfile, IOrder, IPayment} from '../types/index';

interface ChefState {
  profile: IChefProfile;
  paymentMehthod: IPayment;
  orders: Array<IOrder>;
  goLiveAutoOpen: 'tomorrow' | null;
}

const initialState: ChefState = {
  profile: {},
  paymentMehthod: {},
  orders: [],
  goLiveAutoOpen: null,
};

const getNewArr = (oldArr: Array<any>, payloadArr: Array<any>) => {
  var arr = [...oldArr];
  payloadArr.map((item, index) => {
    const sameIndex = arr.findIndex(
      x => x.id === item.id && x.id !== undefined,
    );
    if (sameIndex == -1) {
      arr = [...arr, item];
    } else {
      arr[sameIndex] = {...arr[sameIndex], ...item};
    }
  });
  return arr;
};

const chefSlicer = createSlice({
  name: 'Customer',
  initialState: initialState,
  reducers: {
    clearChef: state => {
      state.profile = {};
      state.paymentMehthod = {};
      state.orders = [];
    },
    updateChefProfile: (state, action: PayloadAction<IChefProfile>) => {
      state.profile = action.payload;
    },
    updateChefPaymentMthod: (state, action: PayloadAction<IPayment>) => {
      state.paymentMehthod = action.payload;
    },
    setGoLiveAutoOpen: (state, action: PayloadAction<'tomorrow'>) => {
      state.goLiveAutoOpen = action.payload;
    },
    clearGoLiveAutoOpen: (state) => {
      state.goLiveAutoOpen = null;
    },
  },
});

export const {clearChef, updateChefProfile, updateChefPaymentMthod, setGoLiveAutoOpen, clearGoLiveAutoOpen} =
  chefSlicer.actions;
export default chefSlicer.reducer;
