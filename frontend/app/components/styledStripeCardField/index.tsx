import React, {memo, useCallback, useRef, useState} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewProps,
} from 'react-native';
import ActionSheet, {ActionSheetRef} from 'react-native-actions-sheet';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {CardField} from '@stripe/stripe-react-native';

interface Props extends ViewProps {
  content: any;
  onAddCard: (detail: any) => void;
}

const StyledStripeCardField = ({style, content, onAddCard}: Props) => {
  const safeArea = useSafeAreaInsets();
  const actionSheetRef = useRef<ActionSheetRef>(null);

  const [details, setDetails] = useState({});

  const showSheet = () => {
    actionSheetRef.current?.show();
  };

  const hideSheet = () => {
    actionSheetRef.current?.hide();
  };

  const addCard = () => {
    onAddCard(details);
    hideSheet();
  };

  return (
    <>
      <TouchableOpacity onPress={showSheet}>{content}</TouchableOpacity>

      <CardField
        postalCodeEnabled
        placeholders={{number: '4242 4242 4242 4242'}}
        cardStyle={{
          backgroundColor: '#000000',
          textColor: '#000000',
          placeholderColor: '#999999',
        }}
        style={styles.cardStyle}
        onCardChange={setDetails}
      />
      {/* <ActionSheet
        ref={actionSheetRef}
        gestureEnabled
        containerStyle={{paddingBottom: safeArea.bottom + 30}}>
        <View style={{padding: 16}}>
          <CardField
            postalCodeEnabled
            placeholders={{number: '4242 4242 4242 4242'}}
            cardStyle={{
              backgroundColor: '#ffffff',
              textColor: '#000000',
            }}
            style={styles.cardStyle}
            onCardChange={setDetails}
          />
          <TouchableOpacity onPress={addCard} style={styles.btn}>
            <Text style={styles.btnTxt}>Add Card</Text>
          </TouchableOpacity>
        </View>
      </ActionSheet> */}
    </>
  );
};

const styles = StyleSheet.create({
  container: {},
  cardStyle: {
    width: '100%',
    height: 100,
  },
  text: {
    color: '#000000',
  },
  btn: {
    borderRadius: 20,
    backgroundColor: '#feffff',
    shadowColor: '#000000',
    shadowOffset: {width: 2.5, height: 2.5},
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    width: '100%',
    padding: 12,
    marginBottom: 5,
  },
  btnTxt: {
    color: '#fa4616',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default StyledStripeCardField;
