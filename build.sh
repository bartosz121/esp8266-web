#!/bin/sh

TAG=$(git describe --tags --abbrev=0 --match "v[0-9]*" 2>/dev/null)

HASH=$(git rev-parse --short HEAD)

if [ -n "$(git status --porcelain)" ]; then
    IS_DIRTY=1
else
    IS_DIRTY=0
fi

if [ -z "$TAG" ]; then
    # No tag found; just use hash
    VERSION="$HASH"
else
    # Tag found: check if we are exactly on it
    TAG_COMMIT=$(git rev-list -n 1 "$TAG")
    HEAD_COMMIT=$(git rev-parse HEAD)

    if [ "$TAG_COMMIT" = "$HEAD_COMMIT" ] && [ "$IS_DIRTY" -eq 0 ]; then
        VERSION="$TAG"
    else
        VERSION="$TAG+$HASH"
    fi
fi

echo "Building version: $VERSION"

go build -ldflags "-w -s -X main.AppVersion=$VERSION" -o esp8266-web