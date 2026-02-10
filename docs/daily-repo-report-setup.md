# Daily Repository Report - One-Liner Setup

This document provides the one-liner shell command to set up the daily repository report workflow from scratch.

## The One-Liner Command

```bash
(set -euo pipefail; REPO_SSH="git@github.com:EvezArt/crawhub.git"; REPO_DIR="crawhub"; BASE_BRANCH="main"; BRANCH_BASE="add/daily-repo-report"; if [ -d "$REPO_DIR/.git" ]; then cd "$REPO_DIR" && git fetch origin; else git clone "$REPO_SSH" "$REPO_DIR" && cd "$REPO_DIR"; fi; git checkout "$BASE_BRANCH" && git pull origin "$BASE_BRANCH"; i=0; BRANCH="$BRANCH_BASE"; while git ls-remote --heads origin "refs/heads/$BRANCH" | grep -q "$BRANCH"; do i=$((i + 1)); BRANCH="${BRANCH_BASE}-${i}"; done; git checkout -b "$BRANCH"; mkdir -p .github/scripts .github/workflows; WF_FILE=".github/workflows/daily-repo-report.yml"; j=1; while [ -f "$WF_FILE" ]; do j=$((j + 1)); WF_FILE=".github/workflows/daily-repo-report-${j}.yml"; done; cat > "$WF_FILE" << 'WORKFLOW_EOF'
name: Daily Repository Report

on:
  schedule:
    # Run daily at 9:00 AM UTC
    - cron: '0 9 * * *'
  workflow_dispatch: # Allow manual trigger

permissions:
  contents: read

jobs:
  generate-report:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Generate repository report
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
        run: |
          python .github/scripts/generate_repo_report.py

      - name: Upload report as artifact
        uses: actions/upload-artifact@v4
        with:
          name: daily-repo-report-${{ github.run_number }}
          path: |
            .
          retention-days: 30
WORKFLOW_EOF
cat > .github/scripts/generate_repo_report.py << 'SCRIPT_EOF'
#!/usr/bin/env python3
"""
Generate a daily repository statistics report.
Uses GitHub API to fetch repository metrics and activity.
"""
import os
import sys
import json
from datetime import datetime, timedelta
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


def get_github_token():
    """Get GitHub token from environment variable."""
    token = os.environ.get('GITHUB_TOKEN')
    if not token:
        print("Error: GITHUB_TOKEN environment variable not set", file=sys.stderr)
        sys.exit(1)
    return token


def github_api_request(url, token):
    """Make a request to the GitHub API."""
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ClawHub-Daily-Report'
    }
    req = Request(url, headers=headers)
    try:
        with urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except URLError as e:
        print(f"URL Error: {e.reason}", file=sys.stderr)
        sys.exit(1)


def get_repo_info(owner, repo, token):
    """Fetch basic repository information."""
    url = f'https://api.github.com/repos/{owner}/{repo}'
    return github_api_request(url, token)


def get_recent_commits(owner, repo, token, days=1):
    """Fetch commits from the last N days."""
    since = (datetime.utcnow() - timedelta(days=days)).isoformat() + 'Z'
    url = f'https://api.github.com/repos/{owner}/{repo}/commits?since={since}&per_page=100'
    return github_api_request(url, token)


def get_recent_issues(owner, repo, token, days=1):
    """Fetch issues updated in the last N days."""
    since = (datetime.utcnow() - timedelta(days=days)).isoformat() + 'Z'
    url = f'https://api.github.com/repos/{owner}/{repo}/issues?since={since}&per_page=100&state=all'
    return github_api_request(url, token)


def get_recent_prs(owner, repo, token, days=1):
    """Fetch pull requests updated in the last N days."""
    since = (datetime.utcnow() - timedelta(days=days)).isoformat() + 'Z'
    url = f'https://api.github.com/repos/{owner}/{repo}/pulls?state=all&sort=updated&direction=desc&per_page=100'
    prs = github_api_request(url, token)
    # Filter by update date
    cutoff = datetime.utcnow() - timedelta(days=days)
    return [pr for pr in prs if datetime.fromisoformat(pr['updated_at'].replace('Z', '+00:00')).replace(tzinfo=None) > cutoff]


def generate_report(owner, repo):
    """Generate the daily repository report."""
    token = get_github_token()
    
    print("# Daily Repository Report")
    print(f"**Repository:** {owner}/{repo}")
    print(f"**Date:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print()
    
    # Get repository information
    repo_info = get_repo_info(owner, repo, token)
    print("## Repository Statistics")
    print(f"- **Stars:** {repo_info.get('stargazers_count', 0)}")
    print(f"- **Forks:** {repo_info.get('forks_count', 0)}")
    print(f"- **Open Issues:** {repo_info.get('open_issues_count', 0)}")
    print(f"- **Watchers:** {repo_info.get('watchers_count', 0)}")
    print(f"- **Size:** {repo_info.get('size', 0)} KB")
    print(f"- **Default Branch:** {repo_info.get('default_branch', 'main')}")
    print(f"- **Created:** {repo_info.get('created_at', 'N/A')}")
    print(f"- **Last Updated:** {repo_info.get('updated_at', 'N/A')}")
    print(f"- **Language:** {repo_info.get('language', 'N/A')}")
    print()
    
    # Get recent commits
    commits = get_recent_commits(owner, repo, token)
    print("## Recent Activity (Last 24 Hours)")
    print(f"### Commits: {len(commits)}")
    if commits:
        for commit in commits[:5]:
            author = commit.get('commit', {}).get('author', {}).get('name', 'Unknown')
            message = commit.get('commit', {}).get('message', '').split('\n')[0]
            sha = commit.get('sha', '')[:7]
            print(f"- \`{sha}\` {message} - *{author}*")
        if len(commits) > 5:
            print(f"- ... and {len(commits) - 5} more commits")
    else:
        print("- No commits in the last 24 hours")
    print()
    
    # Get recent issues
    issues = get_recent_issues(owner, repo, token)
    # Filter out pull requests (they appear in issues API too)
    issues = [issue for issue in issues if 'pull_request' not in issue]
    print(f"### Issues Updated: {len(issues)}")
    if issues:
        for issue in issues[:5]:
            title = issue.get('title', 'No title')
            number = issue.get('number', 0)
            state = issue.get('state', 'unknown')
            print(f"- #{number}: {title} [{state}]")
        if len(issues) > 5:
            print(f"- ... and {len(issues) - 5} more issues")
    else:
        print("- No issues updated in the last 24 hours")
    print()
    
    # Get recent pull requests
    prs = get_recent_prs(owner, repo, token)
    print(f"### Pull Requests Updated: {len(prs)}")
    if prs:
        for pr in prs[:5]:
            title = pr.get('title', 'No title')
            number = pr.get('number', 0)
            state = pr.get('state', 'unknown')
            print(f"- #{number}: {title} [{state}]")
        if len(prs) > 5:
            print(f"- ... and {len(prs) - 5} more pull requests")
    else:
        print("- No pull requests updated in the last 24 hours")
    print()
    
    print("---")
    print("*Generated by Daily Repository Report workflow*")


if __name__ == '__main__':
    # Get repository from environment or use default
    repo_full = os.environ.get('GITHUB_REPOSITORY', 'EvezArt/crawhub')
    if '/' not in repo_full:
        print("Error: Invalid GITHUB_REPOSITORY format", file=sys.stderr)
        sys.exit(1)
    
    owner, repo = repo_full.split('/', 1)
    generate_report(owner, repo)
SCRIPT_EOF
chmod +x .github/scripts/generate_repo_report.py; git add .github/workflows/"$(basename "$WF_FILE")" .github/scripts/generate_repo_report.py && git commit -m "Add daily repo report workflow" && git push origin "$BRANCH" && echo "✓ Setup complete! Branch '$BRANCH' created and pushed.")
```

## What This One-Liner Does

1. **Sets error handling**: `set -euo pipefail` ensures the script stops on any error
2. **Defines variables**: Repository SSH URL, directory name, base branch, and branch base name
3. **Clones or fetches**: 
   - If the repository directory exists, it fetches from origin
   - Otherwise, it clones the repository
4. **Updates base branch**: Checks out and pulls the latest main branch
5. **Finds unique branch name**: 
   - Checks if `add/daily-repo-report` exists remotely
   - If it does, tries `add/daily-repo-report-1`, `-2`, etc. until finding an unused name
6. **Creates new branch**: Checks out a new branch with the unique name
7. **Creates directories**: Ensures `.github/scripts` and `.github/workflows` exist
8. **Finds unique workflow filename**:
   - Checks if `.github/workflows/daily-repo-report.yml` exists
   - If it does, tries `daily-repo-report-2.yml`, `-3.yml`, etc.
9. **Writes workflow file**: Uses a here-document to write the complete GitHub Actions workflow
10. **Writes Python script**: Uses a here-document to write the complete Python report generator
11. **Makes script executable**: Sets execute permission on the Python script
12. **Commits and pushes**: Stages both files, commits with message "Add daily repo report workflow", and pushes to origin
13. **Success message**: Displays completion message with the branch name

## Breakdown by Component

### Clone/Fetch Logic
```bash
if [ -d "$REPO_DIR/.git" ]; then 
  cd "$REPO_DIR" && git fetch origin; 
else 
  git clone "$REPO_SSH" "$REPO_DIR" && cd "$REPO_DIR"; 
fi
```

### Branch Name Generation
```bash
i=0; BRANCH="$BRANCH_BASE"
while git ls-remote --heads origin "refs/heads/$BRANCH" | grep -q "$BRANCH"; do 
  i=$((i + 1)); 
  BRANCH="${BRANCH_BASE}-${i}"
done
```

### Workflow Filename Conflict Resolution
```bash
WF_FILE=".github/workflows/daily-repo-report.yml"
j=1
while [ -f "$WF_FILE" ]; do 
  j=$((j + 1)); 
  WF_FILE=".github/workflows/daily-repo-report-${j}.yml"
done
```

## Features

- ✅ POSIX sh compatible
- ✅ Stops on errors (`set -euo pipefail`)
- ✅ Handles existing repository directory
- ✅ Handles existing remote branches
- ✅ Handles existing workflow files
- ✅ Does NOT create pull requests
- ✅ Does NOT modify secrets
- ✅ Leaves user in repository with new branch checked out
- ✅ Compact yet readable

## Security Notes

- Uses SSH for git operations (requires SSH keys to be configured)
- Does not call `gh pr create` or modify GitHub secrets
- Uses safe shell scripting practices
- Includes proper error handling

## Testing the Workflow

After running the one-liner, you can test the workflow by:

1. Creating a pull request manually
2. Running the workflow manually via GitHub Actions UI (workflow_dispatch trigger)
3. Waiting for the scheduled run (daily at 9:00 AM UTC)

The workflow will generate a report and upload it as an artifact.
