# ClawHub Demo Guide

This guide walks you through running ClawHub locally for demonstration and evaluation purposes.

## Prerequisites

Before you begin, ensure you have:

- **Bun** 1.3.6 or higher ([install](https://bun.sh))
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```
- **Git** for cloning the repository
- **Node.js** 18+ (optional, for some tooling compatibility)

## Quick Start (5 minutes)

### 1. Clone and Install

```bash
git clone https://github.com/EvezArt/clawhub.git
cd clawhub
bun install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

For a minimal demo, you need a Convex deployment. Open two terminals:

**Terminal 1 - Start Convex:**
```bash
bunx convex dev
```

Wait for Convex to start and note the deployment URL it prints. Then edit `.env.local`:

```bash
# .env.local (minimal configuration)
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-deployment.convex.site
CONVEX_SITE_URL=https://your-deployment.convex.site
SITE_URL=http://localhost:3000
```

### 3. Seed Demo Data (Optional but Recommended)

**Terminal 2 - Seed data:**
```bash
bun run seed
```

This loads sample skills (padel, gohome, xuezh) into your local database.

### 4. Start the Application

**Terminal 2 (or Terminal 3 if seed is still running):**
```bash
bun run demo
```

The application will be available at: **http://localhost:3000**

## What You Can Demo

Once running, you can:

1. **Browse Skills** - Visit http://localhost:3000 to see the skill registry
2. **View Skill Details** - Click on any skill to see its SKILL.md content:
   - http://localhost:3000/skills/padel
   - http://localhost:3000/skills/gohome
   - http://localhost:3000/skills/xuezh
3. **Search** - Try the search functionality (requires `OPENAI_API_KEY`)
4. **CLI Operations** - Test the CLI:
   ```bash
   bun clawhub --help
   bun clawhub search padel
   ```

## Full Setup (with Authentication)

For a complete demo with login/auth features:

### 1. Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: ClawHub Local Dev
   - **Homepage URL**: http://localhost:3000
   - **Authorization callback URL**: http://localhost:3000/api/auth/callback/github
4. Save the Client ID and generate a Client Secret

### 2. Generate Auth Keys

```bash
bunx auth --deployment-name <your-deployment> --web-server-url http://localhost:3000
```

This will print `JWT_PRIVATE_KEY` and `JWKS` values.

### 3. Update .env.local

Add the OAuth credentials and auth keys:

```bash
# .env.local (full configuration)
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-deployment.convex.site
CONVEX_SITE_URL=https://your-deployment.convex.site
SITE_URL=http://localhost:3000

# GitHub OAuth
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret

# Auth Keys (from bunx auth command)
JWT_PRIVATE_KEY=your_jwt_private_key
JWKS=your_jwks

# Optional: For vector search
OPENAI_API_KEY=your_openai_api_key
```

### 4. Restart the App

Stop and restart the development server to pick up the new environment variables.

Now you can:
- **Login with GitHub** - Click the login button
- **Publish Skills** - Create and publish your own skills
- **Star & Comment** - Interact with skills
- **Admin Features** - If you make yourself an admin in the database

## Running Tests

ClawHub has comprehensive test coverage (80%+ required):

### Unit Tests

```bash
# Run all tests
bun run test

# Run in watch mode (auto-rerun on changes)
bun run test:watch

# Run with coverage report
bun run coverage
```

Expected output: All 336+ tests should pass.

### End-to-End Tests

```bash
# Run E2E tests (requires app to be running)
bun run test:e2e:local

# Or run Playwright tests
bun run test:pw
```

### Linting

```bash
# Run all linters
bun run lint

# Auto-fix formatting issues
bun run format
```

## CLI Demo

The ClawHub CLI allows publishing and managing skills from the command line:

### Setup

```bash
# Login (requires app running with auth configured)
bun clawhub login

# Verify login
bun clawhub whoami
```

### Search Skills

```bash
bun clawhub search padel --limit 5
```

### Install a Skill

```bash
mkdir -p /tmp/clawhub-demo
cd /tmp/clawhub-demo
bun clawhub install padel
```

### Publish a New Skill

```bash
# Create a skill directory
mkdir -p /tmp/my-skill && cd /tmp/my-skill

# Create SKILL.md
cat > SKILL.md <<'EOF'
---
name: My Demo Skill
description: A demonstration skill for ClawHub
---

# My Demo Skill

This is a test skill for demo purposes.

## Usage

Run the demo command.
EOF

# Publish
bun clawhub publish . \
  --slug my-demo-skill-$(date +%s) \
  --name "My Demo Skill" \
  --version 1.0.0 \
  --tags latest \
  --changelog "Initial release"
```

## Troubleshooting

### "bunx convex dev" fails

**Issue**: Cannot connect to Convex or authentication errors.

**Solution**:
- Make sure you have an internet connection
- Try `bunx convex login` first
- Create a new Convex project if needed: https://www.convex.dev/

### Port 3000 already in use

**Issue**: Another process is using port 3000.

**Solution**:
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill

# Or change the port in package.json "dev" script
# Change --port 3000 to --port 3001
```

### "401 MissingAccessToken" during seeding

**Issue**: Cannot authenticate with Convex deployment.

**Solution**:
```bash
# Option 1: Deploy functions first
bunx convex dev --once

# Option 2: Use deployment name instead of env file
bun run seed -- --deployment-name your-deployment-name

# Option 3: For prod deployments
bunx convex deploy -y
bun run seed -- --prod
```

### Environment variables not loading

**Issue**: App starts but shows errors about missing config.

**Solution**:
- Ensure `.env.local` is in the project root (not in subdirectories)
- Check that variable names start with `VITE_` for frontend-accessible vars
- Restart the dev server after changing `.env.local`

### Tests fail with "Cannot find module"

**Issue**: Import errors during test runs.

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules bun.lockb
bun install

# Clear test cache
rm -rf .vitest
```

## Next Steps

After running the demo:

1. **Explore the codebase**:
   - `src/` - Frontend React/TanStack Start code
   - `convex/` - Backend Convex functions
   - `packages/` - Shared packages (schema, CLI)
   - `docs/` - Detailed documentation

2. **Read the specs**:
   - `docs/spec.md` - Product specification
   - `docs/architecture.md` - Architecture overview
   - `docs/api.md` - HTTP API documentation

3. **Try developing**:
   - Make a change to `src/routes/index.tsx`
   - See it hot-reload in the browser
   - Add a test in `src/__tests__/`

4. **Contribute**:
   - Check the CI workflow: `.github/workflows/ci.yml`
   - Follow the coding guidelines in `AGENTS.md`
   - Submit a pull request!

## Resources

- **Live Site**: https://clawhub.ai
- **Documentation**: `docs/` directory
- **Discord**: https://discord.gg/clawd
- **GitHub**: https://github.com/EvezArt/clawhub
- **Convex Docs**: https://docs.convex.dev
