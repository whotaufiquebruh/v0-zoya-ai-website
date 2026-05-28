#!/bin/bash
set -e

echo "Starting Zoya AI..."

# Start API server on port 8080 in background
PORT=8080 NODE_ENV=development pnpm --filter @workspace/api-server run dev &
API_PID=$!

# Wait for API to be ready
echo "Waiting for API server..."
for i in $(seq 1 30); do
  if curl -s http://127.0.0.1:8080/api/healthz > /dev/null 2>&1; then
    echo "API server ready on port 8080"
    break
  fi
  sleep 1
done

# Start Vite frontend on port 5000
PORT=5000 BASE_PATH="" NODE_ENV=development pnpm --filter @workspace/zoya-ai run dev

# If vite exits, kill API too
kill $API_PID 2>/dev/null || true
