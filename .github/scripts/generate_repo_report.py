#!/usr/bin/env python3
"""
GitHub Repository Report Generator

This script fetches repository information for a GitHub organization using the GraphQL API.
It collects comprehensive data including metadata, statistics, and relationships for all
repositories owned by the specified organization.

Authentication:
- Uses REPORT_TOKEN environment variable as Bearer token when set
- Falls back to unauthenticated requests for public repositories only
- For private repository access, REPORT_TOKEN must be a Personal Access Token with 'repo' scope

Output:
- repo-report.json: Array of repository objects with full metadata
- repo-report.csv: Flattened CSV format with semicolon-delimited topics
"""

import os
import sys
import json
import csv
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import requests

# Configuration
GRAPHQL_ENDPOINT = "https://api.github.com/graphql"
OWNER = os.environ.get("OWNER", "")
REPORT_TOKEN = os.environ.get("REPORT_TOKEN", "")

# Retry configuration for transient errors
MAX_RETRIES = 5
INITIAL_BACKOFF = 1  # seconds
MAX_BACKOFF = 60  # seconds


def get_headers() -> Dict[str, str]:
    """Build request headers with authentication if token is available."""
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if REPORT_TOKEN:
        headers["Authorization"] = f"Bearer {REPORT_TOKEN}"
    return headers


def should_retry(status_code: int, response_data: Optional[Dict[str, Any]]) -> bool:
    """Determine if request should be retried based on status code and response."""
    # Retry on transient HTTP errors
    if status_code in [502, 503, 504]:
        return True
    
    # Check for GraphQL rate limit errors
    if response_data and "errors" in response_data:
        for error in response_data["errors"]:
            error_type = error.get("type", "")
            # Secondary rate limit or other transient GraphQL errors
            if error_type in ["RATE_LIMITED", "SECONDARY_RATE_LIMITED"]:
                return True
    
    return False


def execute_graphql_query(query: str, variables: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute GraphQL query with retry logic for transient errors.
    
    Args:
        query: GraphQL query string
        variables: Query variables
        
    Returns:
        Response data dictionary
        
    Raises:
        SystemExit: On fatal errors after all retries exhausted
    """
    backoff = INITIAL_BACKOFF
    
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(
                GRAPHQL_ENDPOINT,
                headers=get_headers(),
                json={"query": query, "variables": variables},
                timeout=30
            )
            
            # Handle HTTP errors
            if response.status_code not in [200, 400, 401, 403, 404]:
                if should_retry(response.status_code, None):
                    print(f"Transient HTTP error {response.status_code}, retrying in {backoff}s... (attempt {attempt + 1}/{MAX_RETRIES})", file=sys.stderr)
                    time.sleep(backoff)
                    backoff = min(backoff * 2, MAX_BACKOFF)
                    continue
                else:
                    print(f"Fatal HTTP error {response.status_code}: {response.text}", file=sys.stderr)
                    sys.exit(1)
            
            # Parse response
            try:
                data = response.json()
            except json.JSONDecodeError as e:
                print(f"Failed to parse JSON response: {e}", file=sys.stderr)
                sys.exit(1)
            
            # Check for GraphQL errors
            if "errors" in data:
                if should_retry(response.status_code, data):
                    retry_after = response.headers.get("Retry-After", backoff)
                    wait_time = int(retry_after) if isinstance(retry_after, (int, str)) and str(retry_after).isdigit() else backoff
                    print(f"GraphQL rate limit or transient error, retrying in {wait_time}s... (attempt {attempt + 1}/{MAX_RETRIES})", file=sys.stderr)
                    time.sleep(wait_time)
                    backoff = min(backoff * 2, MAX_BACKOFF)
                    continue
                else:
                    # Fatal GraphQL error
                    print(f"Fatal GraphQL error: {json.dumps(data['errors'], indent=2)}", file=sys.stderr)
                    sys.exit(1)
            
            # Success
            return data
            
        except requests.exceptions.Timeout:
            print(f"Request timeout, retrying in {backoff}s... (attempt {attempt + 1}/{MAX_RETRIES})", file=sys.stderr)
            time.sleep(backoff)
            backoff = min(backoff * 2, MAX_BACKOFF)
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}, retrying in {backoff}s... (attempt {attempt + 1}/{MAX_RETRIES})", file=sys.stderr)
            time.sleep(backoff)
            backoff = min(backoff * 2, MAX_BACKOFF)
    
    # All retries exhausted
    print(f"Failed after {MAX_RETRIES} attempts", file=sys.stderr)
    sys.exit(1)


def fetch_repositories(owner: str) -> List[Dict[str, Any]]:
    """
    Fetch all repositories for the specified owner using GraphQL pagination.
    
    Args:
        owner: GitHub organization or user login
        
    Returns:
        List of repository data dictionaries
    """
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
    
    print(f"Fetching repositories for owner: {owner}", file=sys.stderr)
    
    while has_next_page:
        variables = {"login": owner, "after": after}
        response = execute_graphql_query(query, variables)
        
        # Extract data
        if "data" not in response or not response["data"]:
            print("No data in response", file=sys.stderr)
            sys.exit(1)
        
        repository_owner = response["data"].get("repositoryOwner")
        if not repository_owner:
            print(f"Owner '{owner}' not found", file=sys.stderr)
            sys.exit(1)
        
        repos = repository_owner["repositories"]
        nodes = repos.get("nodes", [])
        page_info = repos.get("pageInfo", {})
        
        print(f"Fetched {len(nodes)} repositories (total so far: {len(repositories) + len(nodes)})", file=sys.stderr)
        
        repositories.extend(nodes)
        
        has_next_page = page_info.get("hasNextPage", False)
        after = page_info.get("endCursor")
    
    print(f"Total repositories fetched: {len(repositories)}", file=sys.stderr)
    return repositories


def transform_repository_data(repo: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform repository data from GraphQL format to output format.
    Uses snake_case for all field names following Python conventions.
    
    Args:
        repo: Raw repository data from GraphQL
        
    Returns:
        Transformed repository data dictionary
    """
    # Extract topics
    topics = []
    if repo.get("repositoryTopics") and repo["repositoryTopics"].get("nodes"):
        topics = [node["topic"]["name"] for node in repo["repositoryTopics"]["nodes"] if node.get("topic")]
    
    # Extract default branch
    default_branch = ""
    if repo.get("defaultBranchRef"):
        default_branch = repo["defaultBranchRef"].get("name", "")
    
    # Extract license
    license_name = ""
    if repo.get("licenseInfo"):
        license_name = repo["licenseInfo"].get("name", "")
    
    # Extract primary language
    primary_language = ""
    if repo.get("primaryLanguage"):
        primary_language = repo["primaryLanguage"].get("name", "")
    
    # Extract owner
    owner = ""
    if repo.get("owner"):
        owner = repo["owner"].get("login", "")
    
    # Extract open issues count
    open_issues_count = 0
    if repo.get("issues"):
        open_issues_count = repo["issues"].get("totalCount", 0)
    
    # Extract watchers count
    watchers_count = 0
    if repo.get("watchers"):
        watchers_count = repo["watchers"].get("totalCount", 0)
    
    return {
        "name": repo.get("name", ""),
        "name_with_owner": repo.get("nameWithOwner", ""),
        "is_private": repo.get("isPrivate", False),
        "visibility": repo.get("visibility", ""),
        "is_archived": repo.get("isArchived", False),
        "is_template": repo.get("isTemplate", False),
        "is_fork": repo.get("isFork", False),
        "url": repo.get("url", ""),
        "description": repo.get("description", ""),
        "default_branch": default_branch,
        "created_at": repo.get("createdAt", ""),
        "updated_at": repo.get("updatedAt", ""),
        "pushed_at": repo.get("pushedAt", ""),
        "stargazer_count": repo.get("stargazerCount", 0),
        "fork_count": repo.get("forkCount", 0),
        "disk_usage": repo.get("diskUsage", 0),
        "open_issues_count": open_issues_count,
        "watchers_count": watchers_count,
        "topics": topics,
        "license": license_name,
        "primary_language": primary_language,
        "owner": owner,
    }


def write_json_report(repositories: List[Dict[str, Any]], filename: str = "repo-report.json"):
    """Write repository data to JSON file."""
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(repositories, f, indent=2, ensure_ascii=False)
    print(f"JSON report written to {filename}", file=sys.stderr)


def write_csv_report(repositories: List[Dict[str, Any]], filename: str = "repo-report.csv"):
    """
    Write repository data to CSV file with semicolon-delimited topics.
    
    Args:
        repositories: List of repository data dictionaries
        filename: Output CSV filename
    """
    if not repositories:
        print("No repositories to write to CSV", file=sys.stderr)
        return
    
    # Define CSV field order
    fieldnames = [
        "name",
        "name_with_owner",
        "is_private",
        "visibility",
        "is_archived",
        "is_template",
        "is_fork",
        "url",
        "description",
        "default_branch",
        "created_at",
        "updated_at",
        "pushed_at",
        "stargazer_count",
        "fork_count",
        "disk_usage",
        "open_issues_count",
        "watchers_count",
        "topics",
        "license",
        "primary_language",
        "owner",
    ]
    
    with open(filename, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for repo in repositories:
            # Convert topics list to semicolon-delimited string
            row = repo.copy()
            if isinstance(row.get("topics"), list):
                row["topics"] = ";".join(row["topics"])
            writer.writerow(row)
    
    print(f"CSV report written to {filename}", file=sys.stderr)


def main():
    """Main execution function."""
    if not OWNER:
        print("Error: OWNER environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    print(f"Starting repository report generation at {datetime.now(timezone.utc).isoformat()}", file=sys.stderr)
    print(f"Owner: {OWNER}", file=sys.stderr)
    print(f"Authentication: {'Enabled (using REPORT_TOKEN)' if REPORT_TOKEN else 'Disabled (public repos only)'}", file=sys.stderr)
    
    # Fetch repositories
    repositories = fetch_repositories(OWNER)
    
    # Transform data
    transformed_repos = [transform_repository_data(repo) for repo in repositories]
    
    # Write outputs
    write_json_report(transformed_repos)
    write_csv_report(transformed_repos)
    
    print(f"Report generation completed at {datetime.now(timezone.utc).isoformat()}", file=sys.stderr)
    print(f"Successfully processed {len(transformed_repos)} repositories", file=sys.stderr)


if __name__ == "__main__":
    main()
