import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// NPM

// Types & Services

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import { goBack } from '@/app/utils/navigation';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import StyledButton from '../../../components/styledButton';
import StyledTextInput from '../../../components/styledTextInput';
import Container from '../../../layout/Container';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { CreateTicketAPI } from '../../../services/api';
import { ShowSuccessToast } from '../../../utils/toast';
import { styles } from './styles';

const ContactUs = () => {
  const self = useAppSelector(x => x.user.user);
  const dispatch = useAppDispatch();

  const [errors, setErrors] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [name, onChangeName] = useState('');
  const [email, onChangeEmail] = useState('');
  const [phoneNumber, onChangePhoneNumber] = useState('');
  const [subject, onChangeSubject] = useState('');
  const [message, onChangeMessage] = useState('');

  const handleSave = async () => {
    dispatch(showLoading());
    const resp = await CreateTicketAPI(
      {user_id: self.id ?? 0, subject, message},
      dispatch,
    );
    dispatch(hideLoading());
    if (resp.success == 1) {
      ShowSuccessToast('Submitted a subject');
      goBack();
    }
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container backMode={true} title="Contact Us">
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
            <StyledButton title={'SUBMIT'} onPress={() => handleSave()} />
          </View>
        </KeyboardAwareScrollView>
      </Container>
    </SafeAreaView>
  );
};

export default ContactUs;
