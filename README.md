# Memothon

A Cloudflare Workers application built with Hono, Vite, and Better Auth.

## Quick Start

```bash
bun install
bun run dev
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
