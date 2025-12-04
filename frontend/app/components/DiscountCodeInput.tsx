import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTag, faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';

interface DiscountCodeInputProps {
  code: string;
  onCodeChange: (code: string) => void;
  onApply: () => void;
  onRemove: () => void;
  appliedDiscount: {
    code: string;
    discount_amount: number;
  } | null;
  error: string;
  isLoading: boolean;
}

const DiscountCodeInput: React.FC<DiscountCodeInputProps> = ({
  code,
  onCodeChange,
  onApply,
  onRemove,
  appliedDiscount,
  error,
  isLoading,
}) => {
  return (
    <View style={styles.discountSection}>
      <Text style={styles.sectionTitle}>Discount Code</Text>

      {!appliedDiscount ? (
        <View style={styles.discountInputContainer}>
          <View style={styles.inputWrapper}>
            <FontAwesomeIcon icon={faTag} size={16} color="#666" style={styles.icon} />
            <TextInput
              style={styles.discountInput}
              placeholder="Enter code"
              placeholderTextColor="#999"
              value={code}
              onChangeText={onCodeChange}
              autoCapitalize="characters"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.applyButton,
              (isLoading || !code.trim()) && styles.applyButtonDisabled,
            ]}
            onPress={onApply}
            disabled={isLoading || !code.trim()}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.applyButtonText}>Apply</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.appliedDiscountContainer}>
          <View style={styles.appliedDiscountInfo}>
            <FontAwesomeIcon icon={faCheck} size={16} color="#10B981" style={styles.icon} />
            <Text style={styles.appliedDiscountText}>
              {appliedDiscount.code} applied - Save ${appliedDiscount.discount_amount.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity onPress={onRemove}>
            <FontAwesomeIcon icon={faTimes} size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {error && !appliedDiscount && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  discountSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  discountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 48,
  },
  icon: {
    marginRight: 8,
  },
  discountInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    height: '100%',
  },
  applyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  applyButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  appliedDiscountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    padding: 12,
  },
  appliedDiscountInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appliedDiscountText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: '#EF4444',
  },
});

export default DiscountCodeInput;





