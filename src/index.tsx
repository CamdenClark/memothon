import { Hono } from "hono";
import { createDb, schema } from "./db";
import { renderer } from "./renderer";
import { createAuth } from "./auth";
import type { Auth } from "./auth";
import { HomePage } from "./pages/HomePage";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";
import { ExplanationPage } from "./pages/ExplanationPage";
import openrouter from "./routes/openrouter";
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

app.get("/test-db", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);

    // Test connection with a simple query
    const result = await db.execute("SELECT 1 as test");

    return c.json({ success: true, result: result.rows[0] });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Generate topic explanation - immediately returns page with loading state
app.post("/generate-explanation", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.redirect("/signin?error=not_authenticated");
  }

  try {
    const body = await c.req.parseBody();
    const topic = body.topic as string;

    if (!topic || !topic.trim()) {
      return c.render(
        <ExplanationPage
          user={user}
          topic=""
          explanation=""
          error="Please provide a topic"
        />
      );
    }

    // Immediately return the page with the topic - explanation will stream via SSE
    return c.render(
      <ExplanationPage
        user={user}
        topic={topic}
        explanation=""
        streaming={true}
      />
    );
  } catch (error) {
    console.error("Error generating explanation:", error);
    const body = await c.req.parseBody();
    const topic = (body.topic as string) || "";

    return c.render(
      <ExplanationPage
        user={c.get("user")}
        topic={topic}
        explanation=""
        error={
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        }
      />
    );
  }
});

// SSE endpoint for streaming explanations
app.get("/stream-explanation", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.text("Unauthorized", 401);
  }

  const topic = c.req.query("topic");

  if (!topic || !topic.trim()) {
    return c.text("Topic is required", 400);
  }

  try {
    const { callOpenRouterStream } = await import("./lib/openrouter");

    // Get the streaming response from OpenRouter
    const stream = await callOpenRouterStream(user, {
      model: "anthropic/claude-sonnet-4.5",
      messages: [
        {
          role: "user",
          content: `Please provide a detailed explanation of the following topic in approximately 5 paragraphs. Make it educational and easy to understand:\n\n${topic}`,
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

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Send final event to close the stream
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
                    // Send content chunk as SSE event
                    const sseMessage = `data: ${content}\n\n`;
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
