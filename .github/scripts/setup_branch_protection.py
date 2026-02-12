#!/usr/bin/env python3
"""
Setup branch protection for governed repositories

This script configures branch protection rules based on the governance manifest.
"""

import json
import os
import subprocess
import sys
from typing import Any


def load_manifest(manifest_path: str) -> dict[str, Any]:
    """Load governance manifest."""
    with open(manifest_path) as f:
        import yaml
        return yaml.safe_load(f)


def get_github_token() -> str:
    """Get GitHub token from environment."""
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        raise ValueError("GITHUB_TOKEN or GH_TOKEN environment variable is required")
    return token


def setup_branch_protection(repo_name: str, config: dict[str, Any], dry_run: bool = False) -> dict[str, Any]:
    """Setup branch protection for a repository."""
    branch = config.get("branch", "main")
    
    print(f"\n🔒 Setting up branch protection for {repo_name}:{branch}")
    
    # Build protection settings
    settings = {
        "required_status_checks": {
            "strict": config.get("require_status_checks", True),
            "contexts": config.get("required_checks", [])
        },
        "enforce_admins": False,
        "required_pull_request_reviews": {
            "required_approving_review_count": config.get("required_reviews", 1),
            "dismiss_stale_reviews": config.get("dismiss_stale_reviews", True),
            "require_code_owner_reviews": config.get("require_code_owner_reviews", False)
        },
        "restrictions": None,
        "allow_force_pushes": False,
        "allow_deletions": False
    }
    
    print(f"   Required reviews: {settings['required_pull_request_reviews']['required_approving_review_count']}")
    print(f"   Required status checks: {', '.join(settings['required_status_checks']['contexts']) or 'None'}")
    
    if dry_run:
        print("   [DRY RUN] Skipping actual setup")
        return {"repository": repo_name, "branch": branch, "status": "dry_run", "success": True}
    
    try:
        # Use gh CLI to set branch protection
        token = get_github_token()
        
        # Convert settings to gh CLI format
        cmd = [
            "gh", "api",
            f"repos/{repo_name}/branches/{branch}/protection",
            "-X", "PUT",
            "-H", "Accept: application/vnd.github+json",
            "-f", f"required_status_checks[strict]={str(settings['required_status_checks']['strict']).lower()}",
            "-f", f"required_pull_request_reviews[required_approving_review_count]={settings['required_pull_request_reviews']['required_approving_review_count']}",
            "-f", f"required_pull_request_reviews[dismiss_stale_reviews]={str(settings['required_pull_request_reviews']['dismiss_stale_reviews']).lower()}",
            "-f", f"required_pull_request_reviews[require_code_owner_reviews]={str(settings['required_pull_request_reviews']['require_code_owner_reviews']).lower()}",
            "-f", f"enforce_admins={str(settings['enforce_admins']).lower()}",
            "-f", f"allow_force_pushes={str(settings['allow_force_pushes']).lower()}",
            "-f", f"allow_deletions={str(settings['allow_deletions']).lower()}"
        ]
        
        # Add required status checks
        for check in settings['required_status_checks']['contexts']:
            cmd.extend(["-f", f"required_status_checks[contexts][]={check}"])
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        print("   ✓ Branch protection configured")
        return {"repository": repo_name, "branch": branch, "status": "success", "success": True}
    
    except subprocess.CalledProcessError as e:
        print(f"   ✗ Error: {e.stderr}")
        return {"repository": repo_name, "branch": branch, "status": "error", "success": False, "error": e.stderr}
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return {"repository": repo_name, "branch": branch, "status": "error", "success": False, "error": str(e)}


def main():
    """CLI entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Setup branch protection")
    parser.add_argument("manifest", help="Path to governance manifest")
    parser.add_argument("--dry-run", action="store_true", help="Perform dry run without making changes")
    
    args = parser.parse_args()
    
    print("Branch Protection Setup")
    print("=" * 50)
    
    # Load manifest
    print(f"\nLoading manifest from {args.manifest}")
    manifest = load_manifest(args.manifest)
    
    governed_repos = manifest.get("governed_repositories", [])
    print(f"Found {len(governed_repos)} governed repositories")
    
    results = []
    
    for repo_config in governed_repos:
        if "branch_protection" not in repo_config:
            print(f"\n📦 Skipping {repo_config['name']} (no branch protection config)")
            continue
        
        result = setup_branch_protection(
            repo_config["name"],
            repo_config["branch_protection"],
            args.dry_run
        )
        results.append(result)
    
    # Summary
    print("\n" + "=" * 50)
    print("Setup Summary")
    print("=" * 50)
    
    success_count = sum(1 for r in results if r["success"])
    print(f"\nTotal: {len(results)}")
    print(f"Success: {success_count}")
    print(f"Failed: {len(results) - success_count}")
    
    for result in results:
        status_icon = "✓" if result["success"] else "✗"
        print(f"  {status_icon} {result['repository']}:{result['branch']}: {result['status']}")
    
    if success_count < len(results):
        sys.exit(1)


if __name__ == "__main__":
    main()
