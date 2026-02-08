#!/usr/bin/env bash
# Demo script for ClawHub - runs the application in demo mode
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

echo "================================================"
echo "  ClawHub Demo Setup"
echo "================================================"
echo ""

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Error: Bun is not installed."
    echo "   Install it from: https://bun.sh"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    bun install --frozen-lockfile
else
    echo "✅ Dependencies already installed"
fi

# Check for .env.local file
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found."
    echo "   Creating from .env.local.example..."
    cp .env.local.example .env.local
    echo ""
    echo "📝 Please edit .env.local with your configuration:"
    echo "   - VITE_CONVEX_URL (required)"
    echo "   - VITE_CONVEX_SITE_URL (required)"
    echo "   - AUTH_GITHUB_ID and AUTH_GITHUB_SECRET (for login)"
    echo "   - OPENAI_API_KEY (for search/embeddings)"
    echo ""
    echo "   For a minimal demo without auth/search, you can set:"
    echo "   - VITE_CONVEX_URL to your Convex deployment URL"
    echo "   - VITE_CONVEX_SITE_URL to the same Convex deployment URL"
    echo ""
    read -p "Press Enter to continue after editing .env.local..."
fi

echo ""
echo "================================================"
echo "  Starting ClawHub Demo"
echo "================================================"
echo ""
echo "The app will be available at: http://localhost:3000"
echo ""
echo "📌 Note: You also need to run Convex in a separate terminal:"
echo "   bunx convex dev"
echo ""
echo "   Or if you want to seed demo data first:"
echo "   bun run seed"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
bun run dev
