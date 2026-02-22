import { CardField } from '@stripe/stripe-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Container from '../../../../../layout/Container';
import GlobalStyles from '../../../../../types/styles';

const CreditCard = () => {
  const [details, setDetails] = useState({});
  const colorScheme = useColorScheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const handleAdd = async () => {
    console.log('CreditCard: handleAdd called with details:', details);
    // Get the callback from global storage
    const addCardCallback = (global as any).handleAddPaymentCardCallback;
    
    console.log('CreditCard: Found callback:', typeof addCardCallback);
    
    if (addCardCallback && typeof addCardCallback === 'function') {
      try {
        console.log('CreditCard: Calling payment callback...');
        // Call the callback with the card details
        await addCardCallback(details);
        // Clear the callback after use
        delete (global as any).handleAddPaymentCardCallback;
        console.log('CreditCard: Callback completed successfully');
      } catch (error) {
        console.error('CreditCard: Error in addCardCallback:', error);
      }
    } else {
      console.log('CreditCard: No callback found or invalid callback type');
    }
    
    console.log('CreditCard: Navigating back...');
    router.back();
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: colorScheme === 'dark' ? '#000000' : '#ffffff'}}>
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
              <Text style={GlobalStyles.btnTxt}>ADD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Container>
    </SafeAreaView>
  );
};

export default CreditCard;
