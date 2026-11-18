#!/bin/sh
set -e
# Apply pending migrations (idempotent), then start the server.
./node_modules/.bin/prisma migrate deploy
exec node dist/server.js
