FROM node:20-alpine AS ui-builder

RUN apk --no-cache add git

WORKDIR /app/ui

COPY ui/package.json ui/package-lock.json ./
RUN npm ci

COPY .git /app/.git

COPY ui .
RUN npm run build

FROM golang:1.25-alpine AS builder

RUN apk --no-cache add git

WORKDIR /app

COPY go.mod go.sum build.sh ./
RUN go mod download

COPY . .
COPY --from=ui-builder /app/static ./static

RUN /app/build.sh

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app/

COPY --from=builder /app/esp8266-web .

EXPOSE 8080

CMD ["/app/esp8266-web"]
