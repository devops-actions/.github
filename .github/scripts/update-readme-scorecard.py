#!/usr/bin/env python3
"""
Script to update README files with OpenSSF Scorecard information.
Extracts data from openssf-scorecard-report.md and updates both
the root README.md and profile/README.md files.
"""

import json
import re
import sys
from pathlib import Path


def extract_scorecard_data(report_path):
    """Extract repository scorecard data from the report markdown file."""
    with open(report_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the table section - lines starting with |
    lines = content.split('\n')
    repos = []

    in_table = False
    for line in lines:
        if line.startswith('| Repository |'):
            in_table = True
            continue
        elif line.startswith('| -- |'):
            # Header separator
            continue
        elif in_table and line.startswith('|'):
            # Parse table row
            parts = [p.strip() for p in line.split('|')[1:-1]]  # Remove empty first/last
            if len(parts) >= 3:
                repo_cell = parts[0]
                score = parts[2]

                # Extract repo name from markdown link
                match = re.search(r'\[([^\]]+)\]\(([^)]+)\)', repo_cell)
                if match:
                    repo_name = match.group(1)
                    repo_url = match.group(2)
                    # Extract short name from full path
                    short_name = repo_name.split('/')[-1]

                    repos.append({
                        'full_name': repo_name,
                        'short_name': short_name,
                        'url': repo_url,
                        'score': score
                    })
        elif in_table and not line.startswith('|'):
            # End of table
            break

    return repos


def load_usage_counts(usage_path):
    """Load repository usage counts from the JSON file."""
    if not usage_path.exists():
        return {}
    try:
        with open(usage_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def load_stars_forks(stars_forks_path):
    """Load repository stars and forks counts from the JSON file."""
    if not stars_forks_path.exists():
        return {}
    try:
        with open(stars_forks_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def create_simple_table(repos, usage_counts=None, stars_forks=None):
    """Create a simple table with repo name, badge, and optionally used-by count, stars, and forks."""
    headers = ["|Repo", "Score"]
    separators = ["|---", "---"]
    if usage_counts:
        headers.append("Dependents")
        separators.append("---")
    if stars_forks:
        headers.append("Stars")
        headers.append("Forks")
        separators.append("---")
        separators.append("---")

    lines = [
        "|".join(headers) + "|",
        "|".join(separators) + "|",
    ]

    for repo in repos:
        # Create badge URL
        badge_url = f"[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/{repo['full_name']}/badge)](https://api.securityscorecards.dev/projects/github.com/{repo['full_name']})"

        row = f"|[{repo['short_name']}]({repo['url']})|{badge_url}"

        if usage_counts:
            count = usage_counts.get(repo['full_name'], 0)
            dependents_url = f"https://github.com/{repo['full_name']}/network/dependents"
            row += f"|[{count}]({dependents_url})"

        if stars_forks:
            repo_sf = stars_forks.get(repo['full_name'], {})
            row += f"|{repo_sf.get('stars', 0)}|{repo_sf.get('forks', 0)}"

        row += "|"
        lines.append(row)

    return '\n'.join(lines)


def update_readme_file(readme_path, table_content, marker_start, marker_end):
    """Update README file with the scorecard table between markers."""
    with open(readme_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if markers exist
    if marker_start in content and marker_end in content:
        # Replace content between markers
        pattern = re.compile(
            re.escape(marker_start) + r'.*?' + re.escape(marker_end),
            re.DOTALL
        )
        new_content = pattern.sub(
            f"{marker_start}\n{table_content}\n{marker_end}",
            content
        )
    else:
        # Add section at the end
        new_content = content.rstrip() + f"\n\n{marker_start}\n{table_content}\n{marker_end}\n"

    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(new_content)


def main():
    # Paths
    repo_root = Path(__file__).parent.parent.parent
    report_path = repo_root / 'ossf-reporting' / 'openssf-scorecard-report.md'
    usage_path = repo_root / 'ossf-reporting' / 'repo-usage.json'
    stars_forks_path = repo_root / 'ossf-reporting' / 'repo-stars-forks.json'
    profile_readme = repo_root / 'profile' / 'README.md'

    # Check if report exists
    if not report_path.exists():
        print(f"Error: Report file not found at {report_path}")
        sys.exit(1)

    # Extract data from report
    repos = extract_scorecard_data(report_path)

    if not repos:
        print("Warning: No repository data found in report")
        sys.exit(0)

    print(f"Found {len(repos)} repositories in scorecard report")

    # Sort repositories alphabetically by short name
    repos.sort(key=lambda r: r['short_name'].lower())

    # Load usage counts (optional - column is only added if data exists)
    usage_counts = load_usage_counts(usage_path)
    if usage_counts:
        print(f"Loaded usage counts for {len(usage_counts)} repositories")
    else:
        print("No usage count data found, 'Dependents' column will be omitted")

    # Load stars/forks (optional - columns are only added if data exists)
    stars_forks = load_stars_forks(stars_forks_path)
    if stars_forks:
        print(f"Loaded stars/forks for {len(stars_forks)} repositories")
    else:
        print("No stars/forks data found, 'Stars'/'Forks' columns will be omitted")

    # Create table content
    table_content = create_simple_table(repos, usage_counts or None, stars_forks or None)

    # Define markers for the sections
    marker_start = "<!-- OSSF-SCORECARD-START -->"
    marker_end = "<!-- OSSF-SCORECARD-END -->"

    # Update profile README
    if profile_readme.exists():
        print(f"Updating {profile_readme}")
        update_readme_file(profile_readme, table_content, marker_start, marker_end)
    else:
        print(f"Warning: Profile README not found at {profile_readme}")

    print("README files updated successfully!")


if __name__ == '__main__':
    main()