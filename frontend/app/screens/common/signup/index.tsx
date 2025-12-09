import { navigate } from '@/app/utils/navigation';
import { Text, TextInput } from 'react-native-paper';
import React, { useRef } from 'react';
import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import { IUser } from '../../../types/index';
import { ShowErrorToast } from '../../../utils/toast';
import { emailValidation, passwordValidation } from '../../../utils/validations';
import Onboarding from './onBoarding';
import { styles } from './styles';
import { ProgressIndicator } from './components/ProgressIndicator';
import { StepBasicProfile } from './steps/StepBasicProfile';
import { StepLocation } from './steps/StepLocation';
import { StepPreferences } from './steps/StepPreferences';
import { StepChefPhone } from './steps/StepChefPhone';
import { StepChefBasicInfo } from './steps/StepChefBasicInfo';
import { StepChefBirthday } from './steps/StepChefBirthday';
import { StepChefLocation } from './steps/StepChefLocation';
import { StepChefPhoto } from './steps/StepChefPhoto';
import { useAppDispatch } from '../../../hooks/useRedux';
import { showLoading, hideLoading } from '../../../reducers/loadingSlice';
import { RegisterAPI, LoginAPI } from '../../../services/api';

const Signup = () => {
  const dispatch = useAppDispatch();
  const [step, setStep] = React.useState(0);
  const [userType, setUserType] = React.useState(1);
  const [errors, setErrors] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');
  const [email, onChangeEmail] = React.useState('');
  const [password, onChangePassword] = React.useState('');
  const [userInfo, setUserInfo] = React.useState<IUser>({});
  const [showPassword, setShowPassword] = React.useState(false);

  // Refs for input fields to enable keyboard navigation
  const passwordInputRef = useRef<any>(null);

  const handleUserType = (selectedUserType: number) => {
    setUserType(selectedUserType);
    setUserInfo({ ...userInfo, user_type: selectedUserType });
    setStep(2);
  };

  const handleEmailPasswordSubmit = () => {
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

    // Update userInfo with email and password
    setUserInfo({ ...userInfo, email, password, user_type: userType });

    // Both customers and chefs now use multi-step flow
    if (userType === 1) {
      setStep(3); // Go to customer basic profile step
    } else {
      setStep(3); // Go to chef phone step
    }
  };

  const handleUpdateUserInfo = (updates: Partial<IUser>) => {
    setUserInfo({ ...userInfo, ...updates });
  };

  const handleCompleteSignup = async () => {
    // Register the user with minimal required info
    const registrationData: IUser = {
      ...userInfo,
      email,
      password,
      user_type: userType,
      is_pending: 0, // Customer doesn't need approval
      verified: 1,
    };

    dispatch(showLoading());
    try {
      const resp_register = await RegisterAPI(registrationData, dispatch);
      if (resp_register.success === 0) {
        dispatch(hideLoading());
        ShowErrorToast(resp_register.message ?? resp_register.error);
        return;
      }

      // Auto-login after registration
      const resp_login = await LoginAPI(
        { email, password, remember: true },
        dispatch
      );

      if (resp_login.success === 0) {
        dispatch(hideLoading());
        ShowErrorToast(resp_login.message ?? resp_login.error);
        return;
      }

      dispatch(hideLoading());

      // Navigate to customer home
      router.replace('/screens/customer/home');
    } catch (error) {
      dispatch(hideLoading());
      ShowErrorToast('An error occurred during signup. Please try again.');
      console.error('Signup error:', error);
    }
  };

  const handleChefCompleteSignup = async () => {
    // Register chef with all collected info
    const registrationData: IUser = {
      ...userInfo,
      email,
      password,
      user_type: userType,
      is_pending: 1, // Chef needs admin approval
      verified: 0, // Will be verified after approval
    };

    // Format photo for upload if it's a local path
    const photoPath = userInfo.photo;
    if (photoPath && photoPath.length > 0) {
      const isLocalPath = photoPath.indexOf('http://') !== 0 && photoPath.indexOf('https://') !== 0 && photoPath.length > 50;
      if (isLocalPath) {
        registrationData.photo = {
          uri: photoPath,
          type: 'image/jpeg',
          name: 'photo.jpg',
        } as any;
      }
    }

    dispatch(showLoading());
    try {
      const resp_register = await RegisterAPI(registrationData, dispatch);
      if (resp_register.success === 0) {
        dispatch(hideLoading());
        ShowErrorToast(resp_register.message ?? resp_register.error);
        return;
      }

      // Auto-login after registration
      const resp_login = await LoginAPI(
        { email, password, remember: true },
        dispatch
      );

      if (resp_login.success === 0) {
        dispatch(hideLoading());
        ShowErrorToast(resp_login.message ?? resp_login.error);
        return;
      }

      dispatch(hideLoading());

      // Navigate to chef home (they'll see pending approval message)
      router.replace('/screens/chef/(tabs)/home');
    } catch (error) {
      dispatch(hideLoading());
      ShowErrorToast('An error occurred during signup. Please try again.');
      console.error('Chef signup error:', error);
    }
  };

  const getTotalSteps = () => {
    // Customer: 5 steps (Onboarding, UserType, Email/Pass, Phone, Location, Preferences)
    // Chef: 7 steps (Onboarding, UserType, Email/Pass, Phone, BasicInfo, Birthday, Location, Photo)
    return userType === 1 ? 5 : 7;
  };

  const getCurrentStepNumber = () => {
    if (step === 0) return 1; // Onboarding
    if (step === 1) return 2; // User Type
    if (step === 2) return 3; // Email/Password
    
    // Customer flow (steps 3-5)
    if (userType === 1) {
      if (step === 3) return 4; // Phone
      if (step === 4) return 5; // Location
      if (step === 5) return 6; // Preferences
    }
    
    // Chef flow (steps 3-7)
    if (userType === 2) {
      if (step === 3) return 4; // Phone
      if (step === 4) return 5; // Basic Info
      if (step === 5) return 6; // Birthday
      if (step === 6) return 7; // Location
      if (step === 7) return 8; // Photo
    }
    
    return 1;
  };

  return (
    <KeyboardAwareScrollView 
      style={styles.container}
    >
        <View style={styles.center}>
          <Image
            style={styles.logo}
            source={require('../../../assets/images/logo-2.png')}
          />
        </View>

        {/* Show progress indicator for steps 2+ */}
        {step >= 2 && (
          <ProgressIndicator 
            currentStep={getCurrentStepNumber()} 
            totalSteps={getTotalSteps()} 
          />
        )}

        {/* Step 0: Onboarding */}
        {step === 0 && (
          <Onboarding
            onStart={() => {
              setStep(1);
            }}
          />
        )}

        {/* Step 1: User Type Selection */}
        {step === 1 && (
          <View style={styles.signupOptionWrapper}>
            <View style={styles.signupOption}>
              <Text style={styles.signupOptionHeading}>
                Have a taist for something?
              </Text>
              <Text style={styles.signupOptionText}>
                Choose from people in your area to craft delicious dishes out of
                your kitchen.
              </Text>
              <Pressable style={styles.button} onPress={() => handleUserType(1)}>
                <Text style={styles.buttonText}>I am a customer</Text>
              </Pressable>
            </View>
            <View style={styles.signupOption}>
              <Text style={styles.signupOptionHeading}>
                Looking to bring a new taist?
              </Text>
              <Text style={styles.signupOptionText}>
                Be your own boss and create something special for people right
                from their kitchen.
              </Text>
              <Pressable style={styles.button} onPress={() => handleUserType(2)}>
                <Text style={styles.buttonText}>I want to be a chef</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Step 2: Email & Password */}
        {step === 2 && (
          <>
          <View style={styles.formContainer}>
            <View>
              <Text style={styles.heading}>Sign Up</Text>
              <Text style={styles.subheading}>Create your account to get started</Text>
            </View>
            <View style={styles.formContent}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  placeholder="Enter your email"
                  placeholderTextColor={'#999999'}
                  mode="outlined"
                  onChangeText={txt => onChangeEmail(txt.toLowerCase())}
                  value={email}
                  keyboardType="email-address"
                  autoCapitalize={'none'}
                  style={styles.input}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    passwordInputRef.current?.focus();
                  }}
                  blurOnSubmit={false}
                />
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  ref={passwordInputRef}
                  placeholder="Enter your password"
                  placeholderTextColor={'#999999'}
                  mode="outlined"
                  onChangeText={onChangePassword}
                  value={password}
                  textContentType="password"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={handleEmailPasswordSubmit}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
              </View>
            </View>
          </View>
          <View style={styles.buttonContainer}>
              <Pressable style={styles.signupButton} onPress={handleEmailPasswordSubmit}>
                <Text style={styles.signupButtonText}>Continue</Text>
            </Pressable>
            <Pressable
              style={styles.loginLink}
              onPress={() => navigate.toCommon.login()}>
              <Text style={styles.loginLinkText}>Already have an account? Log in</Text>
            </Pressable>
          </View>
          <View style={styles.termsContainer}>
            <View style={styles.terms}>
              <Text style={styles.termsText}>By signing up, you agree to Taist's </Text>
              <Text
                style={styles.termsLink}
                onPress={() => navigate.toCommon.terms()}>
                Terms and Conditions
              </Text>
            </View>
          </View>
          </>
        )}

      {/* Step 3: Basic Profile (Customer only) */}
      {step === 3 && userType === 1 && (
        <StepBasicProfile
          userInfo={userInfo}
          onUpdateUserInfo={handleUpdateUserInfo}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {/* Step 4: Location (Customer only) */}
      {step === 4 && userType === 1 && (
        <StepLocation
          userInfo={userInfo}
          onUpdateUserInfo={handleUpdateUserInfo}
          onNext={() => setStep(5)}
          onBack={() => setStep(3)}
        />
      )}

      {/* Step 5: Preferences (Customer only) */}
      {step === 5 && userType === 1 && (
        <StepPreferences
          userInfo={userInfo}
          onComplete={handleCompleteSignup}
          onBack={() => setStep(4)}
        />
      )}

      {/* Chef Multi-Step Flow */}
      
      {/* Step 3: Phone (Chef only) */}
      {step === 3 && userType === 2 && (
        <StepChefPhone
          userInfo={userInfo}
          onUpdateUserInfo={handleUpdateUserInfo}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {/* Step 4: Basic Info (Chef only) */}
      {step === 4 && userType === 2 && (
        <StepChefBasicInfo
          userInfo={userInfo}
          onUpdateUserInfo={handleUpdateUserInfo}
          onNext={() => setStep(5)}
          onBack={() => setStep(3)}
        />
      )}

      {/* Step 5: Birthday (Chef only) */}
      {step === 5 && userType === 2 && (
        <StepChefBirthday
          userInfo={userInfo}
          onUpdateUserInfo={handleUpdateUserInfo}
          onNext={() => setStep(6)}
          onBack={() => setStep(4)}
        />
      )}

      {/* Step 6: Location (Chef only) */}
      {step === 6 && userType === 2 && (
        <StepChefLocation
          userInfo={userInfo}
          onUpdateUserInfo={handleUpdateUserInfo}
          onNext={() => setStep(7)}
          onBack={() => setStep(5)}
        />
      )}

      {/* Step 7: Photo (Chef only) - REQUIRED */}
      {step === 7 && userType === 2 && (
        <StepChefPhoto
          userInfo={userInfo}
          onUpdateUserInfo={handleUpdateUserInfo}
          onNext={handleChefCompleteSignup}
          onBack={() => setStep(6)}
        />
      )}
    </KeyboardAwareScrollView>
  );
};

export default Signup;
