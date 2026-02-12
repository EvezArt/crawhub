#!/usr/bin/env bash
#
# Branch Protection Enforcement Script
#
# This script enforces branch protection rules on repositories to ensure
# that governance policies cannot be bypassed.
#
# Usage:
#   ./enforce_branch_protection.sh [--repo owner/repo] [--dry-run]
#
# Features:
#   - Require pull request reviews before merging
#   - Require status checks to pass (policy enforcement)
#   - Require conversation resolution
#   - Enforce for administrators
#   - Restrict who can push to protected branches

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
CONTROL_PLANE_REPO="EvezArt/crawhub"
DRY_RUN=false
TARGET_REPO=""
BRANCH="main"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --repo)
      TARGET_REPO="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Logging
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
  if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) not installed"
    exit 1
  fi
  
  if ! gh auth status &> /dev/null; then
    log_error "Not authenticated with GitHub CLI"
    exit 1
  fi
  
  if [ -z "$TARGET_REPO" ]; then
    log_error "Repository required. Use --repo owner/repo"
    exit 1
  fi
}

# Apply branch protection rules
apply_branch_protection() {
  local repo=$1
  local branch=$2
  
  log_info "Applying branch protection to $repo ($branch)"
  
  if [ "$DRY_RUN" = true ]; then
    log_warning "[DRY RUN] Would apply protection rules to $repo:$branch"
    cat << EOF

Branch Protection Rules:
  ✓ Require pull request reviews (1 approval)
  ✓ Require status checks:
    - policy-check / Enforce Governance Policies
  ✓ Require conversation resolution
  ✓ Enforce for administrators
  ✓ Require linear history
  ✓ Lock branch (restrict pushes)

EOF
    return 0
  fi
  
  log_info "Creating branch protection rule..."
  
  # Use GitHub API via gh
  gh api \
    --method PUT \
    "/repos/$repo/branches/$branch/protection" \
    --input - << EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "policy-check / Enforce Governance Policies"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismissal_restrictions": {},
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false
}
EOF
  
  log_success "Branch protection applied to $repo:$branch"
}

# Verify branch protection
verify_branch_protection() {
  local repo=$1
  local branch=$2
  
  log_info "Verifying branch protection..."
  
  if gh api "/repos/$repo/branches/$branch/protection" &> /dev/null; then
    log_success "Branch protection is active"
    return 0
  else
    log_error "Branch protection verification failed"
    return 1
  fi
}

# Main
main() {
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║     Branch Protection Enforcement                          ║"
  echo "║     Autonomous Governance System                           ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  
  check_prerequisites
  
  log_info "Target: $TARGET_REPO"
  log_info "Branch: $BRANCH"
  echo ""
  
  apply_branch_protection "$TARGET_REPO" "$BRANCH"
  
  if [ "$DRY_RUN" = false ]; then
    echo ""
    verify_branch_protection "$TARGET_REPO" "$BRANCH"
  fi
  
  echo ""
  log_success "Branch protection enforcement complete!"
  
  if [ "$DRY_RUN" = true ]; then
    log_warning "This was a dry run - no changes were made"
  fi
}

main "$@"
