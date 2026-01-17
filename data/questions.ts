
import { Question } from '../types';

export const LOCAL_QUESTIONS: Question[] = [
  {
    id: 1,
    category: 'Numerical',
    question: "What comes next in the sequence? 2, 6, 12, 20, ?",
    options: ["28", "30", "32", "36"],
    correctAnswerIndex: 1,
    explanation: "The difference increases by 2 each time: +4, +6, +8, so next is +10."
  },
  {
    id: 2,
    category: 'Logical',
    question: "If ALL BLOPS are RIKS and some RIKS are TOFS, which is true?",
    options: ["All TOFS are BLOPS", "Some BLOPS may be TOFS", "No BLOPS are TOFS", "All RIKS are BLOPS"],
    correctAnswerIndex: 1,
    explanation: "Since some RIKS are TOFS and all BLOPS are RIKS, it is possible for BLOPS to be TOFS."
  },
  {
    id: 3,
    category: 'Numerical',
    question: "Which number does not belong? 3, 5, 11, 14, 17",
    options: ["3", "5", "11", "14", "17"],
    correctAnswerIndex: 3,
    explanation: "14 is the only even number; the others are prime numbers."
  },
  {
    id: 4,
    category: 'Verbal',
    question: "If CAT = 3120, what is DOG? (A=1, B=2 ... Z=26; sum letters)",
    options: ["26", "28", "30", "34"],
    correctAnswerIndex: 0,
    explanation: "D(4) + O(15) + G(7) = 26."
  },
  {
    id: 5,
    category: 'Pattern Recognition',
    question: "Which shape completes the pattern? ◯ ▲ ◯ ▲ ◯ ?",
    options: ["◯", "▲", "■", "◆"],
    correctAnswerIndex: 1,
    explanation: "The pattern alternates between circle and triangle."
  },
  {
    id: 6,
    category: 'Logical',
    question: "A clock shows 3:15. What is the angle between the hands?",
    options: ["0°", "7.5°", "15°", "22.5°"],
    correctAnswerIndex: 1,
    explanation: "At 3:15, the minute hand is exactly at 90°, but the hour hand has moved 1/4 of the way toward 4 o'clock (7.5°)."
  },
  {
    id: 7,
    category: 'Verbal',
    question: "If you rearrange the letters 'CIFAIPC', you get the name of a:",
    options: ["City", "Ocean", "Country", "Animal"],
    correctAnswerIndex: 1,
    explanation: "The letters spell 'PACIFIC', which is an ocean."
  },
  {
    id: 8,
    category: 'Numerical',
    question: "What number replaces the question mark? 1, 4, 9, 16, ?",
    options: ["20", "24", "25", "36"],
    correctAnswerIndex: 2,
    explanation: "These are squares of consecutive integers: 1², 2², 3², 4², so next is 5² (25)."
  },
  {
    id: 9,
    category: 'Logical',
    question: "Which word does not fit?",
    options: ["Apple", "Banana", "Carrot", "Mango"],
    correctAnswerIndex: 2,
    explanation: "Carrot is a vegetable; the others are fruits."
  },
  {
    id: 10,
    category: 'Logical',
    question: "If 5 machines make 5 items in 5 minutes, how long for 100 machines to make 100 items?",
    options: ["5 minutes", "20 minutes", "100 minutes", "1 minute"],
    correctAnswerIndex: 0,
    explanation: "If it takes 1 machine 5 minutes to make 1 item, then 100 machines working simultaneously will make 100 items in the same 5 minutes."
  },
  {
    id: 11,
    category: 'Pattern Recognition',
    question: "What comes next? Z, X, V, T, ?",
    options: ["R", "S", "Q", "P"],
    correctAnswerIndex: 0,
    explanation: "The sequence skips one letter backwards in the alphabet."
  },
  {
    id: 12,
    category: 'Spatial',
    question: "A man is facing north. He turns right, then left, then right. Which direction now?",
    options: ["North", "East", "West", "South"],
    correctAnswerIndex: 1,
    explanation: "North -> Right (East) -> Left (North) -> Right (East)."
  },
  {
    id: 13,
    category: 'Logical',
    question: "If ALL squares are rectangles but NOT all rectangles are squares, which is true?",
    options: ["All rectangles are squares", "Some squares are not rectangles", "All squares are rectangles", "Squares and rectangles are unrelated"],
    correctAnswerIndex: 2,
    explanation: "As stated in the premise, all squares are indeed rectangles."
  },
  {
    id: 14,
    category: 'Numerical',
    question: "Which number is missing? 7, 14, 28, ?, 112",
    options: ["42", "49", "56", "84"],
    correctAnswerIndex: 2,
    explanation: "The sequence doubles each time: 7, 14, 28, 56, 112."
  },
  {
    id: 15,
    category: 'Numerical',
    question: "What is the odd one out? 8, 27, 64, 125",
    options: ["8", "27", "64", "125"],
    correctAnswerIndex: 2,
    explanation: "While all are cubes, 64 is also a perfect square (8²)."
  },
  {
    id: 16,
    category: 'Verbal',
    question: "If TOM = 48, then JIM = ? (J=10, I=9, M=13)",
    options: ["32", "38", "40", "42"],
    correctAnswerIndex: 0,
    explanation: "J(10) + I(9) + M(13) = 32."
  },
  {
    id: 17,
    category: 'Pattern Recognition',
    question: "Find the next letter: A, D, G, J, ?",
    options: ["K", "L", "M", "N"],
    correctAnswerIndex: 2,
    explanation: "The sequence skips two letters: A (bc) D (ef) G (hi) J (kl) M."
  },
  {
    id: 18,
    category: 'Numerical',
    question: "Which fraction is largest?",
    options: ["3/4", "5/8", "7/10", "9/16"],
    correctAnswerIndex: 0,
    explanation: "3/4 = 0.75, which is larger than 0.625, 0.7, and 0.5625."
  },
  {
    id: 19,
    category: 'Verbal',
    question: "If RED = 27, BLUE = ? (B=2, L=12, U=21, E=5)",
    options: ["40", "52", "56", "58"],
    correctAnswerIndex: 0,
    explanation: "B(2) + L(12) + U(21) + E(5) = 40."
  },
  {
    id: 20,
    category: 'Numerical',
    question: "Which comes next? 2, 3, 5, 8, 13, ?",
    options: ["18", "20", "21", "24"],
    correctAnswerIndex: 2,
    explanation: "This is the Fibonacci sequence: 2+3=5, 3+5=8, 5+8=13, 8+13=21."
  }
];
