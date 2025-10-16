package main

import (
	"log"
	"net/http"

	"github.com/a-h/templ"
	"github.com/gin-gonic/gin"

	"memothon/views"
)

func main() {
	router := gin.Default()

	router.GET("/", func(c *gin.Context) {
		renderTempl(c, views.Home("Memothon", "Welcome to memothon!"))
	})

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	if err := router.Run(); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}

func renderTempl(c *gin.Context, component templ.Component) {
	c.Header("Content-Type", "text/html; charset=utf-8")

	if err := component.Render(c.Request.Context(), c.Writer); err != nil {
		c.Error(err) // ensure error logged by Gin's middleware
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"error": "failed to render response",
		})
	}
}
