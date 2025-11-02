/**
 * OpenRouter LLM Service
 * Handles API calls to OpenRouter for LLM completions
 */

export interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OpenRouterCompletionRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  [key: string]: any; // Allow other OpenRouter-specific parameters
}

export interface OpenRouterCompletionResponse {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

export interface User {
  id: string;
  openrouterApiKey?: string | null;
  [key: string]: any;
}

/**
 * Calls OpenRouter API for chat completions
 * @param user - User object from context (must have openrouterApiKey)
 * @param requestBody - The completion request parameters
 * @returns OpenRouter API response
 * @throws Error if user has no API key or if the API call fails
 */
export async function callOpenRouter(
  user: User,
  requestBody: OpenRouterCompletionRequest
): Promise<OpenRouterCompletionResponse> {
  // Validate user has an API key
  if (!user.openrouterApiKey) {
    throw new Error("User has not connected OpenRouter API key");
  }

  // Make the API call to OpenRouter
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.openrouterApiKey}`,
        "HTTP-Referer": "https://memothon.app", // Optional: your site URL
        "X-Title": "Memothon", // Optional: your app name
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorData = (await response.json()) as OpenRouterError;
    throw new Error(
      `OpenRouter API error: ${errorData.error?.message || response.statusText}`
    );
  }

  return (await response.json()) as OpenRouterCompletionResponse;
}

/**
 * Calls OpenRouter API for streaming chat completions
 * @param user - User object from context (must have openrouterApiKey)
 * @param requestBody - The completion request parameters (stream will be set to true)
 * @returns ReadableStream for streaming responses
 * @throws Error if user has no API key or if the API call fails
 */
export async function callOpenRouterStream(
  user: User,
  requestBody: Omit<OpenRouterCompletionRequest, "stream">
): Promise<ReadableStream> {
  // Validate user has an API key
  if (!user.openrouterApiKey) {
    throw new Error("User has not connected OpenRouter API key");
  }

  // Make the API call to OpenRouter with streaming enabled
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.openrouterApiKey}`,
        "HTTP-Referer": "https://memothon.app", // Optional: your site URL
        "X-Title": "Memothon", // Optional: your app name
      },
      body: JSON.stringify({
        ...requestBody,
        stream: true,
      }),
    }
  );

  if (!response.ok) {
    const errorData = (await response.json()) as OpenRouterError;
    throw new Error(
      `OpenRouter API error: ${errorData.error?.message || response.statusText}`
    );
  }

  if (!response.body) {
    throw new Error("No response body received from OpenRouter");
  }

  return response.body;
}
