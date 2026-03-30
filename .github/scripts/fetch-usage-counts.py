#!/usr/bin/env python3
"""
Fetch repository dependents counts for each action in scope.json.
Uses Playwright browser automation to scrape the GitHub dependents page
(e.g. https://github.com/{org}/{repo}/network/dependents) for accurate counts.
Outputs results to ossf-reporting/repo-usage.json.
"""

import asyncio
import json
import re
import sys
from pathlib import Path

from playwright.async_api import async_playwright

# Small delay between page loads to be respectful
PAGE_DELAY_SECONDS = 2


async def fetch_dependents_count(page, org, repo, retries=2):
    """Navigate to the GitHub dependents page and scrape the repository count."""
    url = f"https://github.com/{org}/{repo}/network/dependents"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)

        # Find the link whose text matches "<number> Repositories"
        link = page.get_by_role("link", name=re.compile(r"^\d+\s+Repositor"))
        text = await link.first.text_content(timeout=10000)
        match = re.search(r"(\d[\d,]*)", text)
        if match:
            count = int(match.group(1).replace(",", ""))
            return count
        print(f"  Warning: could not parse count from '{text.strip()}'")
        return 0
    except Exception as e:
        if retries > 0:
            print(f"  Retrying {org}/{repo}... ({retries} retries left)")
            await asyncio.sleep(5)
            return await fetch_dependents_count(page, org, repo, retries - 1)
        print(f"  Error fetching dependents for {org}/{repo}: {e}")
        return None


async def run():
    repo_root = Path(__file__).parent.parent.parent
    scope_path = repo_root / "ossf-reporting" / "scope.json"
    output_path = repo_root / "ossf-reporting" / "repo-usage.json"

    if not scope_path.exists():
        print(f"Error: scope.json not found at {scope_path}")
        sys.exit(1)

    with open(scope_path, "r", encoding="utf-8") as f:
        scope = json.load(f)

    usage_counts = {}

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()

        for platform in scope:
            for org in scope[platform]:
                repos = scope[platform][org].get("included", [])
                print(f"Fetching dependents for {len(repos)} repos in {org}...")

                for i, repo in enumerate(repos):
                    count = await fetch_dependents_count(page, org, repo)
                    if count is not None:
                        usage_counts[f"{org}/{repo}"] = count
                        print(f"  {org}/{repo}: {count} dependents")
                    else:
                        print(f"  {org}/{repo}: could not determine dependents")

                    if i < len(repos) - 1:
                        await asyncio.sleep(PAGE_DELAY_SECONDS)

        await browser.close()

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(usage_counts, f, indent=2, sort_keys=True)
        f.write("\n")

    print(f"\nDependents counts saved to {output_path}")


def main():
    asyncio.run(run())


if __name__ == "__main__":
    main()
