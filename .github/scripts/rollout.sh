#!/usr/bin/env bash
#
# Rollout Script for Autonomous Governance
#
# This script deploys governance policies to workload repositories,
# ensuring thin-caller compliance and enabling autonomous drift detection.
#
# Usage:
#   ./rollout.sh [--dry-run] [--repo owner/repo]
#
# Options:
#   --dry-run: Show what would be done without making changes
#   --repo: Target specific repository (default: all in manifest)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MANIFEST_FILE="$REPO_ROOT/.github/repo-manifest.yml"
CONTROL_PLANE_REPO="EvezArt/crawhub"

DRY_RUN=false
TARGET_REPO=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --repo)
      TARGET_REPO="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."
  
  if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) is not installed"
    log_info "Install from: https://cli.github.com"
    exit 1
  fi
  
  if ! gh auth status &> /dev/null; then
    log_error "Not authenticated with GitHub CLI"
    log_info "Run: gh auth login"
    exit 1
  fi
  
  if [ ! -f "$MANIFEST_FILE" ]; then
    log_error "Manifest file not found: $MANIFEST_FILE"
    exit 1
  fi
  
  log_success "Prerequisites check passed"
}

# Deploy governance to a repository
deploy_to_repo() {
  local repo=$1
  
  log_info "Deploying governance to $repo"
  
  if [ "$DRY_RUN" = true ]; then
    log_warning "[DRY RUN] Would deploy to $repo"
    return 0
  fi
  
  # Create a temporary directory
  local temp_dir=$(mktemp -d)
  trap "rm -rf $temp_dir" EXIT
  
  cd "$temp_dir"
  
  # Clone the target repository
  log_info "Cloning $repo..."
  if ! gh repo clone "$repo" . -- --depth=1; then
    log_error "Failed to clone $repo"
    return 1
  fi
  
  # Create governance branch
  local branch_name="governance/autopilot-rollout-$(date +%Y%m%d-%H%M%S)"
  git checkout -b "$branch_name"
  
  # Copy governance files
  log_info "Copying governance files..."
  mkdir -p .github/workflows .github/scripts
  
  cp "$REPO_ROOT/.github/workflows/policy.yml" .github/workflows/
  cp "$REPO_ROOT/.github/workflows/reusable-policy.yml" .github/workflows/
  cp "$REPO_ROOT/.github/scripts/detect_drift.py" .github/scripts/
  
  # Add and commit
  git add .github/
  git commit -m "feat: deploy autonomous governance layer

This commit deploys the autonomous governance layer from the control plane
repository ($CONTROL_PLANE_REPO), enabling:

- Thin-caller CI policy enforcement
- Workflow drift detection
- Autonomous correction via autopilot
- Merkle root verification for epistemic continuity

Control Plane: $CONTROL_PLANE_REPO
Rollout Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Branch: $branch_name

This deployment ensures that this repository adheres to centralized
governance policies and enables self-correcting CI workflows."
  
  # Push branch
  log_info "Pushing branch..."
  git push origin "$branch_name"
  
  # Create PR
  log_info "Creating pull request..."
  local pr_url=$(gh pr create \
    --title "🤖 Deploy Autonomous Governance Layer" \
    --body "## Autonomous Governance Deployment

This PR deploys the autonomous governance layer from the control plane repository.

### What's Included

- **Policy Enforcement**: Thin-caller CI policy via \`policy.yml\`
- **Reusable Workflows**: Centralized policy logic via \`reusable-policy.yml\`
- **Drift Detection**: Autonomous drift detection via \`detect_drift.py\`

### Benefits

✅ **Centralized Control**: CI logic managed from control plane
✅ **Autonomous Correction**: Drift auto-detected and corrected via PRs
✅ **Epistemic Continuity**: Merkle roots preserve immutable audit trail
✅ **Self-Enforcing**: Policies enforce themselves without human intervention

### Next Steps

1. Review the governance files
2. Approve and merge this PR
3. The autopilot auditor will monitor for drift daily
4. Any violations will trigger automatic correction PRs

### Control Plane

**Repository**: $CONTROL_PLANE_REPO
**Rollout Time**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

---
*This PR was created by the autonomous governance rollout script*" \
    --label "governance,autopilot" \
    --base main)
  
  log_success "Created PR: $pr_url"
}

# Main execution
main() {
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║     Autonomous Governance Rollout                          ║"
  echo "║     Control Plane: $CONTROL_PLANE_REPO                  ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  
  check_prerequisites
  
  if [ -n "$TARGET_REPO" ]; then
    log_info "Targeting specific repository: $TARGET_REPO"
    deploy_to_repo "$TARGET_REPO"
  else
    log_info "Reading manifest: $MANIFEST_FILE"
    
    # In a real implementation, this would parse YAML
    # For now, just log that we would process all repos
    log_warning "Full manifest rollout not yet implemented"
    log_info "Use --repo option to target specific repositories"
  fi
  
  echo ""
  log_success "Rollout complete!"
  
  if [ "$DRY_RUN" = true ]; then
    log_warning "This was a dry run - no changes were made"
  fi
}

main "$@"
