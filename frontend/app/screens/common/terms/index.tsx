import {useEffect} from 'react';
import {SafeAreaView, ActivityIndicator, View} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {useNavigation} from '@react-navigation/native';
import {styles} from './styles';
import {HTML_URL} from '../../../services/api';

const Terms = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const openBrowser = async () => {
      await WebBrowser.openBrowserAsync(`${HTML_URL}terms.html`);
      navigation.goBack();
    };
    openBrowser();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.main}>
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    </SafeAreaView>
  );
};

export default Terms;
