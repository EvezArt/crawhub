#!/usr/bin/env python3
"""
Validate governance manifest

Checks manifest for correctness and completeness.
"""

import sys
from pathlib import Path
from typing import Any


def load_manifest(manifest_path: str) -> dict[str, Any]:
    """Load governance manifest."""
    with open(manifest_path) as f:
        import yaml
        return yaml.safe_load(f)


def validate_manifest(manifest: dict[str, Any]) -> list[str]:
    """Validate manifest structure and content."""
    errors = []
    
    # Check required top-level fields
    if "version" not in manifest:
        errors.append("Missing required field: version")
    
    if "control_plane" not in manifest:
        errors.append("Missing required field: control_plane")
    else:
        cp = manifest["control_plane"]
        if "repository" not in cp:
            errors.append("control_plane missing required field: repository")
        if "description" not in cp:
            errors.append("control_plane missing required field: description")
    
    if "governed_repositories" not in manifest:
        errors.append("Missing required field: governed_repositories")
    else:
        repos = manifest["governed_repositories"]
        if not isinstance(repos, list):
            errors.append("governed_repositories must be a list")
        else:
            for i, repo in enumerate(repos):
                if "name" not in repo:
                    errors.append(f"Repository {i} missing required field: name")
                if "description" not in repo:
                    errors.append(f"Repository {i} missing required field: description")
                if "governance_level" not in repo:
                    errors.append(f"Repository {i} missing required field: governance_level")
                elif repo["governance_level"] not in ["full", "partial", "monitoring"]:
                    errors.append(f"Repository {i} has invalid governance_level: {repo['governance_level']}")
                
                if "policies" not in repo:
                    errors.append(f"Repository {i} missing required field: policies")
                elif not isinstance(repo["policies"], list):
                    errors.append(f"Repository {i} policies must be a list")
    
    # Check rollout configuration
    if "rollout" in manifest:
        rollout = manifest["rollout"]
        if "strategy" in rollout and rollout["strategy"] not in ["phased", "immediate", "manual"]:
            errors.append(f"Invalid rollout strategy: {rollout['strategy']}")
    
    # Check event stream configuration
    if "event_stream" in manifest:
        es = manifest["event_stream"]
        if "merkle_tree" in es:
            mt = es["merkle_tree"]
            if "algorithm" in mt and mt["algorithm"] not in ["sha256", "sha512"]:
                errors.append(f"Invalid merkle_tree algorithm: {mt['algorithm']}")
    
    return errors


def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print("Usage: validate_manifest.py <manifest.yml>")
        sys.exit(1)
    
    manifest_path = sys.argv[1]
    
    if not Path(manifest_path).exists():
        print(f"Error: Manifest file not found: {manifest_path}")
        sys.exit(1)
    
    print(f"Validating manifest: {manifest_path}")
    
    try:
        manifest = load_manifest(manifest_path)
        errors = validate_manifest(manifest)
        
        if errors:
            print(f"\n❌ Validation failed with {len(errors)} error(s):\n")
            for error in errors:
                print(f"  - {error}")
            sys.exit(1)
        else:
            print("\n✅ Manifest is valid")
            
            # Print summary
            repos = manifest.get("governed_repositories", [])
            print(f"\nSummary:")
            print(f"  Control plane: {manifest['control_plane']['repository']}")
            print(f"  Governed repositories: {len(repos)}")
            print(f"  Rollout strategy: {manifest.get('rollout', {}).get('strategy', 'not configured')}")
            
            sys.exit(0)
    
    except Exception as e:
        print(f"\n❌ Error loading manifest: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
