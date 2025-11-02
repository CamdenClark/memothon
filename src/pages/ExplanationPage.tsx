import type { FC } from "hono/jsx";
import { Layout } from "../components/Layout";

interface ExplanationPageProps {
  user: any;
  topic: string;
  explanation: string;
  error?: string;
  streaming?: boolean;
}

export const ExplanationPage: FC<ExplanationPageProps> = ({
  user,
  topic,
  explanation,
  error,
  streaming = false,
}) => {
  return (
    <Layout user={user} title={`Explanation: ${topic}`}>
      <p>
        <a href="/" role="button" class="secondary outline">
          ← Back to Home
        </a>
      </p>

      {error ? (
        <article style="background-color: var(--pico-del-background); border-color: var(--pico-del-color);">
          <h3>Error</h3>
          <p>{error}</p>
        </article>
      ) : (
        <article>
          <h1>{topic}</h1>
          {streaming ? (
            <div
              id="explanation-content"
              hx-ext="sse"
              sse-connect={`/stream-explanation?topic=${encodeURIComponent(topic)}`}
              sse-swap="message"
              sse-close="done"
              hx-swap="innerHTML"
            >
              <p aria-busy="true">Generating explanation...</p>
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: explanation }} />
          )}
        </article>
      )}
    </Layout>
  );
};
