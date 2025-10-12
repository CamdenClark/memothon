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

### Key Files
- `src/index.tsx` - Main Hono application with routes
- `src/renderer.tsx` - JSX renderer setup with HTML layout
- `src/style.css` - Application styles
- `wrangler.jsonc` - Cloudflare Workers configuration
- `vite.config.ts` - Vite configuration with Cloudflare plugin
- `.dev.vars` - Local environment variables (not committed)

### Application Structure
The app uses Hono's JSX renderer for server-side rendering. Routes are defined in `src/index.tsx` and use the renderer middleware from `src/renderer.tsx`. The renderer provides the base HTML structure with Vite client integration for development.

### TypeScript Configuration
- Uses Hono's JSX with `jsxImportSource: "hono/jsx"`
- Configured for ESNext modules with bundler resolution
- Includes Vite client types

### Cloudflare Integration
When adding Cloudflare bindings, run `npm run cf-typegen` to generate types, then pass `CloudflareBindings` as generics when instantiating Hono:

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```