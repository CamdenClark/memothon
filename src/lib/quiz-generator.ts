import { callOpenRouterStream, type User } from "./openrouter";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "../db/schema";

interface QuizItemResponse {
  question: string;
  options: Array<{
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }>;
}

export interface QuizItemWithId extends QuizItemResponse {
  id: string;
}

/**
 * Stream quiz item generation using tool calling
 * Yields quiz items as they're generated and saves them to DB
 */
export async function* streamQuizGeneration(
  user: User,
  lessonId: string,
  lessonContent: string,
  db: NeonHttpDatabase<typeof schema>
): AsyncGenerator<QuizItemWithId> {
  const stream = await callOpenRouterStream(user, {
    model: "anthropic/claude-sonnet-4.5",
    messages: [
      {
        role: "user",
        content: `Based on this lesson content, generate 2-3 multiple choice questions to test understanding. Make them practical and directly related to the key concepts taught.

Lesson content:
${lessonContent}`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "create_quiz_items",
          description:
            "Create multiple choice quiz items to test lesson comprehension",
          parameters: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: {
                      type: "string",
                      description: "The question text",
                    },
                    options: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          text: {
                            type: "string",
                            description: "The option text",
                          },
                          isCorrect: {
                            type: "boolean",
                            description: "Whether this option is correct",
                          },
                          explanation: {
                            type: "string",
                            description:
                              "Optional explanation for why this is/isn't correct",
                          },
                        },
                        required: ["text", "isCorrect"],
                      },
                      description: "The answer options (must have exactly 4)",
                      minItems: 4,
                      maxItems: 4,
                    },
                  },
                  required: ["question", "options"],
                },
                description: "Array of quiz items",
                minItems: 2,
                maxItems: 3,
              },
            },
            required: ["items"],
          },
        },
      },
    ],
    tool_choice: {
      type: "function",
      function: { name: "create_quiz_items" },
    },
  });

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let toolCallArguments = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            // Parse the final tool call arguments
            if (toolCallArguments) {
              const { items } = JSON.parse(toolCallArguments) as {
                items: QuizItemResponse[];
              };

              // Save and yield each quiz item
              for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const isMultiSelect =
                  item.options.filter((opt) => opt.isCorrect).length > 1;

                const quizItemId = crypto.randomUUID();
                await db.insert(schema.quizItems).values({
                  id: quizItemId,
                  lessonId,
                  type: "mcq",
                  question: item.question,
                  config: {
                    options: item.options,
                    isMultiSelect,
                  },
                  orderIndex: i,
                });

                yield { ...item, id: quizItemId };
              }
            }
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;

            // Accumulate tool call arguments
            if (delta?.tool_calls?.[0]?.function?.arguments) {
              toolCallArguments += delta.tool_calls[0].function.arguments;
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
