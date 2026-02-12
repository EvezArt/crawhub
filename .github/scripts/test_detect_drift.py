#!/usr/bin/env python3
"""
Tests for detect_drift.py

Tests the drift detection logic, Merkle root computation,
and policy violation detection.
"""

import sys
import tempfile
import unittest
from pathlib import Path

# Add parent directory to path to import detect_drift
sys.path.insert(0, str(Path(__file__).parent))

from detect_drift import (
    compute_merkle_root,
    hash_file_content,
    scan_workflows,
    detect_policy_violations,
    detect_missing_policies,
)


class TestMerkleRoot(unittest.TestCase):
    """Test Merkle root computation."""
    
    def test_empty_tree(self):
        """Empty tree should return hash of empty string."""
        root = compute_merkle_root([])
        # SHA-256 of empty string
        expected = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        self.assertEqual(root, expected)
    
    def test_single_leaf(self):
        """Single leaf should be duplicated."""
        leaves = ["abc123"]
        root = compute_merkle_root(leaves)
        # Should hash abc123 + abc123
        self.assertTrue(len(root) == 64)  # SHA-256 hex length
    
    def test_two_leaves(self):
        """Two leaves should combine without duplication."""
        leaves = ["abc123", "def456"]
        root = compute_merkle_root(leaves)
        self.assertTrue(len(root) == 64)
    
    def test_odd_leaves(self):
        """Odd number of leaves should duplicate last."""
        leaves = ["a", "b", "c"]
        root = compute_merkle_root(leaves)
        self.assertTrue(len(root) == 64)
    
    def test_deterministic(self):
        """Same input should always produce same root."""
        leaves = ["abc", "def", "ghi"]
        root1 = compute_merkle_root(leaves)
        root2 = compute_merkle_root(leaves)
        self.assertEqual(root1, root2)
    
    def test_order_matters(self):
        """Different order should produce different root."""
        leaves1 = ["abc", "def"]
        leaves2 = ["def", "abc"]
        root1 = compute_merkle_root(leaves1)
        root2 = compute_merkle_root(leaves2)
        self.assertNotEqual(root1, root2)


class TestHashFileContent(unittest.TestCase):
    """Test file content hashing."""
    
    def test_hash_file(self):
        """Should hash file content correctly."""
        with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
            f.write("test content")
            temp_path = Path(f.name)
        
        try:
            file_hash = hash_file_content(temp_path)
            self.assertTrue(len(file_hash) == 64)  # SHA-256 hex length
        finally:
            temp_path.unlink()
    
    def test_deterministic(self):
        """Same content should produce same hash."""
        with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
            f.write("test content")
            temp_path = Path(f.name)
        
        try:
            hash1 = hash_file_content(temp_path)
            hash2 = hash_file_content(temp_path)
            self.assertEqual(hash1, hash2)
        finally:
            temp_path.unlink()
    
    def test_different_content(self):
        """Different content should produce different hash."""
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='1') as f1:
            f1.write("content 1")
            path1 = Path(f1.name)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='2') as f2:
            f2.write("content 2")
            path2 = Path(f2.name)
        
        try:
            hash1 = hash_file_content(path1)
            hash2 = hash_file_content(path2)
            self.assertNotEqual(hash1, hash2)
        finally:
            path1.unlink()
            path2.unlink()


class TestScanWorkflows(unittest.TestCase):
    """Test workflow scanning."""
    
    def test_no_workflows_dir(self):
        """Should handle missing workflows directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_path = Path(tmpdir)
            result = scan_workflows(repo_path)
            
            self.assertEqual(result['workflows'], [])
            self.assertEqual(result['workflow_count'], 0)
            self.assertTrue('merkle_root' in result)
            self.assertTrue('timestamp' in result)
    
    def test_with_workflows(self):
        """Should scan workflow files correctly."""
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_path = Path(tmpdir)
            workflows_dir = repo_path / ".github" / "workflows"
            workflows_dir.mkdir(parents=True)
            
            # Create test workflow
            workflow_file = workflows_dir / "test.yml"
            workflow_file.write_text("name: Test\non: push")
            
            result = scan_workflows(repo_path)
            
            self.assertEqual(result['workflow_count'], 1)
            self.assertEqual(result['workflows'][0]['name'], 'test.yml')
            self.assertTrue('hash' in result['workflows'][0])
            self.assertTrue('merkle_root' in result)


class TestDetectPolicyViolations(unittest.TestCase):
    """Test policy violation detection."""
    
    def test_no_violations(self):
        """Should not detect violations in compliant workflow."""
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_path = Path(tmpdir)
            workflows_dir = repo_path / ".github" / "workflows"
            workflows_dir.mkdir(parents=True)
            
            # Create compliant workflow (no run: commands)
            workflow_file = workflows_dir / "compliant.yml"
            workflow_file.write_text("""
name: Compliant
on: push
jobs:
  test:
    uses: ./.github/workflows/reusable.yml
""")
            
            violations = detect_policy_violations(repo_path, [])
            self.assertEqual(len(violations), 0)
    
    def test_detect_violation(self):
        """Should detect bespoke run: commands."""
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_path = Path(tmpdir)
            workflows_dir = repo_path / ".github" / "workflows"
            workflows_dir.mkdir(parents=True)
            
            # Create non-compliant workflow
            workflow_file = workflows_dir / "violation.yml"
            workflow_file.write_text("""
name: Violation
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "test"
      - run: npm test
""")
            
            violations = detect_policy_violations(repo_path, [])
            self.assertEqual(len(violations), 1)
            self.assertEqual(violations[0]['file'], 'violation.yml')
            self.assertEqual(violations[0]['violation_type'], 'bespoke_run_command')
            self.assertEqual(len(violations[0]['lines']), 2)
    
    def test_allowlist(self):
        """Should skip allowlisted files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_path = Path(tmpdir)
            workflows_dir = repo_path / ".github" / "workflows"
            workflows_dir.mkdir(parents=True)
            
            # Create workflow with run: command
            workflow_file = workflows_dir / "allowed.yml"
            workflow_file.write_text("""
name: Allowed
on: push
jobs:
  test:
    steps:
      - run: echo "allowed"
""")
            
            # Should detect without allowlist
            violations1 = detect_policy_violations(repo_path, [])
            self.assertEqual(len(violations1), 1)
            
            # Should not detect with allowlist
            violations2 = detect_policy_violations(repo_path, ['allowed.yml'])
            self.assertEqual(len(violations2), 0)


class TestDetectMissingPolicies(unittest.TestCase):
    """Test missing policy file detection."""
    
    def test_no_missing(self):
        """Should not report missing files when all present."""
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_path = Path(tmpdir)
            workflows_dir = repo_path / ".github" / "workflows"
            workflows_dir.mkdir(parents=True)
            
            # Create required files
            (workflows_dir / "policy.yml").write_text("name: Policy")
            (workflows_dir / "reusable-policy.yml").write_text("name: Reusable")
            
            missing = detect_missing_policies(
                repo_path,
                ['policy.yml', 'reusable-policy.yml']
            )
            self.assertEqual(len(missing), 0)
    
    def test_detect_missing(self):
        """Should detect missing required files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_path = Path(tmpdir)
            workflows_dir = repo_path / ".github" / "workflows"
            workflows_dir.mkdir(parents=True)
            
            missing = detect_missing_policies(
                repo_path,
                ['policy.yml', 'reusable-policy.yml']
            )
            self.assertEqual(len(missing), 2)
            
            files = [m['file'] for m in missing]
            self.assertIn('policy.yml', files)
            self.assertIn('reusable-policy.yml', files)


if __name__ == '__main__':
    unittest.main()
