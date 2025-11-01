# Memothon

A Cloudflare Workers application built with Hono, Vite, and Better Auth.

## Quick Start

```bash
bun install
bun run dev
```

## Development

### Testing

```bash
bun test              # Run tests in watch mode
bun run test:run      # Run tests once
bun run test:ui       # Run tests with UI
```

### Type Checking

```bash
bun run typecheck
```

### Formatting

```bash
bun run format        # Format code with Prettier
bun run format:check  # Check formatting without making changes
```

## Deployment

```bash
bun run deploy
```

## Type Generation

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```bash
bun run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>();
```
