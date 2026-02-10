#!/usr/bin/env python3
"""
Generate repository report for all repositories owned by a GitHub user/org.

Uses GitHub GraphQL API to fetch repository data with pagination,
implements retry logic with exponential backoff for transient errors,
and outputs both JSON and CSV formats.
"""

import os
import sys
import json
import csv
import time
from datetime import datetime, timezone
from typing import Any, Optional

try:
    import requests
except ImportError:
    print("Error: requests library not installed. Run: pip install requests", file=sys.stderr)
    sys.exit(1)


class GitHubReportGenerator:
    """Generate repository reports using GitHub GraphQL API."""
    
    def __init__(self, owner: str, token: Optional[str] = None):
        self.owner = owner
        self.token = token
        self.api_url = "https://api.github.com/graphql"
        self.session = requests.Session()
        
        # Set up authentication if token is provided
        if self.token:
            self.session.headers.update({
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            })
        else:
            self.session.headers.update({
                "Content-Type": "application/json"
            })
    
    def make_request(self, query: str, variables: dict, max_retries: int = 5) -> dict:
        """
        Make GraphQL request with retry logic and exponential backoff.
        
        Args:
            query: GraphQL query string
            variables: Query variables
            max_retries: Maximum number of retry attempts
            
        Returns:
            Response data dictionary
            
        Raises:
            SystemExit: On fatal errors (auth errors, unrecoverable 4xx)
        """
        payload = {
            "query": query,
            "variables": variables
        }
        
        for attempt in range(max_retries):
            try:
                response = self.session.post(self.api_url, json=payload, timeout=30)
                
                # Handle transient HTTP errors with exponential backoff
                if response.status_code in [502, 503, 504]:
                    wait_time = (2 ** attempt) + (time.time() % 1)  # Add jitter
                    print(f"HTTP {response.status_code} error, retrying in {wait_time:.2f}s (attempt {attempt + 1}/{max_retries})", file=sys.stderr)
                    if attempt < max_retries - 1:
                        time.sleep(wait_time)
                        continue
                    else:
                        print(f"Max retries exceeded for HTTP {response.status_code}", file=sys.stderr)
                        sys.exit(1)
                
                # Handle authentication errors (fatal)
                if response.status_code == 401:
                    print(f"Error: Authentication failed (401). Check REPORT_TOKEN.", file=sys.stderr)
                    sys.exit(1)
                
                # Handle other 4xx errors (fatal)
                if 400 <= response.status_code < 500:
                    print(f"Error: Client error {response.status_code}: {response.text}", file=sys.stderr)
                    sys.exit(1)
                
                # Check for successful response
                response.raise_for_status()
                data = response.json()
                
                # Check for GraphQL errors
                if "errors" in data:
                    errors = data["errors"]
                    
                    # Check for rate limit errors
                    for error in errors:
                        error_type = error.get("type", "")
                        message = error.get("message", "")
                        
                        if "rate limit" in message.lower() or error_type == "RATE_LIMITED":
                            wait_time = (2 ** attempt) + (time.time() % 1)
                            print(f"Rate limit encountered, retrying in {wait_time:.2f}s (attempt {attempt + 1}/{max_retries})", file=sys.stderr)
                            if attempt < max_retries - 1:
                                time.sleep(wait_time)
                                continue
                            else:
                                print(f"Max retries exceeded for rate limit", file=sys.stderr)
                                sys.exit(1)
                    
                    # Other GraphQL errors are fatal
                    print(f"GraphQL errors: {json.dumps(errors, indent=2)}", file=sys.stderr)
                    sys.exit(1)
                
                return data
                
            except requests.exceptions.Timeout:
                wait_time = (2 ** attempt) + (time.time() % 1)
                print(f"Request timeout, retrying in {wait_time:.2f}s (attempt {attempt + 1}/{max_retries})", file=sys.stderr)
                if attempt < max_retries - 1:
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"Max retries exceeded for timeout", file=sys.stderr)
                    sys.exit(1)
                    
            except requests.exceptions.RequestException as e:
                print(f"Request error: {e}", file=sys.stderr)
                sys.exit(1)
        
        print(f"Failed after {max_retries} attempts", file=sys.stderr)
        sys.exit(1)
    
    def fetch_repositories(self) -> list[dict[str, Any]]:
        """
        Fetch all repositories for the owner with pagination.
        
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
        after_cursor = None
        
        print(f"Fetching repositories for owner: {self.owner}", file=sys.stderr)
        
        while True:
            variables = {
                "login": self.owner,
                "after": after_cursor
            }
            
            data = self.make_request(query, variables)
            
            # Extract repository data
            owner_data = data.get("data", {}).get("repositoryOwner")
            if not owner_data:
                print(f"Error: No data found for owner '{self.owner}'", file=sys.stderr)
                sys.exit(1)
            
            repos_data = owner_data.get("repositories", {})
            nodes = repos_data.get("nodes", [])
            page_info = repos_data.get("pageInfo", {})
            
            repositories.extend(nodes)
            print(f"Fetched {len(nodes)} repositories (total: {len(repositories)})", file=sys.stderr)
            
            # Check if there are more pages
            if not page_info.get("hasNextPage", False):
                break
            
            after_cursor = page_info.get("endCursor")
        
        print(f"Total repositories fetched: {len(repositories)}", file=sys.stderr)
        return repositories
    
    def transform_repository_data(self, repo: dict) -> dict:
        """
        Transform repository data to consistent format with snake_case keys.
        
        Args:
            repo: Raw repository data from GraphQL
            
        Returns:
            Transformed repository dictionary
        """
        # Extract topics
        topics = []
        repo_topics = repo.get("repositoryTopics", {}).get("nodes", [])
        for topic_node in repo_topics:
            topic = topic_node.get("topic", {})
            if topic and "name" in topic:
                topics.append(topic["name"])
        
        # Extract default branch
        default_branch_ref = repo.get("defaultBranchRef")
        default_branch = default_branch_ref.get("name") if default_branch_ref else None
        
        # Extract license
        license_info = repo.get("licenseInfo")
        license_name = license_info.get("name") if license_info else None
        
        # Extract primary language
        primary_language = repo.get("primaryLanguage")
        language_name = primary_language.get("name") if primary_language else None
        
        # Extract owner
        owner = repo.get("owner", {})
        owner_login = owner.get("login") if owner else None
        
        return {
            "name": repo.get("name"),
            "name_with_owner": repo.get("nameWithOwner"),
            "is_private": repo.get("isPrivate"),
            "visibility": repo.get("visibility"),
            "is_archived": repo.get("isArchived"),
            "is_template": repo.get("isTemplate"),
            "is_fork": repo.get("isFork"),
            "url": repo.get("url"),
            "description": repo.get("description"),
            "default_branch": default_branch,
            "created_at": repo.get("createdAt"),
            "updated_at": repo.get("updatedAt"),
            "pushed_at": repo.get("pushedAt"),
            "stargazer_count": repo.get("stargazerCount"),
            "fork_count": repo.get("forkCount"),
            "disk_usage": repo.get("diskUsage"),
            "open_issues_count": repo.get("issues", {}).get("totalCount"),
            "watchers_count": repo.get("watchers", {}).get("totalCount"),
            "topics": topics,
            "license": license_name,
            "primary_language": language_name,
            "owner": owner_login
        }
    
    def write_json_report(self, repositories: list[dict], output_path: str):
        """Write repository data to JSON file."""
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(repositories, f, indent=2, ensure_ascii=False)
        print(f"JSON report written to: {output_path}", file=sys.stderr)
    
    def write_csv_report(self, repositories: list[dict], output_path: str):
        """Write repository data to CSV file."""
        if not repositories:
            print("No repositories to write to CSV", file=sys.stderr)
            return
        
        # CSV header
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
        
        with open(output_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for repo in repositories:
                # Convert to CSV row format
                row = {
                    "name": repo["name"],
                    "nameWithOwner": repo["name_with_owner"],
                    "isPrivate": repo["is_private"],
                    "visibility": repo["visibility"],
                    "isArchived": repo["is_archived"],
                    "isTemplate": repo["is_template"],
                    "isFork": repo["is_fork"],
                    "url": repo["url"],
                    "description": repo["description"] or "",
                    "defaultBranch": repo["default_branch"] or "",
                    "createdAt": repo["created_at"] or "",
                    "updatedAt": repo["updated_at"] or "",
                    "pushedAt": repo["pushed_at"] or "",
                    "stargazerCount": repo["stargazer_count"] or 0,
                    "forkCount": repo["fork_count"] or 0,
                    "diskUsage": repo["disk_usage"] or 0,
                    "openIssuesCount": repo["open_issues_count"] or 0,
                    "watchersCount": repo["watchers_count"] or 0,
                    "topics": ";".join(repo["topics"]) if repo["topics"] else "",
                    "license": repo["license"] or "",
                    "primaryLanguage": repo["primary_language"] or "",
                    "owner": repo["owner"] or ""
                }
                writer.writerow(row)
        
        print(f"CSV report written to: {output_path}", file=sys.stderr)
    
    def generate_reports(self):
        """Generate both JSON and CSV reports."""
        # Fetch repositories
        raw_repositories = self.fetch_repositories()
        
        # Transform data
        repositories = [self.transform_repository_data(repo) for repo in raw_repositories]
        
        # Write reports
        self.write_json_report(repositories, "repo-report.json")
        self.write_csv_report(repositories, "repo-report.csv")
        
        print(f"Reports generated successfully at {datetime.now(timezone.utc).isoformat()}", file=sys.stderr)


def main():
    """Main entry point."""
    # Get configuration from environment variables
    owner = os.environ.get("OWNER")
    token = os.environ.get("REPORT_TOKEN", "")
    
    if not owner:
        print("Error: OWNER environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    # Use token if provided, otherwise fall back to unauthenticated requests
    if not token:
        print("Warning: REPORT_TOKEN not set. Will only access public repositories.", file=sys.stderr)
    
    # Generate reports
    generator = GitHubReportGenerator(owner, token if token else None)
    generator.generate_reports()


if __name__ == "__main__":
    main()
