import { Hono } from 'hono'
import { createDb, schema } from './db'
import { renderer } from './renderer'
import { createAuth } from './auth'
import type { Auth } from './auth'

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
  return c.render(<h1>Hello!</h1>)
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
