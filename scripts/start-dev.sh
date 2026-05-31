#!/usr/bin/env bash
# Start FlowHawk development stack (backend + frontend)

set -e

echo "🦅 FlowHawk Dev Stack"
echo "====================="
echo ""

# Check if backend port is free
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 8000 is already in use. Kill existing uvicorn first:"
    echo "   pkill -f uvicorn"
    exit 1
fi

# Start backend
echo "▶️  Starting FastAPI backend on http://127.0.0.1:8000"
cd "$(dirname "$0")/.."
uv run uvicorn api.main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
echo ""

# Wait for backend to be ready
echo "⏳ Waiting for backend health check..."
for i in {1..30}; do
    if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
        echo "✅ Backend ready"
        break
    fi
    sleep 0.5
done
echo ""

# Start frontend
echo "▶️  Starting Next.js frontend on http://localhost:3000"
cd frontend
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
echo ""

# Trap Ctrl+C to kill both
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $FRONTEND_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    wait
    echo "👋 Done"
    exit 0
}
trap cleanup INT TERM

echo "====================="
echo "🟢 Both services running"
echo "   Backend:  http://127.0.0.1:8000/docs"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both"
echo "====================="
wait
