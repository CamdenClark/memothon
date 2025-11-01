import { Hono } from 'hono'
import { createDb, schema } from './db'
import { renderer } from './renderer'
import { createAuth } from './auth'
import type { Auth } from './auth'
import { HomePage } from './pages/HomePage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'
import { generateCodeVerifier, generateCodeChallenge } from './lib/oauth'
import { setCookie, getCookie } from 'hono/cookie'
import { eq } from 'drizzle-orm'

type Variables = {
  auth: Auth
  user: any | null
  session: any | null
}

const app = new Hono<{ 
  Bindings: CloudflareBindings
  Variables: Variables
}>()

app.use(renderer)

// Initialize auth for each request
app.use('*', async (c, next) => {
  const auth = createAuth({
    DATABASE_URL: c.env.DATABASE_URL,
    BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
  })
  c.set('auth', auth)
  await next()
})

// Mount auth routes
app.on(['POST', 'GET'], '/api/auth/*', async (c) => {
  const auth = c.get('auth')
  return auth.handler(c.req.raw)
})

// Authentication middleware
app.use('*', async (c, next) => {
  const auth = c.get('auth')
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    c.set('user', null)
    c.set('session', null)
    return next()
  }

  c.set('user', session.user)
  c.set('session', session.session)
  return next()
})

app.get('/', (c) => {
  const user = c.get('user')
  return c.render(<HomePage user={user} />)
})

app.get('/signin', (c) => {
  return c.render(<SignInPage />)
})

app.get('/signup', (c) => {
  return c.render(<SignUpPage />)
})

app.post('/signup', async (c) => {
  const formData = await c.req.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string || email

  // Forward to better-auth's handler
  const authRequest = new Request(`${c.env.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  })

  const auth = c.get('auth')
  const authResponse = await auth.handler(authRequest)

  // If successful, set cookies and redirect
  if (authResponse.ok) {
    const setCookieHeaders = authResponse.headers.getSetCookie()
    const response = c.redirect('/')

    for (const cookieHeader of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookieHeader)
    }

    return response
  }

  // On error, redirect back to signup with error
  return c.redirect('/signup?error=signup_failed')
})

app.post('/signin', async (c) => {
  const formData = await c.req.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Forward to better-auth's handler
  const authRequest = new Request(`${c.env.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  const auth = c.get('auth')
  const authResponse = await auth.handler(authRequest)

  // If successful, set cookies and redirect
  if (authResponse.ok) {
    const setCookieHeaders = authResponse.headers.getSetCookie()
    const response = c.redirect('/')

    for (const cookieHeader of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookieHeader)
    }

    return response
  }

  // On error, redirect back to signin with error
  return c.redirect('/signin?error=signin_failed')
})

app.post('/signout', async (c) => {
  // Forward to better-auth's sign-out handler
  const authRequest = new Request(`${c.env.BETTER_AUTH_URL}/api/auth/sign-out`, {
    method: 'POST',
    headers: c.req.raw.headers,
  })

  const auth = c.get('auth')
  const authResponse = await auth.handler(authRequest)

  // Set cookies from auth response and redirect
  const setCookieHeaders = authResponse.headers.getSetCookie()
  const response = c.redirect('/')

  for (const cookieHeader of setCookieHeaders) {
    response.headers.append('Set-Cookie', cookieHeader)
  }

  return response
})

app.get('/session', (c) => {
  const session = c.get('session')
  const user = c.get('user')
  
  return c.json({ session, user })
})

app.get('/test-db', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)

    // Test connection with a simple query
    const result = await db.execute('SELECT 1 as test')

    return c.json({ success: true, result: result.rows[0] })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// OpenRouter OAuth routes
app.get('/oauth/openrouter/initiate', async (c) => {
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

app.get('/oauth/openrouter/callback', async (c) => {
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

export default app
