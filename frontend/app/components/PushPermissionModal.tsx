import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import { AppColors } from '../../constants/theme';

interface PushPermissionModalProps {
  visible: boolean;
  chefFirstName: string;
  onAccept: () => void;
  onDecline: () => void;
}

const PushPermissionModal: React.FC<PushPermissionModalProps> = ({
  visible,
  chefFirstName,
  onAccept,
  onDecline,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <FontAwesomeIcon icon={faBell} size={28} color={AppColors.primary} />
          </View>

          <Text style={styles.title}>Stay in the loop</Text>
          <Text style={styles.body}>
            Want to know when Chef {chefFirstName} adds something to their menu?
          </Text>

          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptText}>Yes, notify me</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default PushPermissionModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF3EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  acceptButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  declineButton: {
    paddingVertical: 10,
  },
  declineText: {
    color: AppColors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
});
