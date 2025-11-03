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
  const formId = `quiz-form-${quizItemId}`;

  return (
    <article class="quiz-item" data-quiz-item-id={quizItemId}>
      <h3>{quizItem.question}</h3>
      <form
        id={formId}
        hx-post={`/topics/quiz/${quizItemId}/check`}
        hx-swap="outerHTML"
        hx-target="closest article"
        hx-include={`#${formId} input:checked`}
      >
        <fieldset>
          {quizItem.options.map((opt, idx) => (
            <label>
              <input
                type={inputType}
                name={`quiz-${quizItemId}`}
                value={idx.toString()}
                onchange={`
                  const form = document.getElementById('${formId}');
                  const checkedInputs = form.querySelectorAll('input:checked');
                  const answers = Array.from(checkedInputs).map(input => input.value);
                  const answersInput = form.querySelector('input[name="answers"]');
                  answersInput.value = JSON.stringify(answers);
                  htmx.trigger(form, 'submit');
                `}
              />
              {opt.text}
            </label>
          ))}
        </fieldset>
        <input type="hidden" name="answers" value="[]" />
      </form>
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
