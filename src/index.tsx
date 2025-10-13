import { Hono } from 'hono'
import { createDb, schema } from './db'
import { renderer } from './renderer'
import { createAuth } from './auth'
import type { Auth } from './auth'
import { HomePage } from './pages/HomePage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'

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

export default app
