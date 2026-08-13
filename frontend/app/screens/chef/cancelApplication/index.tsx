import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Types & Services
import { IUser } from '../../../types/index';

// Reducers
import { setUser } from '../../../reducers/userSlice';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import StyledButton from '../../../components/styledButton';
import StyledSwitch from '../../../components/styledSwitch';
import Container from '../../../layout/Container';
import { clearChef } from '../../../reducers/chefSlice';
import { clearCustomer } from '../../../reducers/customerSlice';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { clearTable } from '../../../reducers/tableSlice';
import { UpdateUserAPI } from '../../../services/api';
import { reset } from '../../../utils/navigation';
import { ShowInfoToast } from '../../../utils/toast';
import { styles } from './styles';


const CancelApplication = () => {
  const self = useAppSelector(x => x.user.user);
  const dispatch = useAppDispatch();

  const [agree, onChangeAgree] = useState(false);

  const handleToCustomer = async () => {
    var params: IUser = {...self, user_type: 1, is_pending: 0};
    dispatch(showLoading());
    const resp = await UpdateUserAPI(params, dispatch);
    dispatch(hideLoading());
    if (resp.success == 1) {
      ShowInfoToast('Logging in as customer');
      dispatch(setUser({}));
      dispatch(clearTable());
      dispatch(clearChef());
      dispatch(clearCustomer());
      reset('/screens/common/splash');
    }
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container backMode title="Cancel Application to Cook">
        <ScrollView contentContainerStyle={styles.pageView}>
          <View style={styles.switchWrapper}>
            <Text style={styles.agreeText}>
              {`Cancel your application to cook with Taist? `}
            </Text>
            <StyledSwitch
              label="Yes "
              value={agree}
              onPress={() => onChangeAgree(!agree)}
            />
          </View>
          <View style={styles.vcenter}>
            <StyledButton
              title={'SAVE '}
              onPress={() => handleToCustomer()}
              disabled={!agree}
            />
          </View>
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
};

export default CancelApplication;
