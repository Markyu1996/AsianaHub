#!/bin/sh
# docker-entrypoint.sh
# Runs DB migrations and seed before starting the app

set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "🌱 Running database seed..."
tsx prisma/seed.ts

echo "🚀 Starting application..."
exec node server.js
