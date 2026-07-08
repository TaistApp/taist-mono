import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";

import Container from "../../../layout/Container";
import StyledButton from "../../../components/styledButton";
import { useAppSelector } from "../../../hooks/useRedux";
import {
  GetReferralCodeAPI,
  GetReferralHistoryAPI,
  GetReferralStatsAPI,
  SendReferralAPI,
} from "../../../services/api";
import { ShowErrorToast } from "../../../utils/toast";
import { AppColors } from "../../../../constants/theme";
import { styles } from "./styles";

interface ReferralInfo {
  referral_code: string;
  discount_description: string;
  max_referrals: number;
  is_active: boolean;
}

interface ReferralStats {
  total_sent: number;
  pending: number;
  signed_up: number;
  completed: number;
  expired: number;
}

interface ReferralHistoryItem {
  id: number;
  referred_phone: string;
  referral_type: "general" | "chef";
  status: "pending" | "signed_up" | "completed" | "expired";
  created_at: string;
  referred_user?: { first_name: string; last_name: string } | null;
  chef?: { first_name: string; last_name: string } | null;
  referrer_discount_code?: { code: string; current_uses: number } | null;
}

const statusConfig = {
  pending: { label: "Pending", badge: styles.badgePending, text: styles.badgeTextPending },
  signed_up: { label: "Signed Up", badge: styles.badgeSignedUp, text: styles.badgeTextSignedUp },
  completed: { label: "Completed", badge: styles.badgeCompleted, text: styles.badgeTextCompleted },
  expired: { label: "Expired", badge: styles.badgeExpired, text: styles.badgeTextExpired },
};

export default function ReferralsScreen() {
  const params = useLocalSearchParams();
  const selfInfo = useAppSelector((x) => x.user.user);

  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  const prefillType = params.type as "general" | "chef" | undefined;
  const prefillChefId = params.chefId ? Number(params.chefId) : undefined;
  const prefillChefName = params.chefName as string | undefined;

  const fetchData = async () => {
    try {
      const [codeRes, statsRes, historyRes] = await Promise.all([
        GetReferralCodeAPI(),
        GetReferralStatsAPI(),
        GetReferralHistoryAPI(),
      ]);
      if (codeRes.success === 1) setInfo(codeRes.data);
      if (statsRes.success === 1) setStats(statsRes.data);
      if (historyRes.success === 1) setHistory(historyRes.data || []);
    } catch (e) {
      console.error("Failed to fetch referral data", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleSend = async () => {
    if (!phone.trim()) {
      ShowErrorToast("Please enter a phone number.");
      return;
    }

    setSending(true);
    try {
      const res = await SendReferralAPI({
        phone: phone.trim(),
        type: prefillType || "general",
        chef_id: prefillChefId,
      });
      if (res.success === 1) {
        setSendModalVisible(false);
        setPhone("");
        fetchData();
      } else {
        ShowErrorToast(res.error || res.message || "Failed to send referral.");
      }
    } catch (e) {
      ShowErrorToast("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const remainingReferrals = info
    ? info.max_referrals - (stats?.total_sent || 0)
    : 0;

  if (loading) {
    return (
      <Container backMode title="Invite Friends">
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      </Container>
    );
  }

  return (
    <Container backMode title="Invite Friends">
      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Referral Code Card */}
        {info && (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Your Referral Code</Text>
            <Text style={styles.codeText}>{info.referral_code}</Text>
            <Text style={styles.codeSubtext}>
              Both you and your friend get {info.discount_description} {"\n"}
              {remainingReferrals > 0
                ? `${remainingReferrals} of ${info.max_referrals} referrals remaining`
                : "You've reached the maximum number of referrals"}
            </Text>
          </View>
        )}

        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.total_sent}</Text>
              <Text style={styles.statLabel}>Sent</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.signed_up}</Text>
              <Text style={styles.statLabel}>Signed Up</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
          </View>
        )}

        {/* Send Referral Button */}
        {remainingReferrals > 0 && (
          <StyledButton
            title={
              prefillType === "chef" && prefillChefName
                ? `Refer a Friend to ${prefillChefName}`
                : "Refer a Friend to Taist"
            }
            onPress={() => setSendModalVisible(true)}
            style={{
              backgroundColor: AppColors.primary,
              borderRadius: 10,
              paddingVertical: 14,
            }}
            titleStyle={{
              color: AppColors.textOnPrimary,
              fontSize: 16,
              fontWeight: "600",
            }}
          />
        )}

        {/* Referral History */}
        <View>
          <Text style={styles.sectionTitle}>Referral History</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>
              No referrals yet. Invite friends to earn rewards!
            </Text>
          ) : (
            history.map((item) => {
              const config = statusConfig[item.status];
              return (
                <View key={item.id} style={styles.referralItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.referralPhone}>
                      {item.referred_phone}
                    </Text>
                    {item.referred_user && (
                      <Text style={styles.referralName}>
                        {item.referred_user.first_name}{" "}
                        {item.referred_user.last_name}
                      </Text>
                    )}
                    {item.referral_type === "chef" && item.chef && (
                      <Text style={styles.referralName}>
                        Chef: {item.chef.first_name} {item.chef.last_name}
                      </Text>
                    )}
                    <Text style={styles.referralDate}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                    {item.referrer_discount_code && (
                      <Text style={styles.creditCode}>
                        Credit: {item.referrer_discount_code.code}
                        {item.referrer_discount_code.current_uses > 0
                          ? " (used)"
                          : ""}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.badge, config.badge]}>
                    <Text style={[styles.badgeText, config.text]}>
                      {config.label}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Send Referral Modal */}
      <Modal
        visible={sendModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSendModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSendModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={() => {}}
          >
            <Text style={styles.modalTitle}>
              {prefillType === "chef" && prefillChefName
                ? `Refer to ${prefillChefName}`
                : "Refer a Friend to Taist"}
            </Text>
            <Text style={styles.modalSubtext}>
              Enter your friend's phone number. We'll send them a text with your
              referral link. You'll earn{" "}
              {info?.discount_description || "a discount"} when they complete
              their first order!
            </Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="Phone number"
              placeholderTextColor={AppColors.textTertiary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSendModalVisible(false);
                  setPhone("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <StyledButton
                title={sending ? "Sending..." : "Send Invite"}
                onPress={handleSend}
                disabled={sending || !phone.trim()}
                style={{
                  flex: 1,
                  backgroundColor: AppColors.primary,
                  borderRadius: 10,
                  paddingVertical: 14,
                  opacity: sending || !phone.trim() ? 0.5 : 1,
                }}
                titleStyle={{
                  color: AppColors.textOnPrimary,
                  fontSize: 15,
                  fontWeight: "600",
                }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Container>
  );
}
