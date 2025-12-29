import { Button, IconButton, Text, TextInput } from '@react-native-material/core';
import React, { useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { navigate } from '@/app/utils/navigation';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import { useAppDispatch } from '../../../hooks/useRedux';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { LoginAPI } from '../../../services/api';
import { ShowErrorToast } from '../../../utils/toast';
import { emailValidation, passwordValidation } from '../../../utils/validations';
import { styles } from './styles';

const Login = () => {
  const dispatch = useAppDispatch();

  const [errors, setErrors] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');
  const [email, onChangeEmail] = React.useState('');
  const [password, onChangePassword] = React.useState('');
  const [visiblePassword, onChangeVisiblePassword] = useState(false);
  const [chefMode, onChangeChefMode] = useState(false);
  const [pendingChef, onChangePending] = useState(false);
  
  // Refs for input fields to enable keyboard navigation
  const passwordInputRef = useRef<any>(null);

  const handleLogin = async () => {
    var errorMsg = emailValidation(email);
    if (errorMsg !== '') {
      ShowErrorToast(errorMsg);
      return;
    }
    errorMsg = passwordValidation(password);
    if (errorMsg !== '') {
      ShowErrorToast(errorMsg);
      return;
    }

    dispatch(showLoading());
    try {
      const resp = await LoginAPI({email, password, remember: true}, dispatch);

      if (resp.success == 0) {
        ShowErrorToast(resp.message ?? resp.error);
        return;
      }

      // Navigate to appropriate home screen based on user type
      if (resp.data?.user?.user_type == 1) {
        navigate.toAuthorizedStacks.customerAuthorized();
      } else {
        navigate.toAuthorizedStacks.chefAuthorized();
      }
    } catch (error) {
      console.error('Login error:', error);
      ShowErrorToast('Login failed. Please try again.');
    } finally {
      dispatch(hideLoading());
    }
  };

  const handleForgot = async () => {
   navigate.toCommon.forget(); // Update when forgot route is available
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={{flexGrow: 1}}
    >
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Image
          style={styles.logo}
          source={require('../../../assets/images/logo-2.png')}
        />
      </View>

      {/* Welcome Text */}
      <View style={{marginBottom: 32}}>
        <Text style={styles.welcomeText}>Welcome back</Text>
        <Text style={styles.subtitleText}>Sign in to continue</Text>
      </View>

      {/* Form Section */}
      <View style={styles.formContainer}>
        {/* Email Input */}
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Email</Text>
          {/* @ts-ignore - TextInput from @react-native-material/core has different props */}
          <TextInput
            style={styles.formFields}
            inputStyle={styles.formInputFields}
            placeholder="Enter your email"
            placeholderTextColor={'#999999'}
            variant="outlined"
            onChangeText={txt => onChangeEmail(txt.toLowerCase())}
            value={email}
            keyboardType="email-address"
            color="#1a1a1a"
            autoCapitalize={'none'}
            returnKeyType="next"
            onSubmitEditing={() => {
              // Move focus to password field when user presses "Next"
              passwordInputRef.current?.focus();
            }}
            blurOnSubmit={false}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            // @ts-expect-error - TextInput from @react-native-material/core doesn't have ref in types but works at runtime
            ref={passwordInputRef as any}
            style={styles.formFields}
            inputStyle={styles.formInputFields}
            placeholder="Enter your password"
            placeholderTextColor={'#999999'}
            variant="outlined"
            onChangeText={onChangePassword}
            value={password}
            textContentType="password"
            secureTextEntry={!visiblePassword}
            color="#1a1a1a"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            blurOnSubmit={true}
            trailing={props => (
              <IconButton
                icon={props => (
                  <Image
                    style={{
                      width: 20,
                      height: 20,
                      resizeMode: 'contain',
                      tintColor: '#666666',
                    }}
                    source={
                      visiblePassword
                        ? require('../../../assets/icons/icon_invisible.png')
                        : require('../../../assets/icons/icon_visible.png')
                    }
                  />
                )}
                onPress={() => {
                  onChangeVisiblePassword(!visiblePassword);
                }}
                {...props}
              />
            )}
          />
        </View>

        {/* Forgot Password */}
        <View style={styles.forgotContainer}>
          <Pressable style={styles.forgotButton} onPress={handleForgot}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>
        </View>
      </View>

      {/* Login Button */}
      <Pressable style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>Log In</Text>
      </Pressable>

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.divider} />
      </View>

      {/* Sign Up Link */}
      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Don't have an account?</Text>
        <Pressable style={styles.signupButton} onPress={() => navigate.toCommon.signup()}>
          <Text style={styles.signupButtonText}>Sign Up</Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
};

export default Login;
