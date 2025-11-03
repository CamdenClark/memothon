import type { FC } from "hono/jsx";

interface MCQOption {
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

interface QuizItem {
  question: string;
  options: MCQOption[];
}

interface QuizItemProps {
  quizItem: QuizItem;
  quizItemId: string;
}

const QuizItemComponent: FC<QuizItemProps> = ({ quizItem, quizItemId }) => {
  const isMultiSelect =
    quizItem.options.filter((opt) => opt.isCorrect).length > 1;
  const inputType = isMultiSelect ? "checkbox" : "radio";

  return (
    <article
      class="quiz-item"
      data-quiz-item-id={quizItemId}
      data-multi-select={isMultiSelect.toString()}
    >
      <h3>{quizItem.question}</h3>
      <fieldset>
        {quizItem.options.map((opt, idx) => (
          <>
            <label>
              <input
                type={inputType}
                name={`quiz-${quizItemId}`}
                value={idx.toString()}
                data-correct={opt.isCorrect ? "true" : undefined}
              />
              {opt.text}
            </label>
            {opt.explanation && (
              <small class="quiz-explanation" style="display: none;">
                {opt.explanation}
              </small>
            )}
          </>
        ))}
      </fieldset>
      <button type="button" class="secondary" onclick="checkAnswer(this)">
        Check Answer
      </button>
    </article>
  );
};

/**
 * Render a quiz item as HTML using Hono JSX
 */
export function renderQuizItem(quizItem: QuizItem, quizItemId: string): string {
  return (
    <QuizItemComponent quizItem={quizItem} quizItemId={quizItemId} />
  ).toString();
}
