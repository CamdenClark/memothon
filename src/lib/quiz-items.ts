import { marked } from "marked";
import type { Token } from "marked";
import { extractMCQData, createMCQExtension } from "./markdown";
import type { MCQData } from "./markdown";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "../db/schema";

/**
 * Config format for MCQ quiz items stored in DB
 */
export interface MCQConfig {
  options: Array<{
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }>;
  isMultiSelect: boolean;
}

/**
 * Extracts quiz items from markdown content and saves them to the database
 * Returns a mapping of orderIndex -> quizItemId for rendering
 */
export async function extractAndSaveQuizItems(
  db: NeonHttpDatabase<typeof schema>,
  lessonId: string,
  content: string
): Promise<Map<number, string>> {
  // Parse markdown to extract MCQ tokens (extension is globally registered)
  const tokens = marked.lexer(content);

  // Extract MCQ data from tokens
  const mcqData = extractMCQData(tokens);

  // Save each MCQ as a quiz item
  const quizItemIds = new Map<number, string>();

  for (let i = 0; i < mcqData.length; i++) {
    const mcq = mcqData[i];
    const config: MCQConfig = {
      options: mcq.options,
      isMultiSelect: mcq.isMultiSelect,
    };

    const [quizItem] = await db
      .insert(schema.quizItems)
      .values({
        id: crypto.randomUUID(),
        lessonId,
        type: "mcq",
        question: mcq.question,
        config,
        orderIndex: i,
      })
      .returning();

    quizItemIds.set(i, quizItem.id);
  }

  return quizItemIds;
}

/**
 * Loads quiz items for a lesson and returns a mapping of orderIndex -> quizItemId
 */
export async function loadQuizItemIds(
  db: NeonHttpDatabase<typeof schema>,
  lessonId: string
): Promise<Map<number, string>> {
  const quizItems = await db.query.quizItems.findMany({
    where: (quizItems, { eq }) => eq(quizItems.lessonId, lessonId),
    orderBy: (quizItems, { asc }) => [asc(quizItems.orderIndex)],
  });

  const quizItemIds = new Map<number, string>();
  for (const item of quizItems) {
    quizItemIds.set(item.orderIndex, item.id);
  }

  return quizItemIds;
}

/**
 * Renders markdown content with quiz item IDs injected
 */
export async function renderMarkdownWithQuizItems(
  db: NeonHttpDatabase<typeof schema>,
  lessonId: string,
  content: string
): Promise<string> {
  const quizItemIds = await loadQuizItemIds(db, lessonId);

  // Override the global MCQ extension with one that has IDs
  marked.use({
    extensions: [createMCQExtension(quizItemIds)],
  });

  return marked.parse(content);
}
