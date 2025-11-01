import { Hono } from 'hono'
import { createDb, schema } from '../db'
import { generateCodeVerifier, generateCodeChallenge } from '../lib/oauth'
import { setCookie, getCookie } from 'hono/cookie'
import { eq } from 'drizzle-orm'
import type { Auth } from '../auth'

type Variables = {
  auth: Auth
  user: any | null
  session: any | null
}

const openrouter = new Hono<{
  Bindings: CloudflareBindings
  Variables: Variables
}>()

// Initiate OpenRouter OAuth flow
openrouter.get('/initiate', async (c) => {
  const user = c.get('user')

  if (!user) {
    return c.redirect('/signin?error=not_authenticated')
  }

  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  // Store the code verifier in a secure cookie for the callback
  setCookie(c, 'openrouter_verifier', codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  // Build the OpenRouter authorization URL
  const callbackUrl = `${c.env.BETTER_AUTH_URL}/oauth/openrouter/callback`
  const authUrl = new URL('https://openrouter.ai/auth')
  authUrl.searchParams.set('callback_url', callbackUrl)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  return c.redirect(authUrl.toString())
})

// Handle OpenRouter OAuth callback
openrouter.get('/callback', async (c) => {
  const user = c.get('user')

  if (!user) {
    return c.redirect('/signin?error=not_authenticated')
  }

  // Get the authorization code from query params
  const code = c.req.query('code')
  if (!code) {
    return c.redirect('/?error=missing_code')
  }

  // Retrieve the code verifier from the cookie
  const codeVerifier = getCookie(c, 'openrouter_verifier')
  if (!codeVerifier) {
    return c.redirect('/?error=missing_verifier')
  }

  try {
    // Exchange the code for an API key
    const response = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        code_challenge_method: 'S256',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter key exchange failed:', error)
      return c.redirect('/?error=key_exchange_failed')
    }

    const data = await response.json()
    const apiKey = data.key

    // Store the API key in the user's record
    const db = createDb(c.env.DATABASE_URL)
    await db
      .update(schema.user)
      .set({ openrouterApiKey: apiKey })
      .where(eq(schema.user.id, user.id))

    // Clear the verifier cookie
    setCookie(c, 'openrouter_verifier', '', {
      maxAge: 0,
      path: '/',
    })

    return c.redirect('/?success=openrouter_connected')
  } catch (error) {
    console.error('Error in OpenRouter callback:', error)
    return c.redirect('/?error=callback_failed')
  }
})

export default openrouter
