import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import {
  Pressable,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle
} from 'react-native';
import styles from './styles';
 
export enum InputType {
  Default = 'default',
  Password = 'password',
}

interface Props extends TextInputProps {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  type?: InputType;
  textInputStyle?: StyleProp<TextStyle> | any;
  onPress?: () => void;
  prefix?: string;
}

const StyledTextInput = forwardRef(
  (
    {
      label,
      type,
      containerStyle,
      textInputStyle,
      placeholderTextColor = 'rgba(255,255,255,0.5)',
      onPress,
      ...props
    }: Props,
    ref,
  ) => {
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [isFocused, setFocused] = useState(false);
    const [secureTextEntry, setSecureTextEntry] = useState(
      type === InputType.Password,
    );

    const internalInputRef = useRef<any>(null);

    const onBlur = () => {
      setFocused(false);
    };

    useImperativeHandle(ref, () => ({
      blur: () => {
        internalInputRef.current.blur();
      },
      focus: () => {
        internalInputRef.current.focus();
      },
    }));

    const onFocus = () => {
      setFocused(true);
      setScrollEnabled(false);

      setTimeout(() => {
        setScrollEnabled(true);
      }, 1000);
    };

    const onEyePress = () => {
      setSecureTextEntry(!secureTextEntry);
    };

    if (type === InputType.Password) {
      textInputStyle = {
        ...textInputStyle,
        // paddingLeft: dimensions.size.tiny,
        // paddingRight: dimensions.size.large_32,
      };
    }

    return (
      <Pressable
        style={[
          styles.container,
          label != undefined && {marginTop: 10},
          containerStyle,
        ]}
        onPress={onPress}>
        <TextInput
          style={[
            styles.textInput,
            label != undefined && {paddingTop: 20},
            textInputStyle,
          ]}
          placeholderTextColor={placeholderTextColor}
          editable={onPress == undefined}
          pointerEvents={onPress ? 'none' : 'auto'}
          {...props}
        />
        {label && (
          <View style={styles.labelContainer}>
            <Text style={styles.label}>{label}</Text>
          </View>
        )}
      </Pressable>
    );
  },
);

export default StyledTextInput;
