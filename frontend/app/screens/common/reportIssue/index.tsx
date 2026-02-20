import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useLocalSearchParams, usePathname } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Platform, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { goBack } from '@/app/utils/navigation';
import StyledPhotoPicker from '../../../components/styledPhotoPicker';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import StyledButton from '../../../components/styledButton';
import StyledTextInput from '../../../components/styledTextInput';
import Container from '../../../layout/Container';
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { CreateIssueReportAPI } from '../../../services/api';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';
import { styles } from './styles';

const ReportIssue = () => {
  const self = useAppSelector(x => x.user.user);
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const params = useLocalSearchParams<{
    origin_screen?: string | string[];
    entry_point?: string | string[];
  }>();

  const originScreen = useMemo(() => {
    const raw = params.origin_screen;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return (value || 'unknown').toString();
  }, [params.origin_screen]);

  const entryPoint = useMemo(() => {
    const raw = params.entry_point;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return (value || 'unknown').toString();
  }, [params.entry_point]);

  const [subject, setSubject] = useState('Issue Report');
  const [message, setMessage] = useState('');
  const [screenshotPath, setScreenshotPath] = useState('');

  const appVersion = useMemo(() => {
    return Constants.expoConfig?.version || Constants.nativeAppVersion || 'unknown';
  }, []);

  const appBuild = useMemo(() => {
    return Constants.expoConfig?.ios?.buildNumber
      || Constants.expoConfig?.android?.versionCode?.toString()
      || Constants.nativeBuildVersion
      || 'unknown';
  }, []);

  const deviceModel = Device.modelName || 'unknown';
  const osVersion = `${Platform.OS} ${String(Platform.Version)}`;
  const appEnv = Constants.expoConfig?.extra?.APP_ENV || 'production';

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      ShowErrorToast('Subject and message are required');
      return;
    }

    dispatch(showLoading());
    const resp = await CreateIssueReportAPI(
      {
        user_id: self?.id ?? 0,
        subject: subject.trim(),
        message: message.trim(),
        issue_type: 'issue_report',
        current_screen: pathname || 'unknown',
        origin_screen: originScreen,
        entry_point: entryPoint,
        device_model: deviceModel,
        device_os: osVersion,
        platform: Platform.OS,
        app_version: appVersion,
        app_build: appBuild,
        app_env: appEnv,
        client_timestamp: new Date().toISOString(),
        screenshot_uri: screenshotPath || undefined,
      },
      dispatch,
    );
    dispatch(hideLoading());

    if (resp.success === 1) {
      ShowSuccessToast('Issue submitted');
      goBack();
      return;
    }

    ShowErrorToast(resp.error || resp.message || 'Failed to submit issue');
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container backMode={true} title="Report Issue">
        <KeyboardAwareScrollView contentContainerStyle={styles.pageView}>
          <StyledTextInput
            label="Subject"
            placeholder="What went wrong?"
            onChangeText={setSubject}
            value={subject}
          />
          <StyledTextInput
            label="Describe the issue"
            placeholder="Include what you expected and what happened."
            onChangeText={setMessage}
            value={message}
            multiline
          />

          <Text style={styles.sectionTitle}>Optional screenshot</Text>
          <StyledPhotoPicker
            onPhoto={setScreenshotPath}
            content={
              <View style={styles.photoButton}>
                <Text style={styles.photoButtonText}>
                  {screenshotPath ? 'Change Screenshot' : 'Add Screenshot'}
                </Text>
              </View>
            }
          />

          {screenshotPath ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: screenshotPath }} style={styles.previewImage} />
              <TouchableOpacity onPress={() => setScreenshotPath('')}>
                <Text style={styles.removeText}>Remove screenshot</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.contextBox}>
            <Text style={styles.contextText}>Screen: {pathname || 'unknown'}</Text>
            <Text style={styles.contextText}>Opened from: {originScreen}</Text>
            <Text style={styles.contextText}>Device: {deviceModel}</Text>
            <Text style={styles.contextText}>OS: {osVersion}</Text>
            <Text style={styles.contextText}>App: {appVersion} ({appBuild})</Text>
          </View>

          <View style={styles.vcenter}>
            <StyledButton title={'SUBMIT ISSUE'} onPress={handleSubmit} />
          </View>
        </KeyboardAwareScrollView>
      </Container>
    </SafeAreaView>
  );
};

export default ReportIssue;
