
import { IQResult, UserAnswer, Question, Category } from "../types";

export const calculateIQLocally = (questions: Question[], answers: UserAnswer[]): IQResult => {
  const correctCount = answers.filter(a => a.isCorrect).length;
  const totalQuestions = questions.length;
  
  /**
   * IQ Calculation Logic:
   * 20 Questions
   * Score = 100 + (Correct - 10) * 5
   * Range: 50 (0/20) to 150 (20/20)
   */
  const score = 100 + (correctCount - 10) * 5;
  const percentile = Math.min(99, Math.max(1, Math.round((correctCount / totalQuestions) * 100)));

  // Categorize scores
  const categoryScores: Record<Category, number> = {
    'Logical': 0,
    'Spatial': 0,
    'Numerical': 0,
    'Verbal': 0,
    'Pattern Recognition': 0
  };

  const categoryCounts: Record<Category, number> = {
    'Logical': 0,
    'Spatial': 0,
    'Numerical': 0,
    'Verbal': 0,
    'Pattern Recognition': 0
  };

  questions.forEach(q => {
    const ans = answers.find(a => a.questionId === q.id);
    categoryCounts[q.category]++;
    if (ans?.isCorrect) {
      categoryScores[q.category] += 1;
    }
  });

  // Convert category scores to percentages for display
  Object.keys(categoryScores).forEach(cat => {
    const key = cat as Category;
    categoryScores[key] = Math.round((categoryScores[key] / (categoryCounts[key] || 1)) * 100);
  });

  let analysis = "";
  if (score >= 140) {
    analysis = "Extraordinary Genius. Your cognitive profile suggests highly superior abstract reasoning and exceptional problem-solving speed. You process complex data patterns with ease.";
  } else if (score >= 120) {
    analysis = "Superior Intelligence. You demonstrate strong logical deduction and verbal comprehension skills, placing you well above the general population mean.";
  } else if (score >= 90) {
    analysis = "Average to High Average. Your neural processing is balanced and efficient. You show solid foundational skills in numerical and pattern recognition tasks.";
  } else {
    analysis = "Focused Cognitive Profile. Your results suggest areas of specific strength alongside opportunities for further cognitive training in logical sequencing.";
  }

  const careersByMaxCat = {
    'Logical': ["Software Architect", "Mathematician", "Philosopher"],
    'Spatial': ["Architect", "Pilot", "Graphic Designer"],
    'Numerical': ["Data Scientist", "Quantitative Analyst", "Economist"],
    'Verbal': ["Writer", "Diplomat", "Attorney"],
    'Pattern Recognition': ["Cryptographer", "Stock Trader", "Forensic Investigator"]
  };

  // Find highest scoring category
  const topCat = Object.entries(categoryScores).sort((a,b) => b[1] - a[1])[0][0] as Category;
  const recommendedCareers = careersByMaxCat[topCat] || ["Consultant", "Specialist", "Researcher"];

  return {
    score,
    percentile,
    categoryScores,
    analysis,
    recommendedCareers
  };
};
