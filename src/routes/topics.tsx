import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq } from "drizzle-orm";
import type { Auth } from "../auth";
import { ExplanationPage } from "../pages/ExplanationPage";
import { callOpenRouterStream } from "../lib/openrouter";
import { marked } from "marked";

type Variables = {
  auth: Auth;
  user: Auth["$Infer"]["Session"]["user"] | null;
  session: Auth["$Infer"]["Session"]["session"] | null;
};

const topics = new Hono<{
  Bindings: CloudflareBindings;
  Variables: Variables;
}>();

// Handle topic page - GET displays existing topic, POST creates or displays topic
topics.get("/:id/learn", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.redirect("/signin?error=not_authenticated");
  }

  try {
    const topicId = c.req.param("id");

    // Fetch the topic from database
    const db = createDb(c.env.DATABASE_URL);
    const [topic] = await db
      .select()
      .from(schema.topics)
      .where(eq(schema.topics.id, topicId));

    if (!topic) {
      return c.redirect("/?error=topic_not_found");
    }

    // Verify the topic belongs to the current user
    if (topic.userId !== user.id) {
      return c.redirect("/?error=unauthorized");
    }

    // Return the page with streaming enabled
    return c.render(
      <ExplanationPage
        user={user}
        topic={topic.title}
        topicId={topic.id}
        explanation=""
        streaming={true}
      />
    );
  } catch (error) {
    console.error("Error loading topic:", error);
    return c.redirect("/?error=topic_load_failed");
  }
});

topics.post("/:id/learn", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.redirect("/signin?error=not_authenticated");
  }

  try {
    const topicId = c.req.param("id");
    const body = await c.req.parseBody();
    const title = body.title as string;

    if (!title || !title.trim()) {
      return c.redirect("/?error=topic_required");
    }

    const db = createDb(c.env.DATABASE_URL);

    // Try to fetch existing topic
    const [existingTopic] = await db
      .select()
      .from(schema.topics)
      .where(eq(schema.topics.id, topicId));

    if (existingTopic) {
      // Topic exists, verify ownership
      if (existingTopic.userId !== user.id) {
        return c.redirect("/?error=unauthorized");
      }

      // Return the page with the existing topic
      return c.render(
        <ExplanationPage
          user={user}
          topic={existingTopic.title}
          topicId={existingTopic.id}
          explanation=""
          streaming={true}
        />
      );
    }

    // Topic doesn't exist, create it
    const [newTopic] = await db
      .insert(schema.topics)
      .values({
        id: topicId,
        userId: user.id,
        title: title.trim(),
      })
      .returning();

    // Return the page with the new topic
    return c.render(
      <ExplanationPage
        user={user}
        topic={newTopic.title}
        topicId={newTopic.id}
        explanation=""
        streaming={true}
      />
    );
  } catch (error) {
    console.error("Error creating/loading topic:", error);
    return c.redirect("/?error=topic_operation_failed");
  }
});

// SSE endpoint for streaming topic explanations
topics.get("/:id/lesson", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.text("Unauthorized", 401);
  }

  const topicId = c.req.param("id");

  // Fetch topic from database
  const db = createDb(c.env.DATABASE_URL);
  const [topicRecord] = await db
    .select()
    .from(schema.topics)
    .where(eq(schema.topics.id, topicId));

  if (!topicRecord) {
    return c.text("Topic not found", 404);
  }

  if (topicRecord.userId !== user.id) {
    return c.text("Unauthorized", 403);
  }

  const topic = topicRecord.title;

  if (!topic.trim()) {
    return c.text("Topic is required", 400);
  }

  // If lesson content already exists, return it directly
  if (topicRecord.lessonContent) {
    try {
      const html = await marked.parse(topicRecord.lessonContent);
      const lines = html.split("\n");
      const sseMessage =
        lines.map((line) => `data: ${line}`).join("\n") + "\n\n";
      const doneMessage = "event: done\ndata: \n\n";

      return new Response(sseMessage + doneMessage, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      console.error("Error parsing cached lesson content:", error);
      // Fall through to regenerate if there's an error
    }
  }

  try {
    // Get the streaming response from OpenRouter
    const stream = await callOpenRouterStream(user, {
      model: "anthropic/claude-sonnet-4.5",
      messages: [
        {
          role: "user",
          content: `Teach me about "${topic}" in a clear, concise lesson. Keep it bite-sized - something I could absorb in a few minutes. Focus on:

1. The core concept explained simply
2. Why it matters or when I'd use it
3. A quick example or analogy to make it concrete

Use markdown formatting (headings, bold, lists, code blocks) to structure it clearly. Keep the total length to 2-3 short paragraphs maximum. Make it conversational and engaging, like you're explaining it to a friend.`,
        },
      ],
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();

    // Create a readable stream that transforms OpenRouter SSE to our SSE format
    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
          let markdownAccumulator = "";

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Save the accumulated markdown to the database
              if (markdownAccumulator.trim()) {
                try {
                  await db
                    .update(schema.topics)
                    .set({ lessonContent: markdownAccumulator })
                    .where(eq(schema.topics.id, topicId));
                } catch (dbError) {
                  console.error("Error saving lesson content to DB:", dbError);
                }
              }

              // Send done event to close the stream
              controller.enqueue(
                new TextEncoder().encode("event: done\ndata: \n\n")
              );
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);

                if (data === "[DONE]") {
                  // Save the accumulated markdown to the database
                  if (markdownAccumulator.trim()) {
                    try {
                      await db
                        .update(schema.topics)
                        .set({ lessonContent: markdownAccumulator })
                        .where(eq(schema.topics.id, topicId));
                    } catch (dbError) {
                      console.error(
                        "Error saving lesson content to DB:",
                        dbError
                      );
                    }
                  }

                  // Send done event to close the stream
                  controller.enqueue(
                    new TextEncoder().encode("event: done\ndata: \n\n")
                  );
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;

                  if (content) {
                    markdownAccumulator += content;
                    // Parse accumulated markdown to HTML and send the full HTML
                    const html = await marked.parse(markdownAccumulator);
                    // For SSE format, split multi-line data with each line prefixed by "data: "
                    const lines = html.split("\n");
                    const sseMessage =
                      lines.map((line) => `data: ${line}`).join("\n") + "\n\n";
                    controller.enqueue(new TextEncoder().encode(sseMessage));
                  }
                } catch (e) {
                  // Skip malformed JSON
                  console.error("Error parsing SSE data:", e);
                }
              }
            }
          }
        } catch (error) {
          console.error("SSE stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in SSE endpoint:", error);
    return c.text(
      error instanceof Error ? error.message : "An unexpected error occurred",
      500
    );
  }
});

export default topics;
