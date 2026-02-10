#!/usr/bin/env python3
"""
Generate repository report for a GitHub owner using GraphQL API.

This script queries the GitHub GraphQL API to collect repository information
and generates both JSON and CSV reports.
"""

import os
import sys
import json
import csv
import time
from typing import Dict, List, Optional, Any
import requests


def make_graphql_request(
    query: str,
    variables: Dict[str, Any],
    token: Optional[str] = None,
    max_retries: int = 5
) -> Dict[str, Any]:
    """
    Make a GraphQL request to GitHub API with retry logic.
    
    Args:
        query: GraphQL query string
        variables: Query variables
        token: GitHub personal access token (optional)
        max_retries: Maximum number of retry attempts
        
    Returns:
        JSON response from the API
        
    Raises:
        SystemExit: On fatal errors after all retries exhausted
    """
    url = "https://api.github.com/graphql"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    retry_count = 0
    backoff_seconds = 1
    
    while retry_count < max_retries:
        try:
            response = requests.post(
                url,
                json={"query": query, "variables": variables},
                headers=headers,
                timeout=30
            )
            
            # Handle rate limiting
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", backoff_seconds))
                print(f"Rate limited. Waiting {retry_after} seconds...", file=sys.stderr)
                time.sleep(retry_after)
                retry_count += 1
                backoff_seconds = min(backoff_seconds * 2, 60)
                continue
            
            # Handle transient errors (502, 503, 504)
            if response.status_code in [502, 503, 504]:
                print(f"Transient error {response.status_code}. Retrying in {backoff_seconds}s...", file=sys.stderr)
                time.sleep(backoff_seconds)
                retry_count += 1
                backoff_seconds = min(backoff_seconds * 2, 60)
                continue
            
            # Handle other HTTP errors
            if response.status_code != 200:
                print(f"HTTP error {response.status_code}: {response.text}", file=sys.stderr)
                sys.exit(1)
            
            result = response.json()
            
            # Check for GraphQL errors
            if "errors" in result:
                errors = result["errors"]
                # Check if it's a rate limit error in GraphQL response
                for error in errors:
                    if "rate limit" in str(error).lower():
                        print(f"GraphQL rate limit error. Waiting {backoff_seconds}s...", file=sys.stderr)
                        time.sleep(backoff_seconds)
                        retry_count += 1
                        backoff_seconds = min(backoff_seconds * 2, 60)
                        break
                else:
                    # Non-rate-limit GraphQL error
                    print(f"GraphQL errors: {json.dumps(errors, indent=2)}", file=sys.stderr)
                    sys.exit(1)
                continue
            
            return result
            
        except requests.exceptions.Timeout:
            print(f"Request timeout. Retrying in {backoff_seconds}s...", file=sys.stderr)
            time.sleep(backoff_seconds)
            retry_count += 1
            backoff_seconds = min(backoff_seconds * 2, 60)
            
        except requests.exceptions.RequestException as e:
            print(f"Request exception: {e}", file=sys.stderr)
            sys.exit(1)
    
    print(f"Max retries ({max_retries}) exceeded", file=sys.stderr)
    sys.exit(1)


def fetch_repositories(owner: str, token: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch all repositories for a given owner using GraphQL pagination.
    
    Args:
        owner: GitHub username or organization name
        token: GitHub personal access token (optional)
        
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
    has_next_page = True
    after_cursor = None
    
    while has_next_page:
        variables = {"login": owner}
        if after_cursor:
            variables["after"] = after_cursor
        
        print(f"Fetching repositories (cursor: {after_cursor})...", file=sys.stderr)
        result = make_graphql_request(query, variables, token)
        
        repository_owner = result.get("data", {}).get("repositoryOwner")
        if not repository_owner:
            print(f"No repository owner found for login: {owner}", file=sys.stderr)
            sys.exit(1)
        
        repos_data = repository_owner.get("repositories", {})
        nodes = repos_data.get("nodes", [])
        page_info = repos_data.get("pageInfo", {})
        
        repositories.extend(nodes)
        
        has_next_page = page_info.get("hasNextPage", False)
        after_cursor = page_info.get("endCursor")
        
        print(f"Fetched {len(nodes)} repositories. Total: {len(repositories)}", file=sys.stderr)
    
    return repositories


def transform_repository_data(repo: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform raw repository data into the desired format.
    
    Args:
        repo: Raw repository data from GraphQL
        
    Returns:
        Transformed repository data
    """
    # Extract topic names
    topics = []
    repo_topics = repo.get("repositoryTopics", {}).get("nodes", [])
    for topic_node in repo_topics:
        topic = topic_node.get("topic", {})
        if topic and "name" in topic:
            topics.append(topic["name"])
    
    # Extract default branch name
    default_branch = None
    if repo.get("defaultBranchRef"):
        default_branch = repo["defaultBranchRef"].get("name")
    
    # Extract license name
    license_name = None
    if repo.get("licenseInfo"):
        license_name = repo["licenseInfo"].get("name")
    
    # Extract primary language
    primary_language = None
    if repo.get("primaryLanguage"):
        primary_language = repo["primaryLanguage"].get("name")
    
    # Extract owner login
    owner_login = None
    if repo.get("owner"):
        owner_login = repo["owner"].get("login")
    
    return {
        "name": repo.get("name"),
        "nameWithOwner": repo.get("nameWithOwner"),
        "isPrivate": repo.get("isPrivate"),
        "visibility": repo.get("visibility"),
        "isArchived": repo.get("isArchived"),
        "isTemplate": repo.get("isTemplate"),
        "isFork": repo.get("isFork"),
        "url": repo.get("url"),
        "description": repo.get("description"),
        "defaultBranch": default_branch,
        "createdAt": repo.get("createdAt"),
        "updatedAt": repo.get("updatedAt"),
        "pushedAt": repo.get("pushedAt"),
        "stargazerCount": repo.get("stargazerCount"),
        "forkCount": repo.get("forkCount"),
        "diskUsage": repo.get("diskUsage"),
        "openIssuesCount": repo.get("issues", {}).get("totalCount"),
        "watchersCount": repo.get("watchers", {}).get("totalCount"),
        "topics": topics,
        "license": license_name,
        "primaryLanguage": primary_language,
        "owner": owner_login,
    }


def write_json_report(repositories: List[Dict[str, Any]], filename: str) -> None:
    """Write repository data to JSON file."""
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(repositories, f, indent=2, ensure_ascii=False)
    print(f"JSON report written to {filename}", file=sys.stderr)


def write_csv_report(repositories: List[Dict[str, Any]], filename: str) -> None:
    """Write repository data to CSV file."""
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
            # Convert topics list to semicolon-delimited string
            csv_repo = repo.copy()
            if isinstance(csv_repo.get("topics"), list):
                csv_repo["topics"] = ";".join(csv_repo["topics"])
            writer.writerow(csv_repo)
    
    print(f"CSV report written to {filename}", file=sys.stderr)


def main() -> None:
    """Main entry point for the script."""
    owner = os.environ.get("OWNER")
    if not owner:
        print("ERROR: OWNER environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    token = os.environ.get("REPORT_TOKEN")
    if not token:
        print("WARNING: REPORT_TOKEN not set. Using unauthenticated requests (public repos only).", file=sys.stderr)
    
    print(f"Generating repository report for owner: {owner}", file=sys.stderr)
    
    # Fetch all repositories
    repositories = fetch_repositories(owner, token)
    
    print(f"Total repositories fetched: {len(repositories)}", file=sys.stderr)
    
    # Transform data
    transformed_repos = [transform_repository_data(repo) for repo in repositories]
    
    # Write reports
    write_json_report(transformed_repos, "repo-report.json")
    write_csv_report(transformed_repos, "repo-report.csv")
    
    print("Report generation complete!", file=sys.stderr)


if __name__ == "__main__":
    main()
