interface MCQOption {
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

interface QuizItem {
  question: string;
  options: MCQOption[];
}

/**
 * Render a quiz item as HTML
 */
export function renderQuizItem(quizItem: QuizItem, quizItemId: string): string {
  const isMultiSelect =
    quizItem.options.filter((opt) => opt.isCorrect).length > 1;
  const inputType = isMultiSelect ? "checkbox" : "radio";

  const optionsHtml = quizItem.options
    .map(
      (opt, idx) => `
    <div class="mcq-option">
      <label>
        <input type="${inputType}" name="mcq-answer" value="${idx}" ${opt.isCorrect ? 'data-correct="true"' : ""}>
        <span class="mcq-option-text">${opt.text}</span>
      </label>
      ${opt.explanation ? `<div class="mcq-explanation hidden">${opt.explanation}</div>` : ""}
    </div>
  `
    )
    .join("");

  return `
<div class="mcq-block" data-quiz-item-id="${quizItemId}" data-multi-select="${isMultiSelect}">
  <div class="mcq-question">${quizItem.question}</div>
  <div class="mcq-options">
    ${optionsHtml}
  </div>
</div>
  `.trim();
}
