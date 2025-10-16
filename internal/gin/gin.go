package gin

import (
	"encoding/json"
	"net/http"
)

// H is a shortcut for creating JSON objects in handlers.
type H map[string]any

// Context wraps the request and response writer for handler functions.
type Context struct {
	Writer  http.ResponseWriter
	Request *http.Request
}

// JSON writes the provided object as JSON with the supplied status code.
func (c *Context) JSON(statusCode int, obj any) {
	c.Writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	c.Writer.WriteHeader(statusCode)
	_ = json.NewEncoder(c.Writer).Encode(obj)
}

// HandlerFunc represents the handler used by gin.
type HandlerFunc func(*Context)

// Engine is the core of the router.
type Engine struct {
	mux *http.ServeMux
}

// Default creates a new Engine with default middleware.
func Default() *Engine {
	return &Engine{mux: http.NewServeMux()}
}

// GET registers a handler for GET requests at the given path.
func (e *Engine) GET(path string, handler HandlerFunc) {
	e.mux.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.NotFound(w, r)
			return
		}
		handler(&Context{Writer: w, Request: r})
	})
}

// Run starts the HTTP server on the specified address.
func (e *Engine) Run(addr ...string) error {
	address := ":8080"
	if len(addr) > 0 {
		address = addr[0]
	}
	server := &http.Server{
		Addr:    address,
		Handler: e.mux,
	}
	return server.ListenAndServe()
}
