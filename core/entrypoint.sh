#!/bin/sh
set -e
mkdir -p /app/media
chown -R app:app /app/media
exec runuser -u app -- "$@"
