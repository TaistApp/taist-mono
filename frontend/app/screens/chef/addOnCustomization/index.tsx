import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View
} from 'react-native';

// NPM
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLocalSearchParams } from 'expo-router';

// Types & Services
import { NavigationStackType } from '../../../types/index';

// Hooks
import { useAppDispatch } from '../../../hooks/useRedux';

import StyledButton from '../../../components/styledButton';
import StyledTextInput from '../../../components/styledTextInput';
import Container from '../../../layout/Container';
import { convertStringToNumber } from '../../../utils/functions';
import { goBack } from '../../../utils/navigation';
import { styles } from './styles';

type PropsType = NativeStackScreenProps<NavigationStackType>;

const AddOnCustomization = () => {
  const dispatch = useAppDispatch();

  const params = useLocalSearchParams();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [upcharge, setUpcharge] = useState('');

  const handleSave = () => {
    // Get the callback from global storage
    const callback = (global as any).onAddCustomizationCallback;
    if (callback) {
      callback({
        name,
        description,
        upcharge_price: convertStringToNumber(upcharge),
      });
      // Clear the callback after use
      (global as any).onAddCustomizationCallback = null;
    }
    goBack();
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container
        backMode
        title="Add-ons"
        containerStyle={{marginBottom: 0}}>
        <ScrollView contentContainerStyle={styles.pageView}>
          <StyledTextInput
            label="* Name "
            placeholder="* Name "
            onChangeText={setName}
            value={name}
          />
          {/* <StyledTextInput
            label="* Description "
            placeholder="* Description "
            onChangeText={setDescription}
            value={description}
          /> */}
          <StyledTextInput
            label="* Upcharge ($) "
            placeholder="* Upcharge ($) "
            onChangeText={setUpcharge}
            onEndEditing={() => {
              setUpcharge(convertStringToNumber(upcharge).toFixed(2));
            }}
            value={upcharge}
            keyboardType={'decimal-pad'}
          />

          <View style={styles.submitContainer}>
            <StyledButton
              title={'SAVE '}
              onPress={() => {
                handleSave();
              }}
            />
          </View>
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
};

export default AddOnCustomization;
