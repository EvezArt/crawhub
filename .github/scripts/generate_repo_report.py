#!/usr/bin/env python3
"""
Generate repository report for a GitHub organization/user.

Fetches all repositories using GitHub GraphQL API with pagination,
implements retry logic for transient errors, and outputs JSON and CSV reports.
"""

import csv
import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests


def get_auth_header() -> Dict[str, str]:
    """Get authentication header if REPORT_TOKEN is set."""
    token = os.environ.get("REPORT_TOKEN", "")
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}


def retry_with_backoff(
    func, max_retries: int = 5, initial_delay: float = 1.0
) -> Any:
    """
    Retry a function with exponential backoff for transient errors.
    
    Handles HTTP 502/503/504 and GraphQL rate limit errors.
    """
    delay = initial_delay
    
    for attempt in range(max_retries):
        try:
            result = func()
            
            # Check for GraphQL errors
            if isinstance(result, dict) and "errors" in result:
                errors = result["errors"]
                
                # Check if any error is a rate limit error
                rate_limit_error = False
                for error in errors:
                    error_type = error.get("type", "")
                    message = error.get("message", "")
                    
                    if "RATE_LIMITED" in error_type or "rate limit" in message.lower():
                        rate_limit_error = True
                        break
                
                if rate_limit_error:
                    if attempt < max_retries - 1:
                        print(
                            f"Rate limit error, retrying in {delay:.1f}s "
                            f"(attempt {attempt + 1}/{max_retries})",
                            file=sys.stderr
                        )
                        time.sleep(delay)
                        delay *= 2
                        continue
                    else:
                        print("Max retries reached for rate limit error", file=sys.stderr)
                        sys.exit(1)
                
                # For other GraphQL errors, fail immediately
                print(f"GraphQL errors: {json.dumps(errors, indent=2)}", file=sys.stderr)
                sys.exit(1)
            
            return result
            
        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code if e.response else 0
            
            # Retry on transient HTTP errors
            if status_code in [502, 503, 504]:
                if attempt < max_retries - 1:
                    print(
                        f"HTTP {status_code} error, retrying in {delay:.1f}s "
                        f"(attempt {attempt + 1}/{max_retries})",
                        file=sys.stderr
                    )
                    time.sleep(delay)
                    delay *= 2
                    continue
            
            # For other HTTP errors, fail immediately
            print(f"HTTP error: {e}", file=sys.stderr)
            sys.exit(1)
            
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}", file=sys.stderr)
            sys.exit(1)
    
    print("Max retries reached", file=sys.stderr)
    sys.exit(1)


def fetch_repositories(owner: str) -> List[Dict[str, Any]]:
    """
    Fetch all repositories for a given owner using GraphQL API with pagination.
    """
    endpoint = "https://api.github.com/graphql"
    headers = {
        "Content-Type": "application/json",
        **get_auth_header()
    }
    
    query = """
    query($login: String!, $after: String) {
      repositoryOwner(login: $login) {
        repositories(first: 100, after: $after) {
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
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
    """
    
    repositories = []
    after = None
    has_next_page = True
    
    while has_next_page:
        variables = {"login": owner, "after": after}
        
        def make_request():
            response = requests.post(
                endpoint,
                headers=headers,
                json={"query": query, "variables": variables},
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        
        data = retry_with_backoff(make_request)
        
        if "data" not in data or not data["data"]:
            print(f"No data returned for owner: {owner}", file=sys.stderr)
            sys.exit(1)
        
        repo_owner = data["data"].get("repositoryOwner")
        if not repo_owner:
            print(f"Owner not found: {owner}", file=sys.stderr)
            sys.exit(1)
        
        repos = repo_owner["repositories"]
        repositories.extend(repos["nodes"])
        
        page_info = repos["pageInfo"]
        has_next_page = page_info["hasNextPage"]
        after = page_info["endCursor"]
        
        print(f"Fetched {len(repositories)} repositories so far...", file=sys.stderr)
    
    return repositories


def process_repository(repo: Dict[str, Any]) -> Dict[str, Any]:
    """Process a repository node and extract required fields."""
    topics = [
        node["topic"]["name"]
        for node in repo.get("repositoryTopics", {}).get("nodes", [])
    ]
    
    return {
        "name": repo.get("name", ""),
        "nameWithOwner": repo.get("nameWithOwner", ""),
        "isPrivate": repo.get("isPrivate", False),
        "visibility": repo.get("visibility", ""),
        "isArchived": repo.get("isArchived", False),
        "isTemplate": repo.get("isTemplate", False),
        "isFork": repo.get("isFork", False),
        "url": repo.get("url", ""),
        "description": repo.get("description", ""),
        "defaultBranch": repo.get("defaultBranchRef", {}).get("name", ""),
        "createdAt": repo.get("createdAt", ""),
        "updatedAt": repo.get("updatedAt", ""),
        "pushedAt": repo.get("pushedAt", ""),
        "stargazerCount": repo.get("stargazerCount", 0),
        "forkCount": repo.get("forkCount", 0),
        "diskUsage": repo.get("diskUsage", 0),
        "openIssuesCount": repo.get("issues", {}).get("totalCount", 0),
        "watchersCount": repo.get("watchers", {}).get("totalCount", 0),
        "topics": topics,
        "license": repo.get("licenseInfo", {}).get("name", ""),
        "primaryLanguage": repo.get("primaryLanguage", {}).get("name", ""),
        "owner": repo.get("owner", {}).get("login", ""),
    }


def write_json_report(repositories: List[Dict[str, Any]], filename: str) -> None:
    """Write repositories to JSON file."""
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(repositories, f, indent=2, ensure_ascii=False)
    print(f"Wrote JSON report to {filename}", file=sys.stderr)


def write_csv_report(repositories: List[Dict[str, Any]], filename: str) -> None:
    """Write repositories to CSV file."""
    if not repositories:
        print("No repositories to write to CSV", file=sys.stderr)
        return
    
    fieldnames = [
        "name",
        "nameWithOwner",
        "isPrivate",
        "visibility",
        "isArchived",
        "isTemplate",
        "isFork",
        "url",
        "description",
        "defaultBranch",
        "createdAt",
        "updatedAt",
        "pushedAt",
        "stargazerCount",
        "forkCount",
        "diskUsage",
        "openIssuesCount",
        "watchersCount",
        "topics",
        "license",
        "primaryLanguage",
        "owner",
    ]
    
    with open(filename, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for repo in repositories:
            # Convert topics list to semicolon-delimited string for CSV
            row = repo.copy()
            row["topics"] = ";".join(row["topics"])
            writer.writerow(row)
    
    print(f"Wrote CSV report to {filename}", file=sys.stderr)


def main():
    """Main entry point."""
    owner = os.environ.get("OWNER", "")
    
    if not owner:
        print("ERROR: OWNER environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    print(f"Fetching repositories for owner: {owner}", file=sys.stderr)
    print(f"Using authentication: {'Yes' if os.environ.get('REPORT_TOKEN') else 'No (public repos only)'}", file=sys.stderr)
    
    raw_repositories = fetch_repositories(owner)
    repositories = [process_repository(repo) for repo in raw_repositories]
    
    print(f"Total repositories fetched: {len(repositories)}", file=sys.stderr)
    
    write_json_report(repositories, "repo-report.json")
    write_csv_report(repositories, "repo-report.csv")
    
    print("Report generation completed successfully", file=sys.stderr)


if __name__ == "__main__":
    main()
