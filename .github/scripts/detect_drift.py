#!/usr/bin/env python3
"""
Drift Detection Script for Autonomous Governance

Detects configuration drift between repositories and governance policies.
Reports violations and creates automated fix PRs.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def load_manifest(manifest_path: str) -> dict[str, Any]:
    """Load governance manifest."""
    with open(manifest_path) as f:
        import yaml
        return yaml.safe_load(f)


def check_workflow_compliance(repo_path: str, policies: list[str]) -> list[dict[str, Any]]:
    """Check if workflows comply with governance policies."""
    violations = []
    workflows_dir = Path(repo_path) / ".github" / "workflows"
    
    if not workflows_dir.exists():
        return violations
    
    # Check thin-caller policy
    if "thin-caller-ci" in policies:
        allowlist = ["ci.yml", "reusable-policy.yml", "policy.yml", "autopilot-auditor.yml", "reusable-ci.yml"]
        
        for workflow_file in workflows_dir.glob("*.yml"):
            if workflow_file.name in allowlist:
                continue
            
            content = workflow_file.read_text()
            
            # Check for inline run steps in various formats
            lines = content.split("\n")
            in_step = False
            for i, line in enumerate(lines, 1):
                stripped = line.strip()
                
                # Detect start of a new step
                if stripped.startswith("- name:") or stripped.startswith("- uses:") or stripped.startswith("- run:"):
                    in_step = True
                
                # Check for "- run:" (list item with run)
                if stripped.startswith("- run:"):
                    violations.append({
                        "type": "thin-caller-violation",
                        "file": str(workflow_file.relative_to(repo_path)),
                        "line": i,
                        "message": f"Workflow contains inline 'run:' step (violates thin-caller policy)",
                        "severity": "error",
                    })
                # Check for "run:" as a step property (indented, part of current step)
                elif stripped.startswith("run:") and in_step and not stripped.startswith("runs-on:"):
                    violations.append({
                        "type": "thin-caller-violation",
                        "file": str(workflow_file.relative_to(repo_path)),
                        "line": i,
                        "message": f"Workflow contains inline 'run:' step (violates thin-caller policy)",
                        "severity": "error",
                    })
                
                # A line starting with '-' that's not part of the current step starts a new item
                # Reset in_step only if we see a new list item that's not a step
                if stripped.startswith("-") and not stripped.startswith("- name:") and not stripped.startswith("- uses:") and not stripped.startswith("- run:") and not stripped.startswith("- if:") and not stripped.startswith("- id:"):
                    in_step = False
    
    return violations


def check_required_workflows(repo_path: str, policies: list[str]) -> list[dict[str, Any]]:
    """Check if required workflows exist."""
    violations = []
    workflows_dir = Path(repo_path) / ".github" / "workflows"
    
    if not workflows_dir.exists():
        workflows_dir.mkdir(parents=True)
    
    # Check required workflows based on policies
    if "thin-caller-ci" in policies:
        required = ["policy.yml", "reusable-policy.yml"]
        for workflow in required:
            workflow_path = workflows_dir / workflow
            if not workflow_path.exists():
                violations.append({
                    "type": "missing-workflow",
                    "file": f".github/workflows/{workflow}",
                    "message": f"Required workflow {workflow} is missing",
                    "severity": "error",
                })
    
    return violations


def detect_drift(manifest_path: str, repo_path: str) -> dict[str, Any]:
    """Main drift detection function."""
    manifest = load_manifest(manifest_path)
    
    # Find current repository in manifest
    current_repo = None
    repo_name = os.environ.get("GITHUB_REPOSITORY", "EvezArt/crawhub")
    
    for repo in manifest.get("governed_repositories", []):
        if repo["name"] == repo_name:
            current_repo = repo
            break
    
    if not current_repo:
        return {
            "drift_detected": False,
            "violations": [],
            "message": f"Repository {repo_name} not found in governance manifest",
        }
    
    policies = current_repo.get("policies", [])
    violations = []
    
    # Check workflow compliance
    violations.extend(check_workflow_compliance(repo_path, policies))
    
    # Check required workflows
    violations.extend(check_required_workflows(repo_path, policies))
    
    drift_detected = len(violations) > 0
    
    result = {
        "drift_detected": drift_detected,
        "violations": violations,
        "repository": repo_name,
        "policies": policies,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    
    return result


def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print("Usage: detect_drift.py <manifest_path> [repo_path]")
        sys.exit(1)
    
    manifest_path = sys.argv[1]
    repo_path = sys.argv[2] if len(sys.argv) > 2 else "."
    
    print(f"Detecting drift for repository at: {repo_path}")
    print(f"Using manifest: {manifest_path}")
    
    result = detect_drift(manifest_path, repo_path)
    
    # Output result as JSON
    output_file = os.environ.get("DRIFT_REPORT_FILE", "drift-report.json")
    with open(output_file, "w") as f:
        json.dump(result, f, indent=2)
    
    print(f"\nDrift report saved to: {output_file}")
    
    if result["drift_detected"]:
        print(f"\n❌ Drift detected: {len(result['violations'])} violation(s)")
        for violation in result["violations"]:
            print(f"  - {violation['type']}: {violation['message']}")
            if "file" in violation:
                print(f"    File: {violation['file']}")
        sys.exit(1)
    else:
        print("\n✅ No drift detected")
        sys.exit(0)


if __name__ == "__main__":
    main()
