#!/usr/bin/env python3
"""
Generate a repository report for a GitHub organization.

This script queries the GitHub GraphQL API to collect repository data
and generates JSON and CSV reports.
"""

import csv
import json
import os
import sys
import time
from typing import Any, Optional

import requests


def get_repositories(owner: str, token: Optional[str]) -> list[dict[str, Any]]:
    """
    Query GitHub GraphQL API to fetch all repositories for an owner.
    
    Args:
        owner: GitHub username or organization name
        token: GitHub personal access token (optional)
    
    Returns:
        List of repository dictionaries with collected fields
    """
    url = "https://api.github.com/graphql"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    repositories = []
    has_next_page = True
    end_cursor = None
    max_retries = 5
    
    query = """
    query($login: String!, $after: String) {
      repositoryOwner(login: $login) {
        repositories(first: 100, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            name
            nameWithOwner
            isPrivate
            visibility
            isArchived
            isTemplate
            isFork
            url
            description
            defaultBranchRef {
              name
            }
            createdAt
            updatedAt
            pushedAt
            stargazerCount
            forkCount
            diskUsage
            issues {
              totalCount
            }
            watchers {
              totalCount
            }
            repositoryTopics(first: 100) {
              nodes {
                topic {
                  name
                }
              }
            }
            licenseInfo {
              name
            }
            primaryLanguage {
              name
            }
            owner {
              login
            }
          }
        }
      }
    }
    """
    
    while has_next_page:
        variables = {"login": owner}
        if end_cursor:
            variables["after"] = end_cursor
        
        retry_count = 0
        while retry_count < max_retries:
            try:
                response = requests.post(
                    url,
                    json={"query": query, "variables": variables},
                    headers=headers,
                    timeout=30
                )
                
                # Handle transient HTTP errors
                if response.status_code in [502, 503, 504]:
                    retry_count += 1
                    wait_time = min(2 ** retry_count, 60)
                    print(f"HTTP {response.status_code} error. Retrying in {wait_time}s... (attempt {retry_count}/{max_retries})", file=sys.stderr)
                    time.sleep(wait_time)
                    continue
                
                # Handle rate limiting
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", "60"))
                    print(f"Rate limited. Waiting {retry_after}s...", file=sys.stderr)
                    time.sleep(retry_after)
                    retry_count += 1
                    continue
                
                # Handle unauthorized/forbidden
                if response.status_code in [401, 403]:
                    error_data = response.json()
                    error_msg = error_data.get("message", "Authentication failed")
                    print(f"Error: {error_msg}", file=sys.stderr)
                    if "rate limit" in error_msg.lower():
                        retry_count += 1
                        wait_time = min(2 ** retry_count, 60)
                        print(f"Rate limit detected. Retrying in {wait_time}s... (attempt {retry_count}/{max_retries})", file=sys.stderr)
                        time.sleep(wait_time)
                        continue
                    sys.exit(1)
                
                # Check for successful response
                if response.status_code != 200:
                    print(f"Error: HTTP {response.status_code}", file=sys.stderr)
                    print(response.text, file=sys.stderr)
                    sys.exit(1)
                
                data = response.json()
                
                # Check for GraphQL errors
                if "errors" in data:
                    errors = data["errors"]
                    error_msg = errors[0].get("message", "Unknown GraphQL error")
                    
                    # Handle secondary rate limit
                    if "secondary rate limit" in error_msg.lower() or "rate limit" in error_msg.lower():
                        retry_count += 1
                        wait_time = min(2 ** retry_count, 60)
                        print(f"GraphQL rate limit. Retrying in {wait_time}s... (attempt {retry_count}/{max_retries})", file=sys.stderr)
                        time.sleep(wait_time)
                        continue
                    
                    print(f"GraphQL Error: {error_msg}", file=sys.stderr)
                    sys.exit(1)
                
                # Extract repository data
                repo_owner = data.get("data", {}).get("repositoryOwner")
                if not repo_owner:
                    print(f"Error: Owner '{owner}' not found", file=sys.stderr)
                    sys.exit(1)
                
                repos_data = repo_owner.get("repositories", {})
                nodes = repos_data.get("nodes", [])
                
                for node in nodes:
                    repo = {
                        "name": node.get("name"),
                        "name_with_owner": node.get("nameWithOwner"),
                        "is_private": node.get("isPrivate"),
                        "visibility": node.get("visibility"),
                        "is_archived": node.get("isArchived"),
                        "is_template": node.get("isTemplate"),
                        "is_fork": node.get("isFork"),
                        "url": node.get("url"),
                        "description": node.get("description", ""),
                        "default_branch": node.get("defaultBranchRef", {}).get("name", "") if node.get("defaultBranchRef") else "",
                        "created_at": node.get("createdAt"),
                        "updated_at": node.get("updatedAt"),
                        "pushed_at": node.get("pushedAt"),
                        "stargazer_count": node.get("stargazerCount"),
                        "fork_count": node.get("forkCount"),
                        "disk_usage": node.get("diskUsage"),
                        "open_issues_count": node.get("issues", {}).get("totalCount"),
                        "watchers_count": node.get("watchers", {}).get("totalCount"),
                        "topics": [
                            t.get("topic", {}).get("name")
                            for t in node.get("repositoryTopics", {}).get("nodes", [])
                            if t.get("topic")
                        ],
                        "license": node.get("licenseInfo", {}).get("name", "") if node.get("licenseInfo") else "",
                        "primary_language": node.get("primaryLanguage", {}).get("name", "") if node.get("primaryLanguage") else "",
                        "owner": node.get("owner", {}).get("login", "")
                    }
                    repositories.append(repo)
                
                # Check pagination
                page_info = repos_data.get("pageInfo", {})
                has_next_page = page_info.get("hasNextPage", False)
                end_cursor = page_info.get("endCursor")
                
                print(f"Fetched {len(nodes)} repositories (total: {len(repositories)})", file=sys.stderr)
                break
                
            except requests.exceptions.Timeout:
                retry_count += 1
                wait_time = min(2 ** retry_count, 60)
                print(f"Request timeout. Retrying in {wait_time}s... (attempt {retry_count}/{max_retries})", file=sys.stderr)
                time.sleep(wait_time)
                
            except requests.exceptions.RequestException as e:
                retry_count += 1
                wait_time = min(2 ** retry_count, 60)
                print(f"Request error: {e}. Retrying in {wait_time}s... (attempt {retry_count}/{max_retries})", file=sys.stderr)
                time.sleep(wait_time)
        
        if retry_count >= max_retries:
            print(f"Error: Max retries ({max_retries}) exceeded", file=sys.stderr)
            sys.exit(1)
    
    return repositories


def write_json_report(repositories: list[dict[str, Any]], filename: str) -> None:
    """Write repository data to JSON file."""
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(repositories, f, indent=2, ensure_ascii=False)
    print(f"Wrote {len(repositories)} repositories to {filename}", file=sys.stderr)


def write_csv_report(repositories: list[dict[str, Any]], filename: str) -> None:
    """Write repository data to CSV file."""
    if not repositories:
        # Create empty CSV with headers
        with open(filename, "w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "name", "nameWithOwner", "isPrivate", "visibility", "isArchived",
                "isTemplate", "isFork", "url", "description", "defaultBranch",
                "createdAt", "updatedAt", "pushedAt", "stargazerCount", "forkCount",
                "diskUsage", "openIssuesCount", "watchersCount", "topics", "license",
                "primaryLanguage", "owner"
            ])
        return
    
    with open(filename, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        # Write header
        writer.writerow([
            "name", "nameWithOwner", "isPrivate", "visibility", "isArchived",
            "isTemplate", "isFork", "url", "description", "defaultBranch",
            "createdAt", "updatedAt", "pushedAt", "stargazerCount", "forkCount",
            "diskUsage", "openIssuesCount", "watchersCount", "topics", "license",
            "primaryLanguage", "owner"
        ])
        
        # Write data rows
        for repo in repositories:
            # Join topics with semicolon
            topics_str = ";".join(repo.get("topics", []))
            
            writer.writerow([
                repo.get("name", ""),
                repo.get("name_with_owner", ""),
                repo.get("is_private", ""),
                repo.get("visibility", ""),
                repo.get("is_archived", ""),
                repo.get("is_template", ""),
                repo.get("is_fork", ""),
                repo.get("url", ""),
                repo.get("description", ""),
                repo.get("default_branch", ""),
                repo.get("created_at", ""),
                repo.get("updated_at", ""),
                repo.get("pushed_at", ""),
                repo.get("stargazer_count", ""),
                repo.get("fork_count", ""),
                repo.get("disk_usage", ""),
                repo.get("open_issues_count", ""),
                repo.get("watchers_count", ""),
                topics_str,
                repo.get("license", ""),
                repo.get("primary_language", ""),
                repo.get("owner", "")
            ])
    
    print(f"Wrote {len(repositories)} repositories to {filename}", file=sys.stderr)


def main() -> None:
    """Main entry point."""
    owner = os.environ.get("OWNER")
    if not owner:
        print("Error: OWNER environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    token = os.environ.get("REPORT_TOKEN")
    if not token:
        print("Warning: REPORT_TOKEN not set. Only public repositories will be accessible.", file=sys.stderr)
    
    print(f"Fetching repositories for owner: {owner}", file=sys.stderr)
    repositories = get_repositories(owner, token)
    
    # Write reports
    write_json_report(repositories, "repo-report.json")
    write_csv_report(repositories, "repo-report.csv")
    
    print(f"Report generation complete. Total repositories: {len(repositories)}", file=sys.stderr)


if __name__ == "__main__":
    main()
