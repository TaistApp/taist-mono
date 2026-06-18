import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Text,
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

const StripeOnboardingDialog = ({ visible, onClose, hasPendingAccount }: Props) => {
  const dispatch = useAppDispatch();
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCheckingStatus(false);
    }
  }, [visible]);

  const handleContinue = async () => {
    dispatch(showLoading());
    // Sensitive details (incl. SSN) are collected by Stripe in their hosted
    // flow — we don't ask for or store them here.
    const resp = await AddStripAccountAPI({}, dispatch);
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
            You'll be redirected to Stripe's secure website to verify your identity and set up payouts.
          </Text>

          <Text style={fineprint}>
            Stripe collects your sensitive details (like your SSN) directly on their secure platform — Taist never sees or stores them.
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
