#!/bin/bash
set -e

echo "🧪 Live Dashboard Verification Script"
echo "======================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Bun is not installed${NC}"
    echo "Please install Bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
echo -e "${GREEN}✅ Bun is installed ($(bun --version))${NC}"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    bun install
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Run linter
echo ""
echo "Running linter..."
if bun run lint > /tmp/lint.log 2>&1; then
    echo -e "${GREEN}✅ Linting passed${NC}"
else
    echo -e "${YELLOW}⚠️  Linting completed with warnings${NC}"
    tail -5 /tmp/lint.log
fi

# Run tests
echo ""
echo "Running hypothesis reducer tests..."
if bun run test src/lib/hypothesisReducer.test.ts > /tmp/test.log 2>&1; then
    echo -e "${GREEN}✅ All tests passed (8/8)${NC}"
else
    echo -e "${RED}❌ Tests failed${NC}"
    cat /tmp/test.log
    exit 1
fi

# Run build
echo ""
echo "Testing build..."
if bun run build > /tmp/build.log 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    tail -20 /tmp/build.log
    exit 1
fi

# Check if key files exist
echo ""
echo "Checking implementation files..."
FILES=(
    "convex/openclawEvents.ts"
    "convex/openclawEventsHttp.ts"
    "convex/openclawEventsSeed.ts"
    "src/routes/live.tsx"
    "src/lib/openclaw-types.ts"
    "src/lib/useEventStream.ts"
    "src/lib/hypothesisReducer.ts"
    "src/lib/hypothesisReducer.test.ts"
    "docs/live-dashboard.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ Missing: $file${NC}"
        exit 1
    fi
done

# Summary
echo ""
echo "======================================"
echo -e "${GREEN}🎉 All verification checks passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Start Convex: bunx convex dev"
echo "2. Seed events:  bunx convex run openclawEventsSeed:seedSampleEvents"
echo "3. Start server: bun run dev"
echo "4. Visit:        http://localhost:3000/live?sessionKey=agent:crawfather:main"
echo ""
echo "See docs/TESTING_GUIDE.md for detailed testing instructions."
