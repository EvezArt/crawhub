#!/usr/bin/env python3
"""Generate daily repository report with GitHub GraphQL API."""

import os
import sys
import json
import csv
from datetime import datetime, timezone
from typing import Any, Dict, List

import requests


def query_github_graphql(query: str, variables: Dict[str, Any], token: str) -> Dict[str, Any]:
    """Query GitHub GraphQL API."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    response = requests.post(
        "https://api.github.com/graphql",
        json={"query": query, "variables": variables},
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def get_repository_data(owner: str, token: str) -> Dict[str, Any]:
    """Fetch repository data using GitHub GraphQL API."""
    query = """
    query($owner: String!) {
      organization(login: $owner) {
        repositories(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
          totalCount
          nodes {
            name
            description
            url
            isPrivate
            createdAt
            updatedAt
            pushedAt
            stargazerCount
            forkCount
            watchers {
              totalCount
            }
            issues(states: OPEN) {
              totalCount
            }
            pullRequests(states: OPEN) {
              totalCount
            }
            primaryLanguage {
              name
            }
          }
        }
      }
    }
    """
    
    variables = {"owner": owner}
    result = query_github_graphql(query, variables, token)
    
    if "errors" in result:
        raise Exception(f"GraphQL errors: {result['errors']}")
    
    return result.get("data", {})


def format_repository_data(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Format repository data for output."""
    organization = data.get("organization", {})
    repositories = organization.get("repositories", {}).get("nodes", [])
    
    formatted_repos = []
    for repo in repositories:
        formatted_repo = {
            "name": repo.get("name"),
            "description": repo.get("description"),
            "url": repo.get("url"),
            "is_private": repo.get("isPrivate"),
            "created_at": repo.get("createdAt"),
            "updated_at": repo.get("updatedAt"),
            "pushed_at": repo.get("pushedAt"),
            "stargazer_count": repo.get("stargazerCount"),
            "fork_count": repo.get("forkCount"),
            "watchers_count": repo.get("watchers", {}).get("totalCount"),
            "open_issues_count": repo.get("issues", {}).get("totalCount"),
            "open_pull_requests_count": repo.get("pullRequests", {}).get("totalCount"),
            "primary_language": repo.get("primaryLanguage", {}).get("name") if repo.get("primaryLanguage") else None,
        }
        formatted_repos.append(formatted_repo)
    
    return formatted_repos


def generate_report(owner: str, token: str) -> Dict[str, Any]:
    """Generate repository report."""
    timestamp = datetime.now(timezone.utc).isoformat()
    
    print(f"Fetching repository data for {owner}...")
    data = get_repository_data(owner, token)
    
    repositories = format_repository_data(data)
    
    report = {
        "generated_at": timestamp,
        "owner": owner,
        "total_repositories": len(repositories),
        "repositories": repositories,
    }
    
    return report


def save_json_report(report: Dict[str, Any], filename: str = "repo_report.json") -> None:
    """Save report as JSON."""
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"JSON report saved to {filename}")


def save_csv_report(report: Dict[str, Any], filename: str = "repo_report.csv") -> None:
    """Save report as CSV."""
    repositories = report.get("repositories", [])
    
    if not repositories:
        print("No repositories to save to CSV")
        return
    
    fieldnames = [
        "name",
        "description",
        "url",
        "is_private",
        "created_at",
        "updated_at",
        "pushed_at",
        "stargazer_count",
        "fork_count",
        "watchers_count",
        "open_issues_count",
        "open_pull_requests_count",
        "primary_language",
    ]
    
    with open(filename, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(repositories)
    
    print(f"CSV report saved to {filename}")


def main() -> None:
    """Main entry point."""
    owner = os.environ.get("OWNER")
    token = os.environ.get("REPORT_TOKEN")
    
    if not owner:
        print("Error: OWNER environment variable is required")
        sys.exit(1)
    
    if not token:
        print("Error: REPORT_TOKEN environment variable is required")
        sys.exit(1)
    
    try:
        report = generate_report(owner, token)
        save_json_report(report)
        save_csv_report(report)
        
        print(f"\nReport generated successfully!")
        print(f"Total repositories: {report['total_repositories']}")
        
    except Exception as e:
        print(f"Error generating report: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
