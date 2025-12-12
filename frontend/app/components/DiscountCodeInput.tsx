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
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  discountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    height: 52,
  },
  icon: {
    marginRight: 10,
  },
  discountInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    height: '100%',
  },
  applyButton: {
    backgroundColor: '#fa4616',
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  applyButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  appliedDiscountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B981',
    padding: 14,
  },
  appliedDiscountInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appliedDiscountText: {
    fontSize: 15,
    color: '#065F46',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    color: '#EF4444',
  },
});

export default DiscountCodeInput;









