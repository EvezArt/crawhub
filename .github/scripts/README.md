# GitHub Scripts

This directory contains automation scripts for the repository.

## generate_repo_report.py

Generates a daily repository statistics report using the GitHub API.

**Features:**
- Fetches repository metrics (stars, forks, issues, watchers, etc.)
- Lists recent commits from the last 24 hours
- Lists recently updated issues and pull requests
- Outputs a formatted markdown report

**Requirements:**
- Python 3.11+
- `GITHUB_TOKEN` environment variable (GitHub Actions provides this automatically)
- `GITHUB_REPOSITORY` environment variable (format: `owner/repo`)

**Usage:**
```bash
export GITHUB_TOKEN="your_token_here"
export GITHUB_REPOSITORY="EvezArt/crawhub"
python3 .github/scripts/generate_repo_report.py
```

**In GitHub Actions:**
The script is automatically run by the `daily-repo-report.yml` workflow with the required environment variables.
