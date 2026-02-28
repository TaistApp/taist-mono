import {useEffect} from 'react';
import {SafeAreaView, ActivityIndicator, View, InteractionManager} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {useNavigation} from '@react-navigation/native';
import {styles} from './styles';
import {HTML_URL} from '../../../services/api';

const Privacy = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        await WebBrowser.openBrowserAsync(`${HTML_URL}privacy.html`);
      } finally {
        navigation.goBack();
      }
    });
    return () => task.cancel();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.main}>
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    </SafeAreaView>
  );
};

export default Privacy;
