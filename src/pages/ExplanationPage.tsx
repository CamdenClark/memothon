import type { FC } from "hono/jsx";
import { Layout } from "../components/Layout";

interface ExplanationPageProps {
  user: any;
  topic: string;
  topicId?: string;
  explanation: string;
  error?: string;
  streaming?: boolean;
}

export const ExplanationPage: FC<ExplanationPageProps> = ({
  user,
  topic,
  topicId,
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
            <>
              <p id="loading-indicator" aria-busy="true">
                Generating explanation...
              </p>
              <div
                id="explanation-content"
                hx-ext="sse"
                sse-connect={`/topics/${topicId}/lesson`}
                sse-swap="message"
                sse-close="done"
                hx-swap="beforeend"
              ></div>
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                document.getElementById('explanation-content').addEventListener('htmx:sseMessage', function() {
                  const loader = document.getElementById('loading-indicator');
                  if (loader) {
                    loader.remove();
                  }
                }, { once: true });
              `,
                }}
              />
            </>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: explanation }} />
          )}
        </article>
      )}
    </Layout>
  );
};
