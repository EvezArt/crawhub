# ClawHub

<p align="center">
  <a href="https://github.com/openclaw/clawhub/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/openclaw/clawhub/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="https://discord.gg/clawd"><img src="https://img.shields.io/discord/1456350064065904867?label=Discord&logo=discord&logoColor=white&color=5865F2&style=for-the-badge" alt="Discord"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

ClawHub is the **public skill registry for Clawdbot**: publish, version, and search text-based agent skills (a `SKILL.md` plus supporting files).
It’s designed for fast browsing + a CLI-friendly API, with moderation hooks and vector search.

onlycrabs.ai is the **SOUL.md registry**: publish and share system lore the same way you publish skills.

Live: `https://clawhub.ai`
onlycrabs.ai: `https://onlycrabs.ai`

## 🚀 Quick Demo

Get ClawHub running locally in minutes:

### Prerequisites

- **Bun** 1.3.6+ ([install](https://bun.sh))
- **Convex CLI** (included via bunx)
- **Node.js** 18+ (for some tooling)

### Quick Start

```bash
# Clone and install
git clone https://github.com/EvezArt/clawhub.git
cd clawhub
bun install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local - at minimum, you need:
# - VITE_CONVEX_URL (from `bunx convex dev`)
# - VITE_CONVEX_SITE_URL (same as above)
# - CONVEX_SITE_URL (same as above)

# Terminal 1: Start Convex backend
bunx convex dev

# Terminal 2: Seed demo data (optional but recommended)
bun run seed

# Terminal 3: Start web app
bun run demo
```

The app will be available at `http://localhost:3000` with demo skills loaded!

## 🧪 Running Tests

```bash
# Run all unit tests
bun run test

# Run with coverage (requires 80% global coverage)
bun run coverage

# Run tests in watch mode
bun run test:watch

# Run end-to-end tests
bun run test:e2e:local

# Linting
bun run lint
```

## What you can do

- Browse skills + render their `SKILL.md`.
- Publish new skill versions with changelogs + tags (including `latest`).
- Browse souls + render their `SOUL.md`.
- Publish new soul versions with changelogs + tags.
- Search via embeddings (vector index) instead of brittle keywords.
- Star + comment; admins/mods can curate and approve skills.

## onlycrabs.ai (SOUL.md registry)

- Entry point is host-based: `onlycrabs.ai`.
- On the onlycrabs.ai host, the home page and nav default to souls.
- On ClawHub, souls live under `/souls`.
- Soul bundles only accept `SOUL.md` for now (no extra files).

## How it works (high level)

- Web app: TanStack Start (React, Vite/Nitro).
- Backend: Convex (DB + file storage + HTTP actions) + Convex Auth (GitHub OAuth).
- Search: OpenAI embeddings (`text-embedding-3-small`) + Convex vector search.
- API schema + routes: `packages/schema` (`clawhub-schema`).


## Telemetry

ClawHub tracks minimal **install telemetry** (to compute install counts) when you run `clawhub sync` while logged in.
Disable via:

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

Details: `docs/telemetry.md`.

## Repo layout

- `src/` — TanStack Start app (routes, components, styles).
- `convex/` — schema + queries/mutations/actions + HTTP API routes.
- `packages/schema/` — shared API types/routes for the CLI and app.
- `docs/spec.md` — product + implementation spec (good first read).

## Local dev

Prereqs: Bun + Convex CLI.

```bash
bun install
cp .env.local.example .env.local

# terminal A: web app
bun run dev

# terminal B: Convex dev deployment
bunx convex dev
```

## Auth (GitHub OAuth) setup

Create a GitHub OAuth App, set `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`, then:

```bash
bunx auth --deployment-name <deployment> --web-server-url http://localhost:3000
```

This writes `JWT_PRIVATE_KEY` + `JWKS` to the deployment and prints values for your local `.env.local`.

## Environment

- `VITE_CONVEX_URL`: Convex deployment URL (`https://<deployment>.convex.cloud`).
- `VITE_CONVEX_SITE_URL`: Convex site URL (`https://<deployment>.convex.site`).
- `VITE_SOULHUB_SITE_URL`: onlycrabs.ai site URL (`https://onlycrabs.ai`).
- `VITE_SOULHUB_HOST`: onlycrabs.ai host match (`onlycrabs.ai`).
- `VITE_SITE_MODE`: Optional override (`skills` or `souls`) for SSR builds.
- `CONVEX_SITE_URL`: same as `VITE_CONVEX_SITE_URL` (auth + cookies).
- `SITE_URL`: App URL (local: `http://localhost:3000`).
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`: GitHub OAuth App.
- `JWT_PRIVATE_KEY` / `JWKS`: Convex Auth keys.
- `OPENAI_API_KEY`: embeddings for search + indexing.

## 🐛 Troubleshooting

### Common Issues

**"401 MissingAccessToken" when seeding**
- Make sure `bunx convex dev` is running in a separate terminal
- Try using `--deployment-name <name>` instead of `--env-file`
- Or run `bunx convex deploy -y` first (for prod)

**Port 3000 already in use**
- Stop other services using port 3000, or
- Edit `package.json` to change the `dev` script port: `--port 3001`

**Environment variables not found**
- Ensure `.env.local` exists and is in the project root
- Check that `VITE_CONVEX_URL` is set correctly
- Restart your dev server after changing env vars

**Tests failing**
- Run `bun install` to ensure dependencies are up to date
- Check that you're using Bun 1.3.6+: `bun --version`
- Clear test cache: `rm -rf .vitest`

**Build errors**
- Clear build cache: `rm -rf .output .nitro dist .tanstack`
- Try a clean install: `rm -rf node_modules && bun install`

**For more detailed troubleshooting**, see `docs/troubleshooting.md`.

## 📚 Documentation

- `docs/spec.md` — Product and implementation specification
- `docs/quickstart.md` — Detailed setup guide
- `docs/manual-testing.md` — Manual testing checklist
- `docs/cli.md` — CLI documentation
- `docs/api.md` — HTTP API documentation
- `docs/auth.md` — Authentication setup
- `docs/troubleshooting.md` — Detailed troubleshooting guide

## 🏗️ CI/CD

This repository uses GitHub Actions for continuous integration:

- **Workflow**: `.github/workflows/ci.yml`
- **Runs on**: Every push to `main` and all pull requests
- **Steps**:
  1. Install dependencies (`bun install --frozen-lockfile`)
  2. Check peer dependencies
  3. Run linters (Biome + oxlint)
  4. Run test suite (Vitest)
  5. Check coverage (80% minimum)
  6. Type-check packages
  7. Build the application

To run the same checks locally:
```bash
bun run lint    # Linting
bun run test    # Tests
bun run coverage # Coverage
bun run build   # Build
```

## Nix plugins (nixmode skills)

ClawHub can store a nix-clawdbot plugin pointer in SKILL frontmatter so the registry knows which
Nix package bundle to install. A nix plugin is different from a regular skill pack: it bundles the
skill pack, the CLI binary, and its config flags/requirements together.

Add this to `SKILL.md`:

```yaml
---
name: peekaboo
description: Capture and automate macOS UI with the Peekaboo CLI.
metadata: {"clawdbot":{"nix":{"plugin":"github:clawdbot/nix-steipete-tools?dir=tools/peekaboo","systems":["aarch64-darwin"]}}}
---
```

Install via nix-clawdbot:

```nix
programs.clawdbot.plugins = [
  { source = "github:clawdbot/nix-steipete-tools?dir=tools/peekaboo"; }
];
```

You can also declare config requirements + an example snippet:

```yaml
---
name: padel
description: Check padel court availability and manage bookings via Playtomic.
metadata: {"clawdbot":{"config":{"requiredEnv":["PADEL_AUTH_FILE"],"stateDirs":[".config/padel"],"example":"config = { env = { PADEL_AUTH_FILE = \\\"/run/agenix/padel-auth\\\"; }; };"}}}
---
```

To show CLI help (recommended for nix plugins), include the `cli --help` output:

```yaml
---
name: padel
description: Check padel court availability and manage bookings via Playtomic.
metadata: {"clawdbot":{"cliHelp":"padel --help\\nUsage: padel [command]\\n"}}
---
```

`metadata.clawdbot` is preferred, but `metadata.clawdis` is accepted as an alias for compatibility.

## Available Scripts

### Development
```bash
bun run dev        # Start development server (port 3000)
bun run demo       # Run demo setup script (checks deps, starts dev server)
bun run build      # Build for production
bun run preview    # Preview production build
```

### Testing
```bash
bun run test          # Run all unit tests
bun run test:watch    # Run tests in watch mode
bun run test:e2e      # Run end-to-end tests
bun run test:e2e:local # Run Playwright tests locally
bun run test:pw       # Run Playwright tests
bun run coverage      # Run tests with coverage report (80% min)
```

### Quality Assurance
```bash
bun run lint          # Run all linters (Biome + oxlint)
bun run lint:biome    # Run Biome linter
bun run lint:oxlint   # Run oxlint (type-aware)
bun run format        # Auto-format code with Biome
```

### Data & Seeding
```bash
bun run seed          # Seed demo data (skills + souls)
```

### Utilities
```bash
bun run docs:list     # List documentation files
bun run check:peers   # Check peer dependencies
```

### Deployment
```bash
bun run convex:deploy # Deploy Convex functions (with -y flag)
```
