#!/usr/bin/env python3
"""
Fetch repository usage counts for each action in scope.json.
Uses the GitHub Code Search API to find workflow files that reference each action.
Outputs results to ossf-reporting/repo-usage.json.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# GitHub Search API allows 30 requests per minute for authenticated users
SEARCH_DELAY_SECONDS = 3


def search_action_usage(org, repo, token):
    """Search GitHub for unique repositories using a specific action.

    Queries the GitHub Code Search API to find workflow files referencing
    the action and returns the count of unique repositories.
    """
    # Exclude the action's own repository from results
    query = f'"uses: {org}/{repo}" path:.github/workflows -repo:{org}/{repo}'
    params = urllib.parse.urlencode({'q': query, 'per_page': '100'})
    url = f"https://api.github.com/search/code?{params}"

    headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'devops-actions-usage-counter',
    }
    if token:
        headers['Authorization'] = f'token {token}'

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            total_count = data.get('total_count', 0)
            items = data.get('items', [])

            # Count unique repositories from the results
            unique_repos = set()
            for item in items:
                repo_info = item.get('repository', {})
                full_name = repo_info.get('full_name', '')
                if full_name:
                    unique_repos.add(full_name)

            # If total_count exceeds items returned, there may be more repos
            # Use unique count from first page as a lower bound
            if total_count > len(items):
                return len(unique_repos), True
            return len(unique_repos), False
    except urllib.error.HTTPError as e:
        if e.code == 403 or e.code == 429:
            print("  Rate limited, waiting 60 seconds...")
            time.sleep(60)
            return search_action_usage(org, repo, token)
        print(f"  Error searching for {org}/{repo}: HTTP {e.code}")
        return None, False
    except Exception as e:
        print(f"  Error searching for {org}/{repo}: {e}")
        return None, False


def main():
    repo_root = Path(__file__).parent.parent.parent
    scope_path = repo_root / 'ossf-reporting' / 'scope.json'
    output_path = repo_root / 'ossf-reporting' / 'repo-usage.json'

    token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    if not token:
        print("Warning: No GITHUB_TOKEN or GH_TOKEN found. API rate limits will be very restrictive.")

    if not scope_path.exists():
        print(f"Error: scope.json not found at {scope_path}")
        sys.exit(1)

    with open(scope_path, 'r', encoding='utf-8') as f:
        scope = json.load(f)

    usage_counts = {}

    for platform in scope:
        for org in scope[platform]:
            repos = scope[platform][org].get('included', [])
            print(f"Fetching usage counts for {len(repos)} repos in {org}...")

            for i, repo in enumerate(repos):
                count, has_more = search_action_usage(org, repo, token)
                if count is not None:
                    usage_counts[f"{org}/{repo}"] = count
                    more_indicator = "+" if has_more else ""
                    print(f"  {org}/{repo}: used by {count}{more_indicator} repos")
                else:
                    print(f"  {org}/{repo}: could not determine usage count")

                # Respect rate limits between requests (skip delay after last item)
                if i < len(repos) - 1:
                    time.sleep(SEARCH_DELAY_SECONDS)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(usage_counts, f, indent=2, sort_keys=True)
        f.write('\n')

    print(f"\nUsage counts saved to {output_path}")


if __name__ == '__main__':
    main()
