import { Hono } from 'hono'
import { createDb, schema } from './db'
import { renderer } from './renderer'

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.use(renderer)

app.get('/', (c) => {
  return c.render(<h1>Hello!</h1>)
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
