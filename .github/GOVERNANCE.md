# Autonomous Governance System

## Overview

This repository implements an **autonomous governance layer** for GitHub repositories, creating a self-enforcing, self-correcting "nervous system" that prevents workflow drift and ensures epistemic continuity across repository lifecycles.

## Core Concepts

### 1. **Thin-Caller CI Policy**

Workflows must delegate logic to reusable workflows instead of implementing it locally. This:
- Centralizes CI logic in a control plane repository
- Prevents "workflow sprawl" where teams create bespoke implementations
- Makes updates atomic: change once, apply everywhere

### 2. **Epistemic Continuity**

Every repository state is bound to a **Merkle root** - a cryptographic hash tree root that:
- Provides immutable verification of workflow states
- Enables deterministic drift detection
- Creates an audit trail of all transformations
- Prevents "epistemic decay" where the true state becomes unknown

### 3. **Autonomous Correction**

The system self-heals via:
- **Daily drift detection**: Scans for policy violations
- **Automated PRs**: Creates correction PRs when drift is detected
- **Issue tracking**: Opens issues for manual review when needed
- **Self-enforcement**: No human intervention required for compliance

### 4. **Control Plane Architecture**

```
┌─────────────────────────────────────────────────────────┐
│  Control Plane (EvezArt/crawhub)                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Reusable Workflows                               │  │
│  │  - reusable-policy.yml (policy enforcement)       │  │
│  │  - reusable-*.yml (shared CI logic)               │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Autopilot Auditor                                │  │
│  │  - Daily drift detection                          │  │
│  │  - Merkle root computation                        │  │
│  │  - Automated correction PRs                       │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Governance Scripts                               │  │
│  │  - detect_drift.py                                │  │
│  │  - rollout.sh                                     │  │
│  │  - enforce_branch_protection.sh                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────┐
        │  Workload Repositories          │
        │  ┌───────────────────────────┐  │
        │  │  Thin-Caller Workflows    │  │
        │  │  - ci.yml → uses: ...     │  │
        │  │  - policy.yml → uses: ... │  │
        │  └───────────────────────────┘  │
        └─────────────────────────────────┘
```

## Components

### Workflows

#### `policy.yml`
- **Purpose**: Enforce governance policies on workflow changes
- **Triggers**: Pull requests and pushes to main affecting `.github/workflows/**`
- **Action**: Delegates to `reusable-policy.yml` for enforcement

#### `reusable-policy.yml`
- **Purpose**: Core policy enforcement logic
- **Type**: Reusable workflow (can be called from any repository)
- **Checks**:
  - Thin-caller compliance (no bespoke `run:` commands)
  - Explicit permissions blocks
  - Allowlist validation

#### `autopilot-audit.yml`
- **Purpose**: Autonomous drift detection and correction
- **Schedule**: Daily at 00:00 UTC
- **Actions**:
  1. Scan workflows for drift
  2. Compute Merkle root for current state
  3. Create issue if drift detected
  4. Optionally create correction PR

### Scripts

#### `detect_drift.py`
- **Language**: Python 3.11+
- **Purpose**: Drift detection with Merkle root computation
- **Output**: JSON report with violations and cryptographic verification
- **Features**:
  - Scans all workflow files
  - Detects thin-caller violations
  - Identifies missing required files
  - Computes Merkle root for state binding

#### `rollout.sh`
- **Purpose**: Deploy governance to workload repositories
- **Usage**: `./rollout.sh --repo owner/repo [--dry-run]`
- **Actions**:
  1. Clone target repository
  2. Create governance branch
  3. Copy policy files
  4. Create PR with governance deployment

#### `enforce_branch_protection.sh`
- **Purpose**: Apply branch protection rules
- **Usage**: `./enforce_branch_protection.sh --repo owner/repo [--dry-run]`
- **Rules**:
  - Require PR reviews (1 approval)
  - Require status checks (policy enforcement)
  - Require conversation resolution
  - Enforce for administrators

### Configuration

#### `repo-manifest.yml`
- **Purpose**: Define workload repositories under governance
- **Contents**:
  - List of governed repositories
  - Per-repo policy configuration
  - Allowlist overrides
  - Global policy settings

#### `CODEOWNERS`
- **Purpose**: Lock governance files to prevent unauthorized changes
- **Protected paths**:
  - All workflow files in governance system
  - All scripts
  - Manifest and CODEOWNERS itself

## Usage

### For Control Plane Administrators

#### 1. Deploy Governance to New Repository

```bash
cd .github/scripts
./rollout.sh --repo owner/repo
```

This will:
- Clone the target repository
- Create a branch with governance files
- Open a PR for review

#### 2. Enforce Branch Protection

```bash
./enforce_branch_protection.sh --repo owner/repo
```

This will:
- Apply branch protection rules to `main`
- Require policy checks to pass
- Require PR reviews and conversation resolution

#### 3. Trigger Manual Drift Detection

```bash
# Via GitHub CLI
gh workflow run autopilot-audit.yml --repo EvezArt/crawhub

# With auto-correction enabled
gh workflow run autopilot-audit.yml --repo EvezArt/crawhub -f create_pr=true
```

#### 4. Add Repository to Manifest

Edit `.github/repo-manifest.yml`:

```yaml
workloadRepositories:
  - repository: owner/repo
    enforceThinCaller: true
    requiredWorkflows:
      - policy.yml
    allowlist:
      - ci.yml
      - policy.yml
```

### For Workload Repository Maintainers

#### 1. Respond to Drift Detection Issues

When the autopilot auditor detects drift, it creates an issue with:
- Details of violations
- Merkle root for verification
- Remediation steps

**Action**: Review the issue and follow remediation steps

#### 2. Review Correction PRs

The autopilot may create automatic correction PRs with:
- Drift report
- Proposed fixes
- Merkle root binding

**Action**: Review changes, approve if valid, merge

#### 3. Add Workflow to Allowlist (if needed)

If a workflow legitimately needs local `run:` commands:

1. Request review from governance team
2. Add to allowlist in `repo-manifest.yml` (control plane)
3. Update `policy.yml` allowlist parameter

## Merkle Root Verification

### What is a Merkle Root?

A Merkle root is the single hash at the top of a Merkle tree (hash tree):

```
        Root Hash (Merkle Root)
              /        \
         Hash01        Hash23
         /    \        /    \
      Hash0  Hash1  Hash2  Hash3
       |      |      |      |
    File0  File1  File2  File3
```

### Why Use Merkle Roots?

1. **Immutability**: Any change to any file changes the root
2. **Efficiency**: Single hash represents entire state
3. **Verifiability**: Can prove a file was in a state without revealing all files
4. **Auditability**: Creates chronological chain of states

### Example Verification

```python
# In drift detection report
{
  "merkle_root": "a1b2c3d4...",
  "timestamp": "2026-02-12T00:00:00Z",
  "workflows": [
    {"name": "ci.yml", "hash": "e5f6g7h8..."},
    {"name": "policy.yml", "hash": "i9j0k1l2..."}
  ]
}
```

This binds the **claim** ("repository has these workflows") to **verifiable proof** (Merkle root).

## Epistemic Continuity

### The Problem: Epistemic Decay

Over time, repositories drift:
- Workflows accumulate bespoke logic
- Policies become unenforced
- The "true state" becomes unclear
- Auditing becomes impossible

### The Solution: Bound Claims

Every repository state is bound to:
1. **Canonical structure**: Defined by governance
2. **Deterministic normalization**: Consistent hashing
3. **Cryptographic commitment**: Merkle root
4. **Immutable audit trail**: Git history + Merkle roots

This ensures "epistemic continuity" - the ability to always know the true state.

## Security

### CODEOWNERS Protection

All governance files are protected via CODEOWNERS:
- Changes require approval from `@EvezArt`
- Prevents accidental or malicious modifications
- Locks the "nervous system"

### Branch Protection

Required on all governed repositories:
- PRs required for all changes
- Status checks must pass (policy enforcement)
- Conversations must be resolved
- Enforced for administrators

### Explicit Permissions

All workflows must declare explicit permissions:

```yaml
permissions:
  contents: read
```

This follows security best practices and prevents privilege escalation.

## Troubleshooting

### "Thin-Caller Violation" Error

**Symptom**: PR fails with "VIOLATION: workflow contains bespoke 'run:' steps"

**Solution**:
1. Extract logic to reusable workflow
2. Update workflow to use `uses:` instead of `run:`
3. Or request allowlist exception

### Drift Not Detected

**Symptom**: Workflows have violations but autopilot doesn't detect them

**Solution**:
1. Check workflow schedule (runs daily at 00:00 UTC)
2. Trigger manually: `gh workflow run autopilot-audit.yml`
3. Check audit logs in Actions tab

### Correction PR Not Created

**Symptom**: Drift detected but no PR opened

**Solution**:
1. Check permissions: workflow needs `contents: write` and `pull-requests: write`
2. Trigger with explicit flag: `gh workflow run autopilot-audit.yml -f create_pr=true`

## Development

### Testing Locally

```bash
# Test drift detection
export GITHUB_WORKSPACE=/path/to/repo
python .github/scripts/detect_drift.py

# Test rollout (dry run)
.github/scripts/rollout.sh --repo owner/repo --dry-run

# Test branch protection (dry run)
.github/scripts/enforce_branch_protection.sh --repo owner/repo --dry-run
```

### Adding New Policies

1. Update `reusable-policy.yml` with new check
2. Update `detect_drift.py` with detection logic
3. Update `repo-manifest.yml` with policy configuration
4. Update this documentation

## References

- [GitHub Actions: Reusing workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
- [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Branch protection rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Merkle trees](https://en.wikipedia.org/wiki/Merkle_tree)

## License

Same as parent repository (MIT License)
