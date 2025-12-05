export interface QuizAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: number;
  category: string;
  question: string;
  answers: QuizAnswer[];
  correctAnswerId: string;
  explanation: string;
}

export const CHEF_SAFETY_QUIZ: QuizQuestion[] = [
  {
    id: 1,
    category: 'Food Storage & Transportation Safety',
    question: 'You bought ingredients the day before a Taist order. What\'s the correct way to store them?',
    answers: [
      {
        id: 'A',
        text: 'Leave them in your car overnight so they\'re ready to grab',
        isCorrect: false
      },
      {
        id: 'B',
        text: 'Refrigerate them until you leave for the order',
        isCorrect: true
      },
      {
        id: 'C',
        text: 'Store raw and cooked foods together to save space',
        isCorrect: false
      }
    ],
    correctAnswerId: 'B',
    explanation: 'Ingredients bought ahead of time must stay refrigerated until you head out to keep them safe.'
  },
  {
    id: 2,
    category: 'Handwashing, Personal Hygiene & Arrival Readiness',
    question: 'You arrive at the customer\'s kitchen. What\'s the correct first step before you start cooking?',
    answers: [
      {
        id: 'A',
        text: 'Wash your hands, then wipe down any surfaces or appliances you\'ll be using if they\'re dirty',
        isCorrect: true
      },
      {
        id: 'B',
        text: 'Start organizing your ingredients before washing your hands',
        isCorrect: false
      },
      {
        id: 'C',
        text: 'Give the kitchen a quick look, and only wipe surfaces if something seems seriously dirty',
        isCorrect: false
      }
    ],
    correctAnswerId: 'A',
    explanation: 'Chefs must wash their hands immediately on arrival, and any surface or appliance they\'ll use must be cleaned before cooking begins.'
  },
  {
    id: 3,
    category: 'Proper Food Temperature Control',
    question: 'You\'re cooking chicken for a customer. What\'s the minimum safe internal temperature?',
    answers: [
      {
        id: 'A',
        text: '140°F',
        isCorrect: false
      },
      {
        id: 'B',
        text: '150°F',
        isCorrect: false
      },
      {
        id: 'C',
        text: '165°F',
        isCorrect: true
      }
    ],
    correctAnswerId: 'C',
    explanation: 'Chicken must reach 165°F internally to kill harmful bacteria.'
  },
  {
    id: 4,
    category: 'Cross-Contamination Prevention',
    question: 'What\'s the safest way to handle your cutting boards during prep?',
    answers: [
      {
        id: 'A',
        text: 'Use the same board for everything as long as you wipe it',
        isCorrect: false
      },
      {
        id: 'B',
        text: 'Use separate boards for raw meat and ready-to-eat items',
        isCorrect: true
      },
      {
        id: 'C',
        text: 'Use paper towels as cutting surfaces',
        isCorrect: false
      }
    ],
    correctAnswerId: 'B',
    explanation: 'Using separate boards prevents raw proteins from contaminating ready-to-eat foods.'
  },
  {
    id: 5,
    category: 'Cleaning & Equipment Reset Before Leaving',
    question: 'After finishing the meal, what should you do with the pots, pans, and other supplies you brought from home?',
    answers: [
      {
        id: 'A',
        text: 'Ask the customer if they want to wash them',
        isCorrect: false
      },
      {
        id: 'B',
        text: 'Take them home dirty to wash later',
        isCorrect: false
      },
      {
        id: 'C',
        text: 'Wash them before you leave and put the kitchen back as you found it',
        isCorrect: true
      }
    ],
    correctAnswerId: 'C',
    explanation: 'Taist requires chefs to reset the kitchen, including cleaning any personal equipment used.'
  }
];
