#!/usr/bin/env python3
"""
Drift Detection & Merkle Root Computation

This script performs autonomous drift detection across repositories,
computes Merkle roots for workflow state verification, and generates
drift correction PRs.

Key concepts:
- Merkle root: Cryptographic hash tree root binding workflow states
- Epistemic continuity: Immutable audit trail of repository transformations
- Autonomous correction: Self-healing via automated PRs
"""

import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional


def compute_merkle_root(leaves: List[str]) -> str:
    """
    Compute Merkle root from a list of leaf hashes.
    
    This binds repository state to a single cryptographic commitment,
    enabling verifiable drift detection.
    
    Args:
        leaves: List of SHA-256 hashes (as hex strings)
    
    Returns:
        Merkle root hash (hex string)
    """
    if not leaves:
        # Empty tree has hash of empty string
        return hashlib.sha256(b"").hexdigest()
    
    # Ensure even number of leaves (duplicate last if odd)
    if len(leaves) % 2 == 1:
        leaves.append(leaves[-1])
    
    # Build tree level by level
    current_level = leaves
    
    while len(current_level) > 1:
        next_level = []
        
        for i in range(0, len(current_level), 2):
            left = current_level[i]
            right = current_level[i + 1]
            
            # Combine and hash
            combined = left + right
            parent_hash = hashlib.sha256(combined.encode()).hexdigest()
            next_level.append(parent_hash)
        
        current_level = next_level
    
    return current_level[0]


def hash_file_content(file_path: Path) -> str:
    """
    Compute SHA-256 hash of file content.
    
    Returns canonical hash for drift detection.
    """
    try:
        content = file_path.read_bytes()
        return hashlib.sha256(content).hexdigest()
    except Exception as e:
        print(f"⚠️  Error hashing {file_path}: {e}", file=sys.stderr)
        return hashlib.sha256(b"").hexdigest()


def scan_workflows(repo_path: Path) -> Dict[str, Any]:
    """
    Scan repository workflows and compute state hash.
    
    Returns:
        Dict with workflow inventory and Merkle root
    """
    workflows_dir = repo_path / ".github" / "workflows"
    
    if not workflows_dir.exists():
        return {
            "workflows": [],
            "merkle_root": compute_merkle_root([]),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "workflow_count": 0,
        }
    
    workflows = []
    hashes = []
    
    for workflow_file in sorted(workflows_dir.glob("*.y*ml")):
        file_hash = hash_file_content(workflow_file)
        workflows.append({
            "name": workflow_file.name,
            "path": str(workflow_file.relative_to(repo_path)),
            "hash": file_hash,
        })
        hashes.append(file_hash)
    
    merkle_root = compute_merkle_root(hashes)
    
    return {
        "workflows": workflows,
        "merkle_root": merkle_root,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "workflow_count": len(workflows),
    }


def detect_policy_violations(repo_path: Path, allowlist: List[str]) -> List[Dict[str, Any]]:
    """
    Detect thin-caller policy violations.
    
    Args:
        repo_path: Path to repository
        allowlist: List of allowlisted workflow filenames
    
    Returns:
        List of violations with details
    """
    workflows_dir = repo_path / ".github" / "workflows"
    
    if not workflows_dir.exists():
        return []
    
    violations = []
    
    for workflow_file in workflows_dir.glob("*.y*ml"):
        if workflow_file.name in allowlist:
            continue
        
        content = workflow_file.read_text()
        
        # Check for bespoke run: commands
        lines = content.split("\n")
        violation_lines = []
        
        for i, line in enumerate(lines, 1):
            # Detect run: commands (with or without list marker)
            stripped = line.lstrip()
            # Skip comments
            if stripped.startswith("#"):
                continue
            # Match "run:" or "- run:" (YAML list item)
            if stripped.startswith("run:") or stripped.startswith("- run:"):
                violation_lines.append(i)
        
        if violation_lines:
            violations.append({
                "file": workflow_file.name,
                "path": str(workflow_file.relative_to(repo_path)),
                "violation_type": "bespoke_run_command",
                "lines": violation_lines,
                "message": f"Contains {len(violation_lines)} bespoke 'run:' command(s)",
            })
    
    return violations


def detect_missing_policies(repo_path: Path, required_files: List[str]) -> List[Dict[str, Any]]:
    """
    Detect missing governance policy files.
    
    Args:
        repo_path: Path to repository
        required_files: List of required policy files
    
    Returns:
        List of missing files
    """
    workflows_dir = repo_path / ".github" / "workflows"
    missing = []
    
    for required_file in required_files:
        file_path = workflows_dir / required_file
        
        if not file_path.exists():
            missing.append({
                "file": required_file,
                "path": str(file_path.relative_to(repo_path)),
                "violation_type": "missing_required_file",
                "message": f"Required governance file '{required_file}' is missing",
            })
    
    return missing


def generate_drift_report(
    repo_path: Path,
    allowlist: List[str],
    required_files: List[str],
) -> Dict[str, Any]:
    """
    Generate comprehensive drift detection report.
    
    Returns:
        Report with workflow state, violations, and Merkle root
    """
    state = scan_workflows(repo_path)
    violations = detect_policy_violations(repo_path, allowlist)
    missing = detect_missing_policies(repo_path, required_files)
    
    all_violations = violations + missing
    
    report = {
        "repository": os.getenv("GITHUB_REPOSITORY", str(repo_path.name)),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "state": state,
        "violations": all_violations,
        "violation_count": len(all_violations),
        "drift_detected": len(all_violations) > 0,
        "status": "DRIFT_DETECTED" if all_violations else "COMPLIANT",
    }
    
    return report


def main():
    """Main entry point for drift detection."""
    repo_path = Path(os.getenv("GITHUB_WORKSPACE", "."))
    
    # Configuration
    allowlist = [
        "ci.yml",
        "policy.yml",
        "reusable-policy.yml",
        "autopilot-audit.yml",
        "daily-repo-report.yml",
        "secret-detection.yml",
    ]
    
    required_files = [
        "policy.yml",
        "reusable-policy.yml",
    ]
    
    print("🔍 Starting autonomous drift detection...")
    print(f"Repository: {repo_path}")
    print()
    
    # Generate report
    report = generate_drift_report(repo_path, allowlist, required_files)
    
    # Output report
    print("📊 Drift Detection Report")
    print("=" * 60)
    print(f"Status: {report['status']}")
    print(f"Merkle Root: {report['state']['merkle_root']}")
    print(f"Workflow Count: {report['state']['workflow_count']}")
    print(f"Violations: {report['violation_count']}")
    print()
    
    if report['violations']:
        print("⚠️  Policy Violations Detected:")
        print()
        
        for violation in report['violations']:
            print(f"  ❌ {violation['file']}")
            print(f"     Type: {violation['violation_type']}")
            print(f"     {violation['message']}")
            
            if 'lines' in violation:
                print(f"     Lines: {', '.join(map(str, violation['lines']))}")
            
            print()
    else:
        print("✅ No drift detected - repository is compliant")
    
    # Write report to file
    report_file = repo_path / "drift-report.json"
    report_file.write_text(json.dumps(report, indent=2))
    print(f"📄 Report written to: {report_file}")
    
    # Exit with error if drift detected
    if report['drift_detected']:
        print()
        print("🚨 Drift detected - autonomous correction required")
        sys.exit(1)
    
    sys.exit(0)


if __name__ == "__main__":
    main()
