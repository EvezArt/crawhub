#!/usr/bin/env python3
"""
Generate a daily repository statistics report.
Uses GitHub API to fetch repository metrics and activity.
"""
import os
import sys
import json
from datetime import datetime, timedelta, timezone
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
        'User-Agent': 'crawhub-daily-report'
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
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    url = f'https://api.github.com/repos/{owner}/{repo}/commits?since={since}&per_page=100'
    return github_api_request(url, token)


def get_recent_issues(owner, repo, token, days=1):
    """Fetch issues updated in the last N days."""
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    url = f'https://api.github.com/repos/{owner}/{repo}/issues?since={since}&per_page=100&state=all'
    return github_api_request(url, token)


def get_recent_prs(owner, repo, token, days=1):
    """Fetch pull requests updated in the last N days."""
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    url = f'https://api.github.com/repos/{owner}/{repo}/pulls?state=all&sort=updated&direction=desc&per_page=100'
    prs = github_api_request(url, token)
    # Filter by update date
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    return [pr for pr in prs if datetime.fromisoformat(pr['updated_at'].replace('Z', '+00:00')).replace(tzinfo=None) > cutoff]


def generate_report(owner, repo):
    """Generate the daily repository report."""
    token = get_github_token()
    
    print("# Daily Repository Report")
    print(f"**Repository:** {owner}/{repo}")
    print(f"**Date:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC")
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
            print(f"- `{sha}` {message} - *{author}*")
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
