
export type Category = 'Logical' | 'Spatial' | 'Numerical' | 'Verbal' | 'Pattern Recognition';

export interface Question {
  id: number;
  category: Category;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface UserAnswer {
  questionId: number;
  selectedOption: number;
  isCorrect: boolean;
  timeSpent: number;
}

export interface IQResult {
  score: number;
  percentile: number;
  categoryScores: Record<Category, number>;
  analysis: string;
  recommendedCareers: string[];
}

export type AppState = 'landing' | 'loading_questions' | 'quiz' | 'analyzing' | 'results';
