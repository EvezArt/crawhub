#!/usr/bin/env bash
# Seed demo data into ClawHub using Convex functions
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

echo "================================================"
echo "  ClawHub Demo Data Seeding"
echo "================================================"
echo ""

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Error: Bun is not installed."
    echo "   Install it from: https://bun.sh"
    exit 1
fi

# Check for .env.local file
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local not found."
    echo "   Please run 'bun run demo' first to create the configuration."
    exit 1
fi

# Check if VITE_CONVEX_URL is set
if [ -f ".env.local" ]; then
    VITE_CONVEX_URL=$(grep '^VITE_CONVEX_URL=' .env.local | cut -d '=' -f2)
fi

if [ -z "$VITE_CONVEX_URL" ]; then
    echo "❌ Error: VITE_CONVEX_URL is not set in .env.local"
    echo "   You need a Convex deployment URL to seed data."
    echo "   Run 'bunx convex dev' in a separate terminal first."
    exit 1
fi

echo "📝 This will seed demo data into your Convex deployment:"
echo "   - Demo skills (padel, gohome, xuezh)"
echo "   - Demo souls (if using onlycrabs.ai mode)"
echo ""
echo "⚠️  Note: Make sure 'bunx convex dev' is running in another terminal"
echo ""

# Parse command line arguments
DEPLOYMENT_NAME=""
USE_PROD=""
SKIP_CONFIRM=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --deployment-name)
            DEPLOYMENT_NAME="$2"
            shift 2
            ;;
        --prod)
            USE_PROD="--prod"
            shift
            ;;
        -y|--yes)
            SKIP_CONFIRM="yes"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--deployment-name <name>] [--prod] [-y|--yes]"
            exit 1
            ;;
    esac
done

# Confirm before seeding
if [ -z "$SKIP_CONFIRM" ]; then
    read -p "Continue with seeding? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Seeding cancelled."
        exit 0
    fi
fi

echo ""
echo "🌱 Seeding demo skills..."

# Build the convex run command
CONVEX_CMD="bunx convex run"
if [ -n "$DEPLOYMENT_NAME" ]; then
    CONVEX_CMD="$CONVEX_CMD --deployment-name $DEPLOYMENT_NAME"
fi
if [ -n "$USE_PROD" ]; then
    CONVEX_CMD="$CONVEX_CMD $USE_PROD"
fi

# Seed skills using the internal action
$CONVEX_CMD devSeed:seedNixSkills '{"reset": false}' 2>&1 || {
    echo ""
    echo "⚠️  Note: If you got a 401 MissingAccessToken error, try one of:"
    echo "   1. Remove --env-file flag and use --deployment-name <name> instead"
    echo "   2. Or run: bunx convex deploy -y (for prod)"
    echo "   3. Or run: bunx convex dev --once (for dev)"
    exit 1
}

echo ""
echo "🌱 Seeding demo souls..."
$CONVEX_CMD seed:ensureSoulSeeds 2>&1 || {
    echo "⚠️  Note: Souls seeding may fail if already seeded (this is expected)"
}

echo ""
echo "================================================"
echo "  ✅ Demo data seeding complete!"
echo "================================================"
echo ""
echo "You can now access the demo at: http://localhost:3000"
echo "Browse seeded skills:"
echo "  - http://localhost:3000/skills/padel"
echo "  - http://localhost:3000/skills/gohome"
echo "  - http://localhost:3000/skills/xuezh"
echo ""
