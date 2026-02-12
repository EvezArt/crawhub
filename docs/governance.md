# Autonomous Governance Layer

The autonomous governance layer provides centralized policy enforcement, drift detection, and automated remediation across repositories. This system ensures consistency, prevents configuration drift, and maintains verifiable audit trails through cryptographic checkpoints.

## Architecture

### Control Plane

The control plane is located in `EvezArt/crawhub` and manages governance for all governed repositories. It consists of:

1. **Policy Workflows** - Reusable GitHub Actions workflows for policy enforcement
2. **Autopilot Auditor** - Autonomous drift detection and automated fix PRs
3. **Merkle Tree System** - Cryptographic verification of event streams
4. **Repository Manifest** - Registry of governed repositories
5. **Rollout Scripts** - Automated policy deployment

### Key Components

#### 1. Thin-Caller CI Policy

The thin-caller policy ensures workflows delegate to reusable workflows instead of containing inline `run:` steps. This:

- **Prevents drift** - Changes to CI logic are made once in reusable workflows
- **Enforces consistency** - All repositories follow the same CI patterns
- **Enables governance** - Central control plane can audit and update CI
- **Improves security** - Reduces attack surface by minimizing inline scripts

See [THIN-CALLER-POLICY.md](../.github/workflows/THIN-CALLER-POLICY.md) for details.

#### 2. Autopilot Auditor

The autopilot auditor runs daily to:

- Detect configuration drift
- Validate policy compliance
- Create automated fix PRs
- Record audit events
- Compute Merkle checkpoints

Workflow: `.github/workflows/autopilot-auditor.yml`

#### 3. Merkle Root Computation

Event streams are checkpointed using Merkle trees for verifiable audit trails:

```bash
# Compute checkpoint from events
bun scripts/compute-merkle.ts compute .github/governance/events.json .github/governance/checkpoint.json

# Verify checkpoint integrity
bun scripts/compute-merkle.ts verify .github/governance/checkpoint.json
```

The Merkle root binds all governance events to an immutable, verifiable hash that's stored in the manifest.

#### 4. Repository Manifest

The manifest at `.github/governance/manifest.yml` defines:

- Governed repositories
- Applied policies
- Branch protection rules
- Drift detection settings
- Rollout strategy
- Merkle root checkpoints

#### 5. Rollout Scripts

Scripts for deploying governance policies:

```bash
# Validate manifest
python .github/scripts/validate_manifest.py .github/governance/manifest.yml

# Rollout policies (dry run)
python .github/scripts/rollout_policies.py .github/governance/manifest.yml --dry-run

# Setup branch protection
python .github/scripts/setup_branch_protection.py .github/governance/manifest.yml --dry-run
```

## Workflows

### Reusable Workflows

#### `reusable-ci.yml`

Standard CI workflow for governed repositories:

```yaml
jobs:
  ci:
    uses: EvezArt/crawhub/.github/workflows/reusable-ci.yml@main
    with:
      bun-version: '1.3.6'
      run-lint: true
      run-tests: true
      run-coverage: true
      run-build: true
```

#### `reusable-policy.yml`

Policy enforcement workflow:

```yaml
jobs:
  enforce-policies:
    uses: EvezArt/crawhub/.github/workflows/reusable-policy.yml@main
    with:
      allowlisted-workflows: 'ci.yml,policy.yml'
```

### Control Workflows

#### `policy.yml`

Enforces thin-caller policy on all workflow changes.

#### `autopilot-auditor.yml`

Runs daily drift detection and creates fix PRs automatically.

## Event Stream and Audit Trail

All governance events are logged to `.github/governance/events.json`:

```json
{
  "timestamp": "2026-02-12T00:00:00Z",
  "type": "policy_change",
  "repository": "EvezArt/crawhub",
  "actor": "autopilot",
  "data": {
    "policy": "thin-caller-ci",
    "action": "enabled"
  },
  "hash": "a1b2c3..."
}
```

Events are periodically checkpointed using Merkle trees. The root hash is stored in the manifest, providing verifiable proof of the event history.

### Event Types

- `audit_run` - Autopilot auditor execution
- `drift_detected` - Configuration drift found
- `drift_fixed` - Automated fix applied
- `policy_change` - Policy configuration updated
- `rollout` - Policy deployed to repository
- `manual_intervention` - Manual change made

## Adding a Repository to Governance

1. **Update the manifest** (`.github/governance/manifest.yml`):

```yaml
governed_repositories:
  - name: EvezArt/new-repo
    description: "Description of the repository"
    governance_level: "full"  # full, partial, or monitoring
    policies:
      - thin-caller-ci
      - branch-protection
    branch_protection:
      branch: main
      required_reviews: 1
      require_status_checks: true
      required_checks:
        - "ci"
    drift_detection:
      enabled: true
      auto_fix: true
      auto_pr: true
```

2. **Validate the manifest**:

```bash
python .github/scripts/validate_manifest.py .github/governance/manifest.yml
```

3. **Rollout policies**:

```bash
# Dry run first
python .github/scripts/rollout_policies.py .github/governance/manifest.yml --dry-run

# Actual rollout
python .github/scripts/rollout_policies.py .github/governance/manifest.yml
```

4. **Setup branch protection**:

```bash
# Dry run first
python .github/scripts/setup_branch_protection.py .github/governance/manifest.yml --dry-run

# Actual setup (requires admin permissions)
python .github/scripts/setup_branch_protection.py .github/governance/manifest.yml
```

## Governance Levels

- **full** - All policies enforced, automatic drift fixing enabled
- **partial** - Selected policies enforced, manual drift fixing
- **monitoring** - Only monitoring, no enforcement

## Security

### Verifiable Audit Trail

The Merkle tree system ensures:

- **Immutability** - Past events cannot be modified without detection
- **Verifiability** - Any party can verify the event history
- **Binding** - Claims are cryptographically bound to specific events

### Access Control

- Control plane requires write access to governed repositories
- Autopilot bot uses repository tokens for automated PRs
- Manual rollout requires admin permissions for branch protection

### Secret Management

- Never commit GitHub tokens or credentials
- Use GitHub Actions secrets for sensitive data
- Scripts use environment variables for authentication

## Monitoring and Alerts

### Daily Audits

The autopilot auditor runs daily and:

- Checks all governed repositories
- Detects drift and violations
- Creates fix PRs automatically
- Updates Merkle checkpoints

### Manual Triggers

Trigger drift detection manually:

```bash
# Via GitHub Actions UI
# Go to Actions → Autopilot Auditor → Run workflow

# Or via gh CLI
gh workflow run autopilot-auditor.yml
```

### Drift Reports

Drift reports are saved as artifacts:

```bash
# Download latest drift report
gh run download --name drift-report
```

## Troubleshooting

### Drift Detection Fails

Check the drift report for details:

```bash
gh run view <run-id>
gh run download <run-id> --name drift-report
cat drift-report.json
```

### Fix PR Not Created

Ensure:

- Auto-fix is enabled in manifest
- Autopilot bot has write permissions
- No merge conflicts exist

### Merkle Verification Fails

This indicates tampering or corruption:

```bash
# Re-compute checkpoint
bun scripts/compute-merkle.ts compute .github/governance/events.json .github/governance/checkpoint.json

# Verify
bun scripts/compute-merkle.ts verify .github/governance/checkpoint.json
```

If verification still fails, investigate the event log for unauthorized changes.

## Best Practices

1. **Start with monitoring** - Use governance_level: "monitoring" initially
2. **Test rollouts** - Always use --dry-run first
3. **Review fix PRs** - Don't auto-merge without review
4. **Keep manifest updated** - Document all governed repositories
5. **Verify checkpoints** - Regularly verify Merkle checksums
6. **Backup event logs** - Archive event streams periodically

## Future Enhancements

- Multi-repository drift detection in single run
- Policy version control and rollback
- Dashboard for governance metrics
- Slack/Discord notifications for drift
- Custom policy plugins
- Machine learning for anomaly detection

## References

- [Thin-Caller Policy](../.github/workflows/THIN-CALLER-POLICY.md)
- [Repository Manifest](../.github/governance/manifest.yml)
- [Merkle Tree Computation](../scripts/compute-merkle.ts)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
