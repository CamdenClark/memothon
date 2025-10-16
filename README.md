# memothon

This repository contains a minimal Go HTTP server built with the Gin framework and HTML rendering powered by [templ](https://templ.guide/). The server exposes two routes:

- `GET /` renders an HTML welcome page using templ components.
- `GET /health` responds with a simple JSON health check payload.

## Prerequisites

- [Go](https://golang.org/doc/install) 1.24 or newer

## Development workflow

Common tasks are available through the provided `Makefile`:

```bash
make run    # Run the development server
make build  # Build the binary
make test   # Execute go test ./...
make tidy   # Clean up module dependencies
make fmt    # Format Go source files
make templ  # Regenerate templ components from *.templ files
```

You can still run the server directly with Go if you prefer:

```bash
go run .
```

The server listens on [http://localhost:8080](http://localhost:8080).
