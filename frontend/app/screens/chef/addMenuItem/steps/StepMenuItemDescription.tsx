import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Modal, ScrollView, TextInput } from 'react-native';
import { MenuItemStepContainer } from '../components/MenuItemStepContainer';
import { AppColors, Spacing } from '../../../../../constants/theme';
import { IMenu } from '../../../../types/index';
import { ShowErrorToast } from '../../../../utils/toast';
import StyledButton from '../../../../components/styledButton';
import { EnhanceMenuDescriptionAPI } from '../../../../services/api';

interface StepMenuItemDescriptionProps {
  menuItemData: Partial<IMenu>;
  onUpdateMenuItemData: (data: Partial<IMenu>) => void;
  onNext: (finalDescription?: string) => void | Promise<void>;
  onBack: () => void;
}

export const StepMenuItemDescription: React.FC<StepMenuItemDescriptionProps> = ({
  menuItemData,
  onUpdateMenuItemData,
  onNext,
  onBack,
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Debounce for Continue button
  const [showEnhancePreview, setShowEnhancePreview] = useState(false);
  const [enhancedDescription, setEnhancedDescription] = useState('');
  const [hasUsedAI, setHasUsedAI] = useState(false);

  const handleUseAIDescription = () => {
    if (menuItemData.ai_generated_description) {
      onUpdateMenuItemData({
        description: menuItemData.ai_generated_description,
        description_edited: false
      });
      setHasUsedAI(true);
    }
  };

  const handleDescriptionChange = (val: string) => {
    onUpdateMenuItemData({
      description: val,
      description_edited: hasUsedAI || !!menuItemData.ai_generated_description
    });
  };

  const enhanceDescription = async (description: string) => {
    setIsEnhancing(true);
    try {
      const response = await EnhanceMenuDescriptionAPI({ description });

      if (response.success === 1 && response.enhanced_description) {
        setEnhancedDescription(response.enhanced_description);
        setShowEnhancePreview(true);
        // Don't call onNext here - modal will handle it
        // Keep isProcessing true until modal action
      } else {
        // If enhancement fails, just continue
        await onNext();
      }
    } catch (error) {
      console.log('Enhancement failed, continuing anyway', error);
      await onNext();
    } finally {
      setIsEnhancing(false);
    }
  };

  const acceptEnhancedDescription = async () => {
    setIsProcessing(true);
    onUpdateMenuItemData({ description: enhancedDescription });
    setShowEnhancePreview(false);
    await onNext(enhancedDescription);  // Pass enhanced description to avoid race condition
    setIsProcessing(false);
  };

  const validateAndProceed = async () => {
    // Prevent double-tap
    if (isProcessing || isEnhancing) return;

    // Validate description
    if (!menuItemData.description || menuItemData.description.trim().length === 0) {
      ShowErrorToast('Please enter a description');
      return;
    }

    if (menuItemData.description.trim().length < 20) {
      ShowErrorToast('Description must be at least 20 characters to give customers a good understanding');
      return;
    }

    setIsProcessing(true);
    try {
      // If user edited the description or wrote their own, enhance it
      if (menuItemData.description_edited || !menuItemData.ai_generated_description) {
        await enhanceDescription(menuItemData.description);
      } else {
        // AI description used without edits, skip enhancement
        await onNext();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MenuItemStepContainer
      title="Describe your menu offering"
      subtitle="Give customers a short summary of what makes this item special."
      currentStep={2}
      totalSteps={8}
    >
      {/* AI Description Suggestion */}
      {menuItemData.ai_generated_description && !hasUsedAI && (
        <View style={styles.aiSuggestionBox}>
          <Text style={styles.aiSuggestionLabel}>AI Generated Description:</Text>
          <Text style={styles.aiSuggestionText}>
            {menuItemData.ai_generated_description}
          </Text>
          <StyledButton
            title="Start with This Description"
            onPress={handleUseAIDescription}
            style={styles.aiUseButton}
          />
        </View>
      )}

      <View style={styles.textAreaContainer}>
        <Text style={styles.textAreaLabel}>Description</Text>
        <TextInput
          style={styles.textArea}
          placeholder=""
          placeholderTextColor={AppColors.textSecondary}
          value={menuItemData.description ?? ''}
          onChangeText={handleDescriptionChange}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {(menuItemData.description ?? '').length}/500 characters
        </Text>
      </View>

      {/* AI Integration Point - Hidden for now */}
      {/* <View style={styles.aiSection}>
        <Text style={styles.aiLabel}>✨ AI Writing Assistant (Coming Soon)</Text>
        <View style={styles.aiButtonRow}>
          <StyledButton
            title="Enhance Description"
            onPress={() => {}}
            disabled={true}
            style={[styles.aiButton, styles.aiButtonHalf]}
          />
          <StyledButton
            title="Check Grammar"
            onPress={() => {}}
            disabled={true}
            style={[styles.aiButton, styles.aiButtonHalf]}
          />
        </View>
      </View> */}

      <View style={styles.buttonContainer}>
        <StyledButton
          title={isEnhancing ? "Enhancing..." : isProcessing ? "Processing..." : "Continue"}
          onPress={validateAndProceed}
          disabled={isEnhancing || isProcessing}
        />
        {(isEnhancing || isProcessing) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={AppColors.primary} />
            <Text style={styles.loadingText}>
              {isEnhancing ? 'Checking grammar and punctuation...' : 'Analyzing your dish...'}
            </Text>
          </View>
        )}
        <Pressable onPress={onBack} style={styles.backButton} disabled={isEnhancing || isProcessing}>
          <Text style={[styles.backButtonText, (isEnhancing || isProcessing) && { opacity: 0.5 }]}>Back</Text>
        </Pressable>
      </View>

      {/* Enhancement Preview Modal */}
      <Modal
        visible={showEnhancePreview}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEnhancePreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>How does this look?</Text>
              <Text style={styles.modalSubtitle}>We've made some improvements to your description:</Text>

              <View style={styles.previewBox}>
                <Text style={styles.previewText}>{enhancedDescription}</Text>
              </View>

              <View style={styles.modalButtons}>
                <StyledButton
                  title={isProcessing ? "Processing..." : "Looks Good!"}
                  onPress={acceptEnhancedDescription}
                  disabled={isProcessing}
                />
                <Pressable
                  onPress={async () => {
                    setIsProcessing(true);
                    setShowEnhancePreview(false);
                    await onNext();
                    setIsProcessing(false);
                  }}
                  style={styles.secondaryButton}
                  disabled={isProcessing}
                >
                  <Text style={[styles.secondaryButtonText, isProcessing && { opacity: 0.5 }]}>Keep Original</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </MenuItemStepContainer>
  );
};

const styles = StyleSheet.create({
  textAreaContainer: {
    marginBottom: Spacing.sm,
  },
  textAreaLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
    color: AppColors.text,
    backgroundColor: 'white',
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  buttonContainer: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  backButtonText: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  aiSuggestionBox: {
    backgroundColor: '#f0f9ff',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  aiSuggestionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: Spacing.xs,
  },
  aiSuggestionText: {
    fontSize: 14,
    color: '#1e3a8a',
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  aiUseButton: {
    backgroundColor: '#3b82f6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: Spacing.lg,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    color: AppColors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: Spacing.md,
  },
  previewBox: {
    backgroundColor: '#f9fafb',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewText: {
    fontSize: 16,
    lineHeight: 24,
    color: AppColors.text,
  },
  modalButtons: {
    gap: Spacing.md,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '600',
  },
  aiSection: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: AppColors.surface,
    borderRadius: 8,
  },
  aiLabel: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: Spacing.sm,
  },
  aiButtonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  aiButton: {
    opacity: 0.5,
  },
  aiButtonHalf: {
    flex: 1,
  },
});

