import type { FC } from "hono/jsx";
import { Layout } from "../components/Layout";

interface ExplanationPageProps {
  user: any;
  topic: string;
  explanation: string;
  error?: string;
}

export const ExplanationPage: FC<ExplanationPageProps> = ({
  user,
  topic,
  explanation,
  error,
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
              {explanation.split("\n").map((paragraph, idx) => {
                if (paragraph.trim()) {
                  return (
                    <p key={idx} class="mb-4 text-gray-700 leading-relaxed">
                      {paragraph}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
