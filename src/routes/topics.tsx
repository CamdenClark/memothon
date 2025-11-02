import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq } from "drizzle-orm";
import type { Auth } from "../auth";
import { ExplanationPage } from "../pages/ExplanationPage";

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

export default topics;
