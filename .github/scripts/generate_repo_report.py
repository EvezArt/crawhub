#!/usr/bin/env python3
"""
Generate repository report for a GitHub owner.

Queries GitHub GraphQL API to fetch all repositories for the specified owner,
including support for private repositories when authenticated with a token.
Outputs both JSON and CSV reports.
"""

import os
import sys
import json
import csv
import time
import requests
from typing import Dict, List, Any, Optional


GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"
OWNER = os.environ.get("OWNER", "")
REPORT_TOKEN = os.environ.get("REPORT_TOKEN", "")

# Retry configuration for transient errors
MAX_RETRIES = 5
INITIAL_BACKOFF = 1  # seconds
MAX_BACKOFF = 60  # seconds


def make_graphql_request(query: str, variables: Dict[str, Any], retry_count: int = 0) -> Dict[str, Any]:
    """
    Execute a GraphQL query with retry logic for transient errors.
    
    Args:
        query: GraphQL query string
        variables: Query variables
        retry_count: Current retry attempt number
        
    Returns:
        Response data dictionary
        
    Raises:
        SystemExit: On fatal errors after exhausting retries
    """
    headers = {"Content-Type": "application/json"}
    if REPORT_TOKEN:
        headers["Authorization"] = f"Bearer {REPORT_TOKEN}"
    
    try:
        response = requests.post(
            GITHUB_GRAPHQL_URL,
            json={"query": query, "variables": variables},
            headers=headers,
            timeout=30
        )
        
        # Handle HTTP errors with retry for transient issues
        if response.status_code in (502, 503, 504):
            if retry_count < MAX_RETRIES:
                backoff = min(INITIAL_BACKOFF * (2 ** retry_count), MAX_BACKOFF)
                print(f"HTTP {response.status_code} error. Retrying in {backoff}s... (attempt {retry_count + 1}/{MAX_RETRIES})", file=sys.stderr)
                time.sleep(backoff)
                return make_graphql_request(query, variables, retry_count + 1)
            else:
                print(f"Fatal: HTTP {response.status_code} after {MAX_RETRIES} retries", file=sys.stderr)
                sys.exit(1)
        
        # Handle rate limiting
        if response.status_code == 403:
            # Check if it's a rate limit issue
            remaining = response.headers.get("X-RateLimit-Remaining", "0")
            if remaining == "0":
                reset_time = int(response.headers.get("X-RateLimit-Reset", "0"))
                if reset_time > 0:
                    wait_time = max(reset_time - time.time(), 0) + 5
                    if retry_count < MAX_RETRIES and wait_time < 3600:  # Don't wait more than 1 hour
                        print(f"Rate limit exceeded. Waiting {wait_time:.0f}s... (attempt {retry_count + 1}/{MAX_RETRIES})", file=sys.stderr)
                        time.sleep(wait_time)
                        return make_graphql_request(query, variables, retry_count + 1)
            print(f"Fatal: HTTP 403 Forbidden - {response.text}", file=sys.stderr)
            sys.exit(1)
        
        if response.status_code == 401:
            print("Fatal: HTTP 401 Unauthorized - Check REPORT_TOKEN", file=sys.stderr)
            sys.exit(1)
        
        response.raise_for_status()
        
        data = response.json()
        
        # Handle GraphQL errors
        if "errors" in data:
            errors = data["errors"]
            # Check for rate limit errors in GraphQL response
            for error in errors:
                error_type = error.get("type", "")
                if error_type in ("RATE_LIMITED", "SECONDARY_RATE_LIMITED"):
                    if retry_count < MAX_RETRIES:
                        backoff = min(INITIAL_BACKOFF * (2 ** retry_count), MAX_BACKOFF)
                        print(f"GraphQL rate limit. Retrying in {backoff}s... (attempt {retry_count + 1}/{MAX_RETRIES})", file=sys.stderr)
                        time.sleep(backoff)
                        return make_graphql_request(query, variables, retry_count + 1)
            
            print(f"Fatal: GraphQL errors: {json.dumps(errors, indent=2)}", file=sys.stderr)
            sys.exit(1)
        
        return data
        
    except requests.exceptions.Timeout:
        if retry_count < MAX_RETRIES:
            backoff = min(INITIAL_BACKOFF * (2 ** retry_count), MAX_BACKOFF)
            print(f"Request timeout. Retrying in {backoff}s... (attempt {retry_count + 1}/{MAX_RETRIES})", file=sys.stderr)
            time.sleep(backoff)
            return make_graphql_request(query, variables, retry_count + 1)
        else:
            print(f"Fatal: Request timeout after {MAX_RETRIES} retries", file=sys.stderr)
            sys.exit(1)
    
    except requests.exceptions.RequestException as e:
        print(f"Fatal: Request error: {e}", file=sys.stderr)
        sys.exit(1)


def fetch_repositories(owner: str) -> List[Dict[str, Any]]:
    """
    Fetch all repositories for the specified owner using pagination.
    
    Args:
        owner: GitHub username or organization name
        
    Returns:
        List of repository data dictionaries
    """
    query = """
    query($owner: String!, $after: String) {
      repositoryOwner(login: $owner) {
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
    
    repositories = []
    has_next_page = True
    after_cursor = None
    page_count = 0
    
    while has_next_page:
        page_count += 1
        print(f"Fetching page {page_count}...", file=sys.stderr)
        
        variables = {"owner": owner, "after": after_cursor}
        data = make_graphql_request(query, variables)
        
        repository_owner = data.get("data", {}).get("repositoryOwner")
        if not repository_owner:
            print(f"Warning: No repositoryOwner found for '{owner}'", file=sys.stderr)
            break
        
        repos_data = repository_owner.get("repositories", {})
        nodes = repos_data.get("nodes", [])
        page_info = repos_data.get("pageInfo", {})
        
        repositories.extend(nodes)
        
        has_next_page = page_info.get("hasNextPage", False)
        after_cursor = page_info.get("endCursor")
    
    print(f"Fetched {len(repositories)} repositories total", file=sys.stderr)
    return repositories


def transform_repository_data(repo: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform raw repository data to simplified format.
    
    Args:
        repo: Raw repository data from GraphQL
        
    Returns:
        Transformed repository data dictionary
    """
    # Extract default branch name
    default_branch = None
    if repo.get("defaultBranchRef"):
        default_branch = repo["defaultBranchRef"].get("name")
    
    # Extract topics
    topics = []
    if repo.get("repositoryTopics"):
        for topic_node in repo["repositoryTopics"].get("nodes", []):
            if topic_node.get("topic"):
                topics.append(topic_node["topic"].get("name", ""))
    
    # Extract license name
    license_name = None
    if repo.get("licenseInfo"):
        license_name = repo["licenseInfo"].get("name")
    
    # Extract primary language
    primary_language = None
    if repo.get("primaryLanguage"):
        primary_language = repo["primaryLanguage"].get("name")
    
    # Extract issue count
    open_issues_count = 0
    if repo.get("issues"):
        open_issues_count = repo["issues"].get("totalCount", 0)
    
    # Extract watchers count
    watchers_count = 0
    if repo.get("watchers"):
        watchers_count = repo["watchers"].get("totalCount", 0)
    
    # Extract owner login
    owner = ""
    if repo.get("owner"):
        owner = repo["owner"].get("login", "")
    
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
        "defaultBranch": default_branch,
        "createdAt": repo.get("createdAt", ""),
        "updatedAt": repo.get("updatedAt", ""),
        "pushedAt": repo.get("pushedAt", ""),
        "stargazerCount": repo.get("stargazerCount", 0),
        "forkCount": repo.get("forkCount", 0),
        "diskUsage": repo.get("diskUsage", 0),
        "openIssuesCount": open_issues_count,
        "watchersCount": watchers_count,
        "topics": topics,
        "license": license_name,
        "primaryLanguage": primary_language,
        "owner": owner,
    }


def write_json_report(repositories: List[Dict[str, Any]], filename: str) -> None:
    """Write repository data to JSON file."""
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(repositories, f, indent=2, ensure_ascii=False)
    print(f"Wrote {filename}", file=sys.stderr)


def write_csv_report(repositories: List[Dict[str, Any]], filename: str) -> None:
    """Write repository data to CSV file."""
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
            # Convert topics list to semicolon-delimited string
            row = repo.copy()
            row["topics"] = ";".join(row["topics"]) if row["topics"] else ""
            writer.writerow(row)
    
    print(f"Wrote {filename}", file=sys.stderr)


def main():
    """Main entry point."""
    if not OWNER:
        print("Fatal: OWNER environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    print(f"Generating repository report for owner: {OWNER}", file=sys.stderr)
    if REPORT_TOKEN:
        print("Using authenticated requests (REPORT_TOKEN is set)", file=sys.stderr)
    else:
        print("Using unauthenticated requests (REPORT_TOKEN not set - will only see public repos)", file=sys.stderr)
    
    # Fetch repositories
    raw_repositories = fetch_repositories(OWNER)
    
    # Transform data
    repositories = [transform_repository_data(repo) for repo in raw_repositories]
    
    # Write reports
    write_json_report(repositories, "repo-report.json")
    write_csv_report(repositories, "repo-report.csv")
    
    print("Report generation complete", file=sys.stderr)


if __name__ == "__main__":
    main()
