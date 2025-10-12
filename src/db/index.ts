import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export function createDb(databaseUrl: string) {
  return drizzle(databaseUrl, { schema })
}

export { schema }