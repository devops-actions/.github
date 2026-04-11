#!/usr/bin/env python3
"""
Fetch star and fork counts for each repo in scope.json via the GitHub REST API.
Saves results to ossf-reporting/repo-stars-forks.json.
"""

import json
import os
import sys
from pathlib import Path

import urllib.request
import urllib.error


def fetch_stars_forks(scope, output_path):
    token = os.environ.get("GITHUB_TOKEN")
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "devops-actions-scorecard-monitor",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    stars_forks = {}
    for platform in scope:
        for org in scope[platform]:
            repos = scope[platform][org].get("included", [])
            print(f"Fetching stars/forks for {len(repos)} repos in {org}...")
            for repo in repos:
                url = f"https://api.github.com/repos/{org}/{repo}"
                req = urllib.request.Request(url, headers=headers)
                try:
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        data = json.loads(resp.read())
                    key = f"{org}/{repo}"
                    stars_forks[key] = {
                        "stars": data.get("stargazers_count", 0),
                        "forks": data.get("forks_count", 0),
                    }
                    print(f"  {key}: {stars_forks[key]['stars']} stars, {stars_forks[key]['forks']} forks")
                except urllib.error.HTTPError as e:
                    print(f"  HTTP error for {org}/{repo}: {e.code} {e.reason}")
                except Exception as e:
                    print(f"  Error fetching {org}/{repo}: {e}")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(stars_forks, f, indent=2, sort_keys=True)
        f.write("\n")

    print(f"\nStars/forks saved to {output_path}")


def main():
    repo_root = Path(__file__).parent.parent.parent
    scope_path = repo_root / "ossf-reporting" / "scope.json"
    output_path = repo_root / "ossf-reporting" / "repo-stars-forks.json"

    if not scope_path.exists():
        print(f"Error: scope.json not found at {scope_path}")
        sys.exit(1)

    with open(scope_path, "r", encoding="utf-8") as f:
        scope = json.load(f)

    fetch_stars_forks(scope, output_path)


if __name__ == "__main__":
    main()