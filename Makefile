BINARY := memothon

.PHONY: run build test tidy fmt templ

run:
go run ./...

build:
@mkdir -p bin
go build -o bin/$(BINARY) ./...

fmt:
gofmt -w $(shell go list -f '{{.Dir}}' ./...)

test:
go test ./...

tidy:
go mod tidy

templ:
go run github.com/a-h/templ/cmd/templ@v0.3.960 generate
