# syntax=docker/dockerfile:1.7

# ---------- builder ----------
FROM golang:1.25-alpine AS builder

WORKDIR /src

# Cache modules separately from sources for better layer reuse.
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Static binary for distroless/scratch.
ENV CGO_ENABLED=0 GOOS=linux GOFLAGS=-trimpath
RUN go build -ldflags="-s -w" -o /out/api ./...

# ---------- runtime ----------
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app
COPY --from=builder /out/api /app/api

USER nonroot:nonroot
EXPOSE 8080

ENTRYPOINT ["/app/api"]
