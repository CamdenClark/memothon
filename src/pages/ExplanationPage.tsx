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
      <div class="px-4 py-6 sm:px-0 max-w-4xl mx-auto">
        <div class="mb-6">
          <a
            href="/"
            class="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
          >
            <svg
              class="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </a>
        </div>

        {error ? (
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p class="font-bold">Error</p>
            <p>{error}</p>
          </div>
        ) : (
          <div class="bg-white border-2 border-gray-200 rounded-lg p-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-6">{topic}</h1>
            <div class="prose prose-lg max-w-none">
              {streaming ? (
                <div
                  id="explanation-content"
                  hx-ext="sse"
                  sse-connect={`/stream-explanation?topic=${encodeURIComponent(topic)}`}
                  sse-swap="message"
                  sse-close="done"
                  hx-swap="innerHTML"
                >
                  <div class="mb-4 text-gray-500 italic flex items-center gap-2">
                    <svg
                      class="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Generating explanation...
                  </div>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: explanation }} />
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
