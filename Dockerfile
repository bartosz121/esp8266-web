FROM node:20-alpine AS ui-builder

WORKDIR /app/ui

COPY ui/package.json ui/package-lock.json ./
RUN npm ci

COPY ui .
RUN npm run build

FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=ui-builder /app/static ./static

RUN go build -o esp8266-web .

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app/

COPY --from=builder /app/esp8266-web .

EXPOSE 8080

CMD ["/app/esp8266-web"]
