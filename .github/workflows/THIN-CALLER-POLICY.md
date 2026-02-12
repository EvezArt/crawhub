# Thin-Caller CI Policy

## Overview

This repository enforces a **thin-caller CI policy** to maintain governance, prevent workflow drift, and ensure epistemic continuity across the repository lifecycle.

## What is Thin-Caller?

A "thin-caller" workflow is a GitHub Actions workflow that:

1. **Delegates** logic to reusable workflows instead of implementing it locally
2. **Avoids** bespoke `run:` commands that duplicate or diverge from central policies
3. **Enforces** centralized control plane governance

### ✅ Allowed (Thin-Caller Compliant)

```yaml
name: CI

on: [push, pull_request]

permissions:
  contents: read

jobs:
  lint:
    uses: ./.github/workflows/reusable-lint.yml
  
  test:
    uses: ./.github/workflows/reusable-test.yml
```

### ❌ Prohibited (Bespoke Workflow)

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install   # ❌ Bespoke run: command
      - run: npm test      # ❌ Bespoke run: command
```

## Allowlisted Workflows

The following workflow files are **allowlisted** and may contain `run:` commands:

- `ci.yml` - Main CI orchestration
- `policy.yml` - Policy enforcement
- `reusable-policy.yml` - Reusable policy workflow
- `autopilot-audit.yml` - Drift detection and correction
- `daily-repo-report.yml` - Repository reporting
- `secret-detection.yml` - Secret scanning

All other workflows must be thin-callers.

## Policy Enforcement

The policy is enforced via `.github/workflows/policy.yml`, which:

1. Scans all workflow files on PR and push to main
2. Identifies workflows with `run:` commands not in the allowlist
3. **Fails the check** if violations are found
4. Provides clear error messages with remediation steps

## Why This Matters

### 1. **Prevents Drift**
- Centralizes CI logic in reusable workflows
- Avoids "workflow sprawl" where each repo/team invents their own approach
- Makes updates atomic: change reusable workflow once, all callers benefit

### 2. **Ensures Epistemic Continuity**
- Policy checks are immutable and auditable
- Merkle roots bind workflow states to verifiable transformations
- Drift is detected and corrected automatically

### 3. **Enforces Governance**
- CODEOWNERS locks governance files
- Autopilot auditor ensures compliance across all workload repos
- Self-correcting system via automated PRs

## Remediation

If your PR fails the thin-caller policy check:

1. **Move logic to reusable workflows**: Extract `run:` commands to `.github/workflows/reusable-*.yml`
2. **Update workflow to use reusable**: Replace `steps:` with `uses: ./.github/workflows/reusable-*.yml`
3. **Or add to allowlist**: If the workflow genuinely needs local commands (rare), request approval to add it to the allowlist

## Architecture

```
Control Plane Repo (EvezArt/crawhub)
├── .github/workflows/
│   ├── reusable-policy.yml       # Core policy enforcement logic
│   ├── policy.yml                # Thin-caller for policy.yml
│   ├── autopilot-audit.yml       # Cross-repo drift detection
│   └── reusable-*.yml            # Shared CI logic
│
└── Workload Repos
    └── .github/workflows/
        └── ci.yml                # Thin-caller that uses reusables
```

## Learn More

- [GitHub Actions: Reusing workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
- [Workflow security best practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
