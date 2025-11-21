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

import ImagePicker from 'react-native-image-crop-picker';

interface Props extends ViewProps {
  content: any;
  onPhoto: (path: string) => void;
  onHide?: () => void;
}

const StyledPhotoPicker = ({style, content, onPhoto, onHide}: Props) => {
  const safeArea = useSafeAreaInsets();
  const actionSheetRef = useRef<ActionSheetRef>(null);

  const showSheet = () => {
    actionSheetRef.current?.show();
  };

  const hideSheet = useCallback(() => {
    actionSheetRef.current?.hide();
    if (onHide) onHide();
  }, []);

  const onLibrary = useCallback(() => {
    ImagePicker.openPicker({width: 256, height: 256, cropping: true})
      .then(image => {
        onPhoto(image.path ?? '');
      })
      .catch(err => {})
      .finally(() => {
        hideSheet();
      });
  }, [onPhoto]);

  const onCamera = useCallback(() => {
    ImagePicker.openCamera({width: 256, height: 256, cropping: true})
      .then(image => {
        onPhoto(image.path ?? '');
      })
      .catch(err => {})
      .finally(() => {
        hideSheet();
      });
  }, [onPhoto]);

  return (
    <>
      <TouchableOpacity onPress={showSheet}>{content}</TouchableOpacity>

      <ActionSheet
        ref={actionSheetRef}
        gestureEnabled
        containerStyle={{paddingBottom: safeArea.bottom + 30}}>
        <View style={{paddingVertical: 16}}>
          <TouchableOpacity onPress={onCamera} style={styles.button}>
            <Text style={styles.text}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onLibrary} style={styles.button}>
            <Text style={styles.text}>Library</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={hideSheet} style={styles.button}>
            <Text style={styles.text}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ActionSheet>
    </>
  );
};

const styles = StyleSheet.create({
  container: {},
  button: {
    height: 50,
    borderBottomWidth: 1,
    borderColor: 'grey',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#000',
  },
});

export default StyledPhotoPicker;
