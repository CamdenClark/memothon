import type { MarkedExtension, Token, Tokens } from "marked";
import type { MCQData, MCQOption } from "./types";

// Custom token type for MCQ blocks
export interface MCQToken extends Tokens.Generic {
  type: "mcq";
  raw: string;
  data: MCQData;
  quizItemId?: string; // Injected from DB during rendering
}

/**
 * Parses MCQ block content into structured data
 */
function parseMCQBlock(content: string): MCQData {
  const lines = content.trim().split("\n");
  let question = "";
  const options: MCQOption[] = [];
  let currentOption: MCQOption | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Parse question (lines starting with #)
    if (trimmedLine.startsWith("#")) {
      question = trimmedLine.replace(/^#+\s*/, "").trim();
      continue;
    }

    // Parse options (lines starting with - [ ] or - [x])
    const optionMatch = trimmedLine.match(/^-\s*\[([x\s])\]\s*(.+)$/);
    if (optionMatch) {
      const [, checked, text] = optionMatch;
      currentOption = {
        text: text.trim(),
        isCorrect: checked.toLowerCase() === "x",
      };
      options.push(currentOption);
      continue;
    }

    // Parse explanation (lines starting with >)
    if (trimmedLine.startsWith(">") && currentOption) {
      const explanation = trimmedLine.replace(/^>\s*/, "").trim();
      currentOption.explanation = explanation;
      continue;
    }
  }

  // Determine if multi-select based on number of correct answers
  const correctCount = options.filter((opt) => opt.isCorrect).length;
  const isMultiSelect = correctCount > 1;

  return {
    question,
    options,
    isMultiSelect,
  };
}

/**
 * Renders MCQ data as HTML
 * If quizItemId is provided, it will be injected into the HTML
 */
function renderMCQ(data: MCQData, quizItemId?: string): string {
  const inputType = data.isMultiSelect ? "checkbox" : "radio";
  const quizItemAttr = quizItemId ? `data-quiz-item-id="${quizItemId}"` : "";

  const optionsHtml = data.options
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
<div class="mcq-block" ${quizItemAttr} data-multi-select="${data.isMultiSelect}">
  <div class="mcq-question">${data.question}</div>
  <div class="mcq-options">
    ${optionsHtml}
  </div>
</div>
  `.trim();
}

/**
 * Creates a marked extension for MCQ blocks
 * Can optionally provide a mapping of orderIndex -> quizItemId to inject IDs during rendering
 */
export function createMCQExtension(quizItemIds?: Map<number, string>) {
  let mcqIndex = 0;

  return {
    name: "mcq",
    level: "block" as const,
    start(src: string) {
      return src.match(/:::mcq/)?.index;
    },
    tokenizer(src: string): MCQToken | undefined {
      const match = src.match(/^:::mcq\n([\s\S]*?)\n:::/);
      if (!match) return undefined;

      const [raw, content] = match;
      const data = parseMCQBlock(content);
      const currentIndex = mcqIndex++;

      return {
        type: "mcq",
        raw,
        data,
        quizItemId: quizItemIds?.get(currentIndex),
      };
    },
    renderer(token: Token): string {
      const mcqToken = token as MCQToken;
      return renderMCQ(mcqToken.data, mcqToken.quizItemId);
    },
  };
}

/**
 * Helper to extract MCQ data from tokens (useful for testing or processing)
 */
export function extractMCQData(tokens: Token[]): MCQData[] {
  return tokens
    .filter((token): token is MCQToken => token.type === "mcq")
    .map((token) => token.data);
}
