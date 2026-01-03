#!/usr/bin/env python3
"""
Script to update README files with OpenSSF Scorecard information.
Extracts data from openssf-scorecard-report.md and updates both
the root README.md and profile/README.md files.
"""

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


def create_simple_table(repos):
    """Create a simple table with repo name and badge."""
    lines = [
        "|Repo|Score|",
        "|---|---|"
    ]
    
    for repo in repos:
        # Create badge URL
        badge_url = f"[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/{repo['full_name']}/badge)](https://api.securityscorecards.dev/projects/github.com/{repo['full_name']})"
        lines.append(f"|[{repo['short_name']}]({repo['url']})|{badge_url}|")
    
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
    profile_readme = repo_root / 'profile' / 'README.md'
    root_readme = repo_root / 'README.md'
    
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
    
    # Create table content
    table_content = create_simple_table(repos)
    
    # Define markers for the sections
    marker_start = "<!-- OSSF-SCORECARD-START -->"
    marker_end = "<!-- OSSF-SCORECARD-END -->"
    
    # Update profile README
    if profile_readme.exists():
        print(f"Updating {profile_readme}")
        update_readme_file(profile_readme, table_content, marker_start, marker_end)
    else:
        print(f"Warning: Profile README not found at {profile_readme}")
    
    # Note: Root README is no longer updated with scorecard data
    
    print("README files updated successfully!")


if __name__ == '__main__':
    main()
