import { Hono } from 'hono'
import { Client } from '@neondatabase/serverless'
import { renderer } from './renderer'

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.use(renderer)

app.get('/', (c) => {
  return c.render(<h1>Hello!</h1>)
})

app.get('/test-db', async (c) => {
  try {
    const client = new Client(c.env.DATABASE_URL)
    await client.connect()
    
    const result = await client.query('SELECT 1 as test')
    await client.end()
    
    return c.json({ success: true, result: result.rows[0] })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default app
