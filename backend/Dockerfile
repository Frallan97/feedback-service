# Development stage (used by docker-compose)
FROM golang:1.24-alpine AS development

WORKDIR /app

# Install Air for hot reloading (use v1.52.3 which is compatible with Go 1.24)
RUN go install github.com/air-verse/air@v1.52.3

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Expose port
EXPOSE 8082

CMD ["air", "-c", ".air.toml"]

# Production stage (for K8s deployment)
FROM golang:1.24-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/config ./config
EXPOSE 8082
CMD ["./main"]
