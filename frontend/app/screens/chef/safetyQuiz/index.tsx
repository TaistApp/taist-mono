import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';
import { navigate } from '../../../utils/navigation';
import Container from '../../../layout/Container';
import { AppColors } from '../../../../constants/theme';
import { CHEF_SAFETY_QUIZ, QuizAnswer } from './quizData';
import { CompleteChefQuizAPI } from '../../../services/api';
import { setUser } from '../../../reducers/userSlice';
import { showLoading, hideLoading } from '../../../reducers/loadingSlice';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';

const SafetyQuiz = () => {
  const dispatch = useAppDispatch();
  const self = useAppSelector(x => x.user.user);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const currentQuestion = CHEF_SAFETY_QUIZ[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === CHEF_SAFETY_QUIZ.length - 1;
  const progress = ((currentQuestionIndex + 1) / CHEF_SAFETY_QUIZ.length) * 100;

  const handleAnswerSelect = (answer: QuizAnswer) => {
    if (showExplanation) return; // Prevent changing answer after correct selection

    setSelectedAnswer(answer.id);

    if (answer.isCorrect) {
      setAnswerFeedback('correct');
      setShowExplanation(true);
    } else {
      setAnswerFeedback('incorrect');
      // Reset after delay to allow retry
      setTimeout(() => {
        setSelectedAnswer(null);
        setAnswerFeedback(null);
      }, 1500);
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      handleCompleteQuiz();
    } else {
      // Move to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setAnswerFeedback(null);
    }
  };

  const handleCompleteQuiz = async () => {
    dispatch(showLoading());

    try {
      const resp = await CompleteChefQuizAPI({ user_id: self.id });

      dispatch(hideLoading());

      if (resp.success === 1) {
        // Update user state with quiz_completed: 1
        dispatch(setUser(resp.data));
        ShowSuccessToast('Safety quiz completed!');
        // Navigate to chef home/tabs
        navigate.toChef.tabs();
      } else {
        ShowErrorToast(resp.error || 'Failed to complete quiz');
      }
    } catch (error) {
      dispatch(hideLoading());
      ShowErrorToast('An error occurred. Please try again.');
    }
  };

  const getAnswerButtonStyle = (answer: QuizAnswer) => {
    const baseStyle = [styles.answerButton];

    if (selectedAnswer === answer.id) {
      if (answerFeedback === 'correct') {
        return [...baseStyle, styles.answerButtonCorrect];
      } else if (answerFeedback === 'incorrect') {
        return [...baseStyle, styles.answerButtonIncorrect];
      }
    }
    return baseStyle;
  };

  const getAnswerLabelStyle = (answer: QuizAnswer) => {
    if (selectedAnswer === answer.id && answerFeedback === 'correct') {
      return [styles.answerLabel, styles.answerLabelCorrect];
    }
    return styles.answerLabel;
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container>
        <View style={styles.pageView}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Safety Quiz</Text>
            <Text style={styles.headerSubtitle}>
              Answer correctly to continue
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <LinearGradient
                colors={[AppColors.primary, '#FF8C5A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              Question {currentQuestionIndex + 1} of {CHEF_SAFETY_QUIZ.length}
            </Text>
          </View>

          {/* Question Card */}
          <View style={styles.questionCard}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{currentQuestion.category}</Text>
            </View>

            <Text style={styles.questionText}>{currentQuestion.question}</Text>

            {/* Answer Options - Hidden when correct answer is shown */}
            {!showExplanation && (
              <View style={styles.answersContainer}>
                {currentQuestion.answers.map((answer) => (
                  <TouchableOpacity
                    key={answer.id}
                    style={getAnswerButtonStyle(answer)}
                    onPress={() => handleAnswerSelect(answer)}
                    disabled={showExplanation}
                    activeOpacity={0.7}
                  >
                    <View style={styles.answerLabelContainer}>
                      <View style={getAnswerLabelStyle(answer)}>
                        <Text style={styles.answerLabelText}>{answer.id}</Text>
                      </View>
                    </View>
                    <Text style={styles.answerText}>{answer.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Explanation (shown after correct answer) */}
            {showExplanation && (
              <View style={styles.explanationContainer}>
                <View style={styles.explanationHeader}>
                  <Text style={styles.explanationIcon}>✓</Text>
                  <Text style={styles.explanationTitle}>Correct!</Text>
                </View>
                <Text style={styles.explanationText}>
                  {currentQuestion.explanation}
                </Text>
              </View>
            )}

            {/* Incorrect Feedback */}
            {answerFeedback === 'incorrect' && (
              <View style={styles.incorrectFeedback}>
                <Text style={styles.incorrectIcon}>✗</Text>
                <Text style={styles.incorrectText}>
                  Not quite. Try again!
                </Text>
              </View>
            )}
          </View>

          {/* Next Button (only shown after correct answer) - OUTSIDE question card */}
          {showExplanation && (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[AppColors.primary, '#FF8C5A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>
                  {isLastQuestion ? 'Complete Quiz ✓' : 'Next Question →'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </Container>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  pageView: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: AppColors.textSecondary,
    lineHeight: 22,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontWeight: '600',
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.text,
    lineHeight: 28,
    marginBottom: 24,
  },
  answersContainer: {
    gap: 12,
  },
  answerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  answerButtonCorrect: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  answerButtonIncorrect: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  answerLabelContainer: {
    marginRight: 12,
  },
  answerLabel: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  answerLabelCorrect: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  answerLabelText: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.primary,
  },
  answerText: {
    flex: 1,
    fontSize: 16,
    color: AppColors.text,
    lineHeight: 22,
  },
  explanationContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  explanationIcon: {
    fontSize: 24,
    color: '#10B981',
    marginRight: 8,
  },
  explanationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#065F46',
  },
  explanationText: {
    fontSize: 15,
    color: '#065F46',
    lineHeight: 22,
  },
  incorrectFeedback: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incorrectIcon: {
    fontSize: 20,
    color: '#DC2626',
    marginRight: 8,
  },
  incorrectText: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '600',
  },
  nextButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
});

export default SafetyQuiz;
