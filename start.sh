#!/bin/sh
set -e

# Run database migrations
npx prisma migrate deploy

# Start the Next.js server
node server.js
