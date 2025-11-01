/**
 * OAuth PKCE (Proof Key for Code Exchange) helper functions
 * Based on OpenRouter OAuth documentation
 */

/**
 * Generates a cryptographically secure random code verifier
 * @returns A base64url-encoded random string
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Creates a code challenge from a code verifier using SHA-256
 * @param verifier The code verifier string
 * @returns A base64url-encoded SHA-256 hash of the verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Encodes a Uint8Array to base64url format (RFC 4648)
 * @param array The array to encode
 * @returns Base64url-encoded string
 */
function base64UrlEncode(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
