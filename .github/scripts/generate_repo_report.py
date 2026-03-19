#!/usr/bin/env python3
"""
Generate repository report for a GitHub organization using GraphQL API.
Fetches all repositories (public and private if REPORT_TOKEN is set) and generates JSON and CSV reports.
"""

import os
import sys
import json
import csv
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

try:
    import requests
except ImportError:
    print("Error: requests module not found. Install with: pip install requests", file=sys.stderr)
    sys.exit(1)


GRAPHQL_URL = "https://api.github.com/graphql"
OWNER = os.environ.get("OWNER", "")
REPORT_TOKEN = os.environ.get("REPORT_TOKEN", "")

# Retry configuration
MAX_RETRIES = 5
INITIAL_BACKOFF = 1  # seconds
BACKOFF_MULTIPLIER = 2


def make_graphql_request(query: str, variables: Dict[str, Any], retry_count: int = 0) -> Dict[str, Any]:
    """
    Make a GraphQL request with retry logic for transient errors.
    """
    headers = {"Content-Type": "application/json"}
    
    if REPORT_TOKEN:
        headers["Authorization"] = f"Bearer {REPORT_TOKEN}"
    
    try:
        response = requests.post(
            GRAPHQL_URL,
            json={"query": query, "variables": variables},
            headers=headers,
            timeout=30
        )
        
        # Handle transient HTTP errors with exponential backoff
        if response.status_code in [502, 503, 504]:
            if retry_count < MAX_RETRIES:
                wait_time = INITIAL_BACKOFF * (BACKOFF_MULTIPLIER ** retry_count)
                print(f"HTTP {response.status_code} error. Retrying in {wait_time}s... (attempt {retry_count + 1}/{MAX_RETRIES})", file=sys.stderr)
                time.sleep(wait_time)
                return make_graphql_request(query, variables, retry_count + 1)
            else:
                print(f"Error: Max retries exceeded for HTTP {response.status_code}", file=sys.stderr)
                sys.exit(1)
        
        # Handle other 4xx errors as fatal
        if 400 <= response.status_code < 500:
            print(f"Error: HTTP {response.status_code} - {response.text}", file=sys.stderr)
            sys.exit(1)
        
        response.raise_for_status()
        
        data = response.json()
        
        # Check for GraphQL errors
        if "errors" in data:
            errors = data["errors"]
            # Check for rate limit errors
            for error in errors:
                error_type = error.get("type", "")
                if "RATE_LIMITED" in error_type or "rate limit" in error.get("message", "").lower():
                    if retry_count < MAX_RETRIES:
                        wait_time = INITIAL_BACKOFF * (BACKOFF_MULTIPLIER ** retry_count)
                        print(f"Rate limit hit. Retrying in {wait_time}s... (attempt {retry_count + 1}/{MAX_RETRIES})", file=sys.stderr)
                        time.sleep(wait_time)
                        return make_graphql_request(query, variables, retry_count + 1)
            
            # If not a rate limit error, fail
            print(f"GraphQL errors: {json.dumps(errors, indent=2)}", file=sys.stderr)
            sys.exit(1)
        
        return data
        
    except requests.exceptions.RequestException as e:
        if retry_count < MAX_RETRIES:
            wait_time = INITIAL_BACKOFF * (BACKOFF_MULTIPLIER ** retry_count)
            print(f"Request exception: {e}. Retrying in {wait_time}s... (attempt {retry_count + 1}/{MAX_RETRIES})", file=sys.stderr)
            time.sleep(wait_time)
            return make_graphql_request(query, variables, retry_count + 1)
        else:
            print(f"Error: Max retries exceeded - {e}", file=sys.stderr)
            sys.exit(1)


def fetch_repositories(owner: str) -> List[Dict[str, Any]]:
    """
    Fetch all repositories for the given owner using GraphQL pagination.
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
    
    while True:
        variables = {"login": owner, "after": after}
        print(f"Fetching repositories (after: {after})...", file=sys.stderr)
        
        data = make_graphql_request(query, variables)
        
        repo_owner = data.get("data", {}).get("repositoryOwner")
        if not repo_owner:
            print(f"Error: Repository owner '{owner}' not found", file=sys.stderr)
            sys.exit(1)
        
        repos_data = repo_owner.get("repositories", {})
        nodes = repos_data.get("nodes", [])
        page_info = repos_data.get("pageInfo", {})
        
        repositories.extend(nodes)
        
        if not page_info.get("hasNextPage"):
            break
        
        after = page_info.get("endCursor")
    
    print(f"Fetched {len(repositories)} repositories", file=sys.stderr)
    return repositories


def process_repository(repo: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a repository object into the desired output format.
    """
    # Extract topics
    topics = []
    repo_topics = repo.get("repositoryTopics", {}).get("nodes", [])
    for topic_node in repo_topics:
        topic = topic_node.get("topic", {})
        if topic and topic.get("name"):
            topics.append(topic["name"])
    
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
        "default_branch": repo.get("defaultBranchRef", {}).get("name", "") if repo.get("defaultBranchRef") else "",
        "created_at": repo.get("createdAt", ""),
        "updated_at": repo.get("updatedAt", ""),
        "pushed_at": repo.get("pushedAt", ""),
        "stargazer_count": repo.get("stargazerCount", 0),
        "fork_count": repo.get("forkCount", 0),
        "disk_usage": repo.get("diskUsage", 0),
        "open_issues_count": repo.get("issues", {}).get("totalCount", 0),
        "watchers_count": repo.get("watchers", {}).get("totalCount", 0),
        "topics": topics,
        "license": repo.get("licenseInfo", {}).get("name", "") if repo.get("licenseInfo") else "",
        "primary_language": repo.get("primaryLanguage", {}).get("name", "") if repo.get("primaryLanguage") else "",
        "owner": repo.get("owner", {}).get("login", "")
    }


def write_json_report(repositories: List[Dict[str, Any]], filename: str):
    """
    Write repositories to a JSON file.
    """
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(repositories, f, indent=2, ensure_ascii=False)
    print(f"Wrote {filename}", file=sys.stderr)


def write_csv_report(repositories: List[Dict[str, Any]], filename: str):
    """
    Write repositories to a CSV file.
    """
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
        "owner"
    ]
    
    with open(filename, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for repo in repositories:
            # Convert snake_case keys to camelCase for CSV
            csv_row = {
                "name": repo["name"],
                "nameWithOwner": repo["name_with_owner"],
                "isPrivate": repo["is_private"],
                "visibility": repo["visibility"],
                "isArchived": repo["is_archived"],
                "isTemplate": repo["is_template"],
                "isFork": repo["is_fork"],
                "url": repo["url"],
                "description": repo["description"],
                "defaultBranch": repo["default_branch"],
                "createdAt": repo["created_at"],
                "updatedAt": repo["updated_at"],
                "pushedAt": repo["pushed_at"],
                "stargazerCount": repo["stargazer_count"],
                "forkCount": repo["fork_count"],
                "diskUsage": repo["disk_usage"],
                "openIssuesCount": repo["open_issues_count"],
                "watchersCount": repo["watchers_count"],
                "topics": ";".join(repo["topics"]),  # Semicolon-delimited
                "license": repo["license"],
                "primaryLanguage": repo["primary_language"],
                "owner": repo["owner"]
            }
            writer.writerow(csv_row)
    
    print(f"Wrote {filename}", file=sys.stderr)


def main():
    """
    Main function to generate repository reports.
    """
    if not OWNER:
        print("Error: OWNER environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    print(f"Generating repository report for owner: {OWNER}", file=sys.stderr)
    print(f"Using authentication: {'Yes (REPORT_TOKEN set)' if REPORT_TOKEN else 'No (public repos only)'}", file=sys.stderr)
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}", file=sys.stderr)
    
    # Fetch repositories
    raw_repositories = fetch_repositories(OWNER)
    
    # Process repositories
    repositories = [process_repository(repo) for repo in raw_repositories]
    
    # Write reports
    write_json_report(repositories, "repo-report.json")
    write_csv_report(repositories, "repo-report.csv")
    
    print("Repository report generation complete!", file=sys.stderr)


if __name__ == "__main__":
    main()
