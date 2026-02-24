import { useState} from 'react';
import {SafeAreaView} from 'react-native';
import {View} from 'react-native';
// Hooks
import {useAppDispatch, useAppSelector} from '../../../hooks/useRedux';

import {styles} from './styles';
import Container from '../../../layout/Container';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import StyledTextInput from '../../../components/styledTextInput';
import StyledButton from '../../../components/styledButton';
import {hideLoading, showLoading} from '../../../reducers/loadingSlice';
import {CreateTicketAPI} from '../../../services/api';
import {ShowSuccessToast} from '../../../utils/toast';
import { goBack } from '@/app/utils/navigation';


const Feedback = () => {
  const self = useAppSelector(x => x.user.user);
  const dispatch = useAppDispatch();

  const [subject, onChangeSubject] = useState('');
  const [message, onChangeMessage] = useState('');

  const handleSave = async () => {
    console.log('Submitted a feedback!');
    dispatch(showLoading());
    const resp = await CreateTicketAPI(
      {user_id: self.id ?? 0, subject, message},
      dispatch,
    );
    dispatch(hideLoading());
    if (resp.success == 1) {
      ShowSuccessToast('Submitted a feedback');
     goBack();
    }
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container
        backMode={self.user_type == 1 ? false : true}
        title="Feedback and Suggestions">
        <KeyboardAwareScrollView contentContainerStyle={styles.pageView}>
          <StyledTextInput
            label="Subject "
            placeholder="Subject "
            onChangeText={onChangeSubject}
            value={subject}
          />
          <StyledTextInput
            label="Message "
            placeholder="Message "
            onChangeText={onChangeMessage}
            value={message}
            multiline
          />
          <View style={styles.vcenter}>
            <StyledButton title={'SAVE '} onPress={() => handleSave()} />
          </View>
        </KeyboardAwareScrollView>
      </Container>
    </SafeAreaView>
  );
};

export default Feedback;
