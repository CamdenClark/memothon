# memothon

This repository contains a minimal Go HTTP server built with the Gin framework. The server exposes two routes:

- `GET /` responds with a welcome message.
- `GET /health` responds with a simple health check payload.

## Prerequisites

- [Go](https://golang.org/doc/install) 1.24 or newer

## Running the server

```bash
go run .
```

The server listens on [http://localhost:8080](http://localhost:8080).
