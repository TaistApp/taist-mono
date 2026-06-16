import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAppDispatch } from '../../../../hooks/useRedux';
import { hideLoading, showLoading } from '../../../../reducers/loadingSlice';
import { AddStripAccountAPI, GetPaymentMethodAPI } from '../../../../services/api';
import { ShowErrorToast, ShowSuccessToast } from '../../../../utils/toast';
import { AppColors } from '../../../../../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  hasPendingAccount: boolean;
}

const formatSsn = (raw: string) => {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};

const StripeOnboardingDialog = ({ visible, onClose, hasPendingAccount }: Props) => {
  const dispatch = useAppDispatch();
  const [ssn, setSsn] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSsn('');
      setCheckingStatus(false);
    }
  }, [visible]);

  const handleContinue = async () => {
    const digits = ssn.replace(/[^0-9]/g, '');
    if (digits.length !== 9) {
      ShowErrorToast('Please enter a valid 9-digit SSN');
      return;
    }
    dispatch(showLoading());
    const resp = await AddStripAccountAPI({ ssn: digits }, dispatch);
    dispatch(hideLoading());
    if (resp.success == 1 && resp.onboarding_url) {
      onClose();
      Linking.openURL(resp.onboarding_url);
    } else {
      ShowErrorToast(resp.error ?? resp.message ?? 'Could not start Stripe setup');
    }
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      const resp = await GetPaymentMethodAPI();
      const active = resp?.data?.find?.((x: any) => x.active == 1);
      if (active?.verification_complete) {
        ShowSuccessToast('Verification complete!');
        onClose();
      } else {
        ShowErrorToast('Verification still pending. Please check back soon.');
      }
    } catch {
      ShowErrorToast('Failed to check status');
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={overlay}>
        <View style={card}>
          <Text style={title}>Complete Stripe Verification</Text>

          <Text style={body}>
            You'll be redirected to Stripe's secure website to verify your account.
          </Text>

          <Text style={[body, { marginBottom: 8 }]}>
            Enter your full SSN so Stripe can verify your identity in one step.
          </Text>

          <TextInput
            value={ssn}
            onChangeText={t => setSsn(formatSsn(t))}
            placeholder="123-45-6789"
            placeholderTextColor={AppColors.textTertiary}
            keyboardType="number-pad"
            maxLength={11}
            autoComplete="off"
            textContentType="none"
            secureTextEntry
            style={input}
          />

          <Text style={fineprint}>
            Stored securely (encrypted) and used only for Stripe and your background check.
          </Text>

          <TouchableOpacity onPress={handleContinue} style={primaryBtn} activeOpacity={0.85}>
            <Text style={primaryBtnText}>Continue to Stripe</Text>
          </TouchableOpacity>

          {hasPendingAccount && (
            <TouchableOpacity
              onPress={handleCheckStatus}
              disabled={checkingStatus}
              style={secondaryBtn}
              activeOpacity={0.7}>
              {checkingStatus ? (
                <ActivityIndicator color={AppColors.primary} />
              ) : (
                <Text style={secondaryBtnText}>Already finished? Check status</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose} style={cancelBtn} activeOpacity={0.7}>
            <Text style={cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default StripeOnboardingDialog;

const overlay = {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  padding: 20,
};

const card = {
  backgroundColor: AppColors.background,
  borderRadius: 14,
  padding: 24,
  width: '100%' as const,
  maxWidth: 400,
};

const title = {
  fontSize: 22,
  fontWeight: '700' as const,
  marginBottom: 16,
  textAlign: 'center' as const,
  color: AppColors.text,
};

const body = {
  fontSize: 15,
  lineHeight: 22,
  marginBottom: 16,
  textAlign: 'center' as const,
  color: AppColors.text,
};

const input = {
  borderWidth: 1,
  borderColor: AppColors.border,
  borderRadius: 10,
  paddingVertical: 14,
  paddingHorizontal: 16,
  fontSize: 18,
  textAlign: 'center' as const,
  marginBottom: 8,
  color: AppColors.text,
  letterSpacing: 1,
};

const fineprint = {
  fontSize: 12,
  color: AppColors.textSecondary,
  textAlign: 'center' as const,
  marginBottom: 20,
};

const primaryBtn = {
  backgroundColor: AppColors.primary,
  paddingVertical: 16,
  borderRadius: 20,
  marginBottom: 10,
};

const primaryBtnText = {
  color: AppColors.textOnPrimary,
  fontSize: 16,
  fontWeight: '700' as const,
  textAlign: 'center' as const,
};

const secondaryBtn = {
  paddingVertical: 12,
  marginBottom: 4,
};

const secondaryBtnText = {
  color: AppColors.primary,
  fontSize: 14,
  fontWeight: '600' as const,
  textAlign: 'center' as const,
};

const cancelBtn = {
  paddingVertical: 10,
};

const cancelBtnText = {
  color: AppColors.textSecondary,
  fontSize: 14,
  textAlign: 'center' as const,
};
