# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use **Bun** instead of npm for all operations:

### Development

- `bun run dev` - Start development server with Vite
- `bun run build` - Build for production
- `bun run preview` - Build and preview production locally
- `bun add <package>` - Add dependencies
- `bun install` - Install dependencies

### Database

- `bun run db:generate` - Generate Drizzle migrations from schema
- `bun run db:push` - Push schema changes to database (uses dotenvx to load .dev.vars)

### Authentication

- `bunx cli generate` - Generate better-auth schema (requires auth config in src/auth.ts)
- `bunx cli secret` - Generate a new BETTER_AUTH_SECRET

### Deployment

- `bun run deploy` - Build and deploy to Cloudflare Workers
- `bun run cf-typegen` - Generate TypeScript types from Cloudflare Worker configuration

## Architecture

This is a **Cloudflare Workers application** built with:

- **Hono** as the web framework
- **Vite** for building and development
- **JSX/TSX** for rendering with Hono's JSX renderer
- **vite-ssr-components** for SSR integration
- **Neon Database** for PostgreSQL with `@neondatabase/serverless`
- **Drizzle ORM** for type-safe database operations
- **Better Auth** for authentication with email/password

### Key Files

- `src/index.tsx` - Main Hono application with routes and auth integration
- `src/renderer.tsx` - JSX renderer setup with HTML layout
- `src/style.css` - Application styles
- `src/auth.ts` - Better Auth configuration
- `src/db/schema.ts` - Drizzle database schema definitions (includes auth tables)
- `src/db/auth-schema.ts` - Better Auth generated schema
- `src/db/index.ts` - Database connection and exports
- `drizzle.config.ts` - Drizzle Kit configuration
- `wrangler.jsonc` - Cloudflare Workers configuration
- `vite.config.ts` - Vite configuration with Cloudflare plugin
- `.dev.vars` - Local environment variables (not committed)

### Application Structure

The app uses Hono's JSX renderer for server-side rendering. Routes are defined in `src/index.tsx` and use the renderer middleware from `src/renderer.tsx`. The renderer provides the base HTML structure with Vite client integration for development.

### Authentication System

Better Auth is integrated with Hono providing:

- **Auth routes** mounted at `/api/auth/*` (sign-up, sign-in, session, etc.)
- **Session middleware** that sets `user` and `session` context variables
- **Database schema** auto-generated using `bunx cli generate`
- **Email/password** authentication enabled

Access user/session in routes:

```tsx
app.get("/protected", (c) => {
  const user = c.get("user");
  const session = c.get("session");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ message: `Hello ${user.name}` });
});
```

Required environment variables in `.dev.vars`:

- `BETTER_AUTH_SECRET` - Generate with `bunx cli secret`
- `BETTER_AUTH_URL` - Base URL (e.g., http://localhost:5173)

### TypeScript Configuration

- Uses Hono's JSX with `jsxImportSource: "hono/jsx"`
- Configured for ESNext modules with bundler resolution
- Includes Vite client types

### Cloudflare Integration

When adding Cloudflare bindings, run `bun run cf-typegen` to generate types, then pass `CloudflareBindings` as generics when instantiating Hono:

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>();
```

### Utilities

- `./cwt <branch-name>` - Create a new git worktree at `../memothon-{branch-name}` with `.dev.vars` copied and a new shell opened in that directory
