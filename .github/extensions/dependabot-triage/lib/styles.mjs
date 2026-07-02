// styles.mjs — CSS for the dependabot-triage canvas, using host theme tokens
// (with fallbacks) so it fits whichever app theme is active.

export const CSS = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--background-color-default, #ffffff);
    color: var(--text-color-default, #1f2328);
    font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    font-size: var(--text-body-medium, 14px);
    line-height: var(--leading-body-medium, 20px);
  }
  #app { padding: 16px 20px 40px; max-width: 1200px; margin: 0 auto; }

  h1 {
    font-family: var(--font-sans-display, var(--font-sans, sans-serif));
    font-size: var(--text-title-medium, 20px);
    font-weight: var(--font-weight-semibold, 600);
    margin: 0 0 4px;
  }
  .subtitle { color: var(--text-color-muted, #656d76); font-size: 12px; margin-bottom: 16px; }

  .toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
  button {
    font: inherit;
    border: 1px solid var(--border-color-default, #d0d7de);
    background: var(--background-color-default, #fff);
    color: var(--text-color-default, #1f2328);
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
  }
  button:hover:not(:disabled) { background: var(--n-2, rgba(0,0,0,0.05)); }
  button:disabled { opacity: 0.55; cursor: default; }
  button.primary {
    background: var(--true-color-blue, #0969da);
    border-color: var(--true-color-blue, #0969da);
    color: var(--color-white, #fff);
  }
  button.primary:hover:not(:disabled) { filter: brightness(1.08); }
  button.small { padding: 3px 8px; font-size: 12px; border-radius: 5px; }

  .summary { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
  .stat {
    border: 1px solid var(--border-color-default, #d0d7de);
    border-radius: 8px;
    padding: 8px 14px;
    min-width: 110px;
  }
  .stat .n { font-size: 20px; font-weight: var(--font-weight-semibold, 600); display: block; }
  .stat .l { color: var(--text-color-muted, #656d76); font-size: 11px; text-transform: uppercase; letter-spacing: .03em; }
  .stat.ready .n { color: var(--true-color-green, #1a7f37); }
  .stat.blocked .n { color: var(--true-color-red, #cf222e); }
  .stat.pending .n { color: var(--true-color-yellow, #9a6700); }

  .banner {
    border: 1px solid var(--true-color-yellow-muted, #f9c74f);
    background: var(--true-color-yellow-muted, rgba(210, 153, 34, 0.12));
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 16px;
    font-size: 12px;
  }
  .banner.error {
    border-color: var(--true-color-red-muted, #ffb3ab);
    background: var(--true-color-red-muted, rgba(207, 34, 46, 0.08));
  }
  .banner summary { cursor: pointer; font-weight: 600; }
  .banner ul { margin: 8px 0 0; padding-left: 18px; }

  .repo-group { margin-bottom: 22px; }
  .repo-group h2 {
    font-size: 13px;
    font-weight: var(--font-weight-semibold, 600);
    color: var(--text-color-muted, #656d76);
    text-transform: uppercase;
    letter-spacing: .03em;
    margin: 0 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border-color-default, #d0d7de);
  }

  table { width: 100%; border-collapse: collapse; }
  .pr-card {
    border: 1px solid var(--border-color-default, #d0d7de);
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 8px;
  }
  .pr-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
  .pr-title a { color: var(--text-color-default, #1f2328); text-decoration: none; font-weight: 600; }
  .pr-title a:hover { text-decoration: underline; }
  .pr-meta { color: var(--text-color-muted, #656d76); font-size: 12px; margin-top: 2px; }
  .pr-actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }

  .badge {
    display: inline-block;
    border-radius: 999px;
    padding: 2px 9px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }
  .badge.ready { background: var(--true-color-green-muted, #d1f0d1); color: var(--true-color-green, #1a7f37); }
  .badge.blocked-required { background: var(--true-color-red-muted, #ffd8d3); color: var(--true-color-red, #cf222e); }
  .badge.blocked-non-required { background: var(--true-color-orange-muted, #ffe2c8); color: var(--true-color-orange, #bc4c00); }
  .badge.pending { background: var(--true-color-yellow-muted, #fff1c2); color: var(--true-color-yellow, #9a6700); }
  .badge.draft { background: var(--n-3, #e8e8e8); color: var(--text-color-muted, #656d76); }

  .checks { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 5px;
    padding: 2px 7px;
    font-size: 11px;
    border: 1px solid transparent;
  }
  .chip.pass { background: var(--true-color-green-muted, #d1f0d1); color: var(--true-color-green, #1a7f37); }
  .chip.fail { background: var(--true-color-red-muted, #ffd8d3); color: var(--true-color-red, #cf222e); }
  .chip.pending { background: var(--true-color-yellow-muted, #fff1c2); color: var(--true-color-yellow, #9a6700); }
  .chip .req {
    font-size: 9px;
    font-weight: 700;
    background: rgba(0,0,0,0.15);
    border-radius: 3px;
    padding: 0 4px;
  }

  .empty { color: var(--text-color-muted, #656d76); padding: 24px 0; text-align: center; }
  .loading { color: var(--text-color-muted, #656d76); padding: 24px 0; text-align: center; }

  .merge-results {
    border: 1px solid var(--border-color-default, #d0d7de);
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 16px;
    font-size: 12px;
  }
  .merge-results .row { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; }
  .merge-results .row.fail { color: var(--true-color-red, #cf222e); }
  .merge-results .row.ok { color: var(--true-color-green, #1a7f37); }
`;
