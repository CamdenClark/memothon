export interface MCQOption {
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface MCQData {
  question: string;
  options: MCQOption[];
  isMultiSelect: boolean;
}
