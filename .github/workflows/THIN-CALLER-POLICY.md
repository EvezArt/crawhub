# Thin-Caller CI Policy

## Overview

The thin-caller policy ensures that GitHub Actions workflows delegate to reusable workflows instead of containing local 'run:' steps. This approach:

1. **Prevents drift** - Changes to CI logic are made once in reusable workflows
2. **Enforces consistency** - All repositories follow the same CI patterns
3. **Enables governance** - Central control plane can audit and update CI across repositories
4. **Improves security** - Reduces attack surface by minimizing inline scripts

## Policy Rules

### Allowed Workflows

The following workflows are **exempt** from thin-caller enforcement:

- `ci.yml` - Main CI workflow (calls reusable workflows)
- `reusable-policy.yml` - Reusable policy enforcement workflow
- `policy.yml` - Policy enforcement workflow
- `autopilot-auditor.yml` - Autonomous drift detection and repair

### Required Structure

All non-exempt workflows must:

1. Use `uses:` to call reusable workflows instead of `run:` steps
2. Avoid inline scripts in workflow files
3. Delegate all logic to reusable workflows or committed scripts

### Exceptions

If a workflow requires inline `run:` steps for valid reasons:

1. Document the reason in the workflow file
2. Add the workflow to the allowlist in `policy.yml`
3. Minimize the scope of inline scripts

## Enforcement

The `policy.yml` workflow runs on every push and pull request to validate compliance. It will:

1. Scan all workflow files in `.github/workflows/`
2. Check for inline `run:` steps in non-exempt workflows
3. Fail the check if violations are found
4. Provide clear error messages with remediation steps

## Examples

### ❌ Bad - Inline run steps

```yaml
name: Build
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npm test
```

### ✅ Good - Delegates to reusable workflow

```yaml
name: Build
on: push
jobs:
  build:
    uses: EvezArt/crawhub/.github/workflows/reusable-ci.yml@main
    with:
      node-version: '20'
```

## Rollout Strategy

1. Create reusable workflows for common CI patterns
2. Enable policy enforcement in control plane (EvezArt/crawhub)
3. Roll out to other repositories via autopilot auditor
4. Monitor compliance via governance dashboard
