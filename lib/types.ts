export interface Question {
  id: string;
  question: string;
  answers: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explanation?: string;
}

export interface QuizSet {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  questions: Question[];
}

export interface QuizResult {
  id: string;
  playerName: string;
  setId: string;
  setName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  percentage: number;
  answers: number[];
  timeSpent: number;
  date: string;
}

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  percentage: number;
  setName: string;
  date: string;
  uid?: string;
}

export interface QuizState {
  setId: string;
  setName: string;
  questions: Question[];
  currentIndex: number;
  answers: number[];
  startTime: number;
  playerName: string;
}
