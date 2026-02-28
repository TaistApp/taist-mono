import { CardField } from '@stripe/stripe-react-native';
import { useState } from 'react';
import {
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Container from '../../../layout/Container';
import GlobalStyles from '../../../types/styles';
import { styles } from './styles';

const CreditCard = ({navigation, route}: any) => {
  const [details, setDetails] = useState({});
  const colorScheme = useColorScheme();
  const handleAdd = () => {
    if (route.params?.addCard) {
      route.params.addCard(details);
    }
    navigation.goBack();
  };
  return (
    <SafeAreaView style={styles.main}>
      <Container>
        <View style={{flex: 1}}>
          <View style={{flex: 1, paddingVertical: 20}}>
            <CardField
              postalCodeEnabled
              placeholders={{number: '4242 4242 4242 4242'}}
              cardStyle={{
                backgroundColor: colorScheme === 'dark' ? '#000000' : '#ffffff',
                textColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
                placeholderColor: '#999999',
              }}
              style={{height: 100}}
              onCardChange={setDetails}
            />
          </View>
          <View style={[{padding: 10}]}>
            <TouchableOpacity style={GlobalStyles.btn} onPress={handleAdd}>
              <Text style={GlobalStyles.btnTxt}>ADD </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Container>
    </SafeAreaView>
  );
};

export default CreditCard;
