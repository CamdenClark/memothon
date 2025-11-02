import { Hono } from "hono";
import { createDb, schema } from "./db";
import { eq } from "drizzle-orm";
import { renderer } from "./renderer";
import { createAuth } from "./auth";
import type { Auth } from "./auth";
import { HomePage } from "./pages/HomePage";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";
import { SettingsPage } from "./pages/SettingsPage";
import openrouter from "./routes/openrouter";
import topics from "./routes/topics";
import { callOpenRouter } from "./lib/openrouter";

type Variables = {
  auth: Auth;
  user: Auth["$Infer"]["Session"]["user"] | null;
  session: Auth["$Infer"]["Session"]["session"] | null;
};

const app = new Hono<{
  Bindings: CloudflareBindings;
  Variables: Variables;
}>();

app.use(renderer);

// Initialize auth for each request
app.use("*", async (c, next) => {
  const auth = createAuth({
    DATABASE_URL: c.env.DATABASE_URL,
    BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
  });
  c.set("auth", auth);
  await next();
});

// Mount auth routes
app.on(["POST", "GET"], "/api/auth/*", async (c) => {
  const auth = c.get("auth");
  return auth.handler(c.req.raw);
});

// Authentication middleware
app.use("*", async (c, next) => {
  const auth = c.get("auth");
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});

app.get("/", (c) => {
  const user = c.get("user");
  return c.render(<HomePage user={user} />);
});

app.get("/settings", (c) => {
  const user = c.get("user");
  return c.render(<SettingsPage user={user} />);
});

app.get("/signin", (c) => {
  return c.render(<SignInPage />);
});

app.get("/signup", (c) => {
  return c.render(<SignUpPage />);
});

app.post("/signup", async (c) => {
  const formData = await c.req.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = (formData.get("name") as string) || email;

  // Forward to better-auth's handler
  const authRequest = new Request(
    `${c.env.BETTER_AUTH_URL}/api/auth/sign-up/email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name }),
    }
  );

  const auth = c.get("auth");
  const authResponse = await auth.handler(authRequest);

  // If successful, set cookies and redirect
  if (authResponse.ok) {
    const setCookieHeaders = authResponse.headers.getSetCookie();
    const response = c.redirect("/");

    for (const cookieHeader of setCookieHeaders) {
      response.headers.append("Set-Cookie", cookieHeader);
    }

    return response;
  }

  // On error, redirect back to signup with error
  return c.redirect("/signup?error=signup_failed");
});

app.post("/signin", async (c) => {
  const formData = await c.req.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Forward to better-auth's handler
  const authRequest = new Request(
    `${c.env.BETTER_AUTH_URL}/api/auth/sign-in/email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  );

  const auth = c.get("auth");
  const authResponse = await auth.handler(authRequest);

  // If successful, set cookies and redirect
  if (authResponse.ok) {
    const setCookieHeaders = authResponse.headers.getSetCookie();
    const response = c.redirect("/");

    for (const cookieHeader of setCookieHeaders) {
      response.headers.append("Set-Cookie", cookieHeader);
    }

    return response;
  }

  // On error, redirect back to signin with error
  return c.redirect("/signin?error=signin_failed");
});

app.post("/signout", async (c) => {
  // Forward to better-auth's sign-out handler
  const authRequest = new Request(
    `${c.env.BETTER_AUTH_URL}/api/auth/sign-out`,
    {
      method: "POST",
      headers: c.req.raw.headers,
    }
  );

  const auth = c.get("auth");
  const authResponse = await auth.handler(authRequest);

  // Set cookies from auth response and redirect
  const setCookieHeaders = authResponse.headers.getSetCookie();
  const response = c.redirect("/");

  for (const cookieHeader of setCookieHeaders) {
    response.headers.append("Set-Cookie", cookieHeader);
  }

  return response;
});

app.get("/session", (c) => {
  const session = c.get("session");
  const user = c.get("user");

  return c.json({ session, user });
});

// Mount topic routes
app.route("/topics", topics);

// SSE endpoint for streaming explanations
app.get("/stream-explanation", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.text("Unauthorized", 401);
  }

  const topicIdParam = c.req.query("topicId");
  const topicParam = c.req.query("topic");

  let topic: string;

  if (topicIdParam) {
    // Fetch topic from database
    const db = createDb(c.env.DATABASE_URL);
    const [topicRecord] = await db
      .select()
      .from(schema.topics)
      .where(eq(schema.topics.id, topicIdParam));

    if (!topicRecord) {
      return c.text("Topic not found", 404);
    }

    if (topicRecord.userId !== user.id) {
      return c.text("Unauthorized", 403);
    }

    topic = topicRecord.title;
  } else if (topicParam) {
    topic = topicParam;
  } else {
    return c.text("Topic or topicId is required", 400);
  }

  if (!topic.trim()) {
    return c.text("Topic is required", 400);
  }

  try {
    const { callOpenRouterStream } = await import("./lib/openrouter");
    const { marked } = await import("marked");

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

// Mount OpenRouter OAuth routes
app.route("/oauth/openrouter", openrouter);

export default app;
