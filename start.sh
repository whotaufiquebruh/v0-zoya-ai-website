#!/bin/bash
set -e

echo "Starting Zoya AI..."

# Wait for the API server (started by the artifact workflow) to be ready on port 8080
echo "Waiting for API server on port 8080..."
for i in $(seq 1 60); do
  if curl -s http://127.0.0.1:8080/api/healthz > /dev/null 2>&1; then
    echo "API server ready on port 8080"
    break
  fi
  if [ "$i" = "60" ]; then
    echo "API server did not start in time, starting it now..."
    PORT=8080 pnpm --filter @workspace/api-server run dev &
    sleep 5
  fi
  sleep 1
done

# Start Vite frontend on port 5000
PORT=5000 BASE_PATH="" pnpm --filter @workspace/zoya-ai run dev
