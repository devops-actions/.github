#!/usr/bin/env node

/**
 * Transform load-available-actions output to OSSF Scorecard scope.json format
 * 
 * Reads actions.json from load-available-actions and converts to scope.json format.
 * Filters out archived repositories but keeps forks.
 */

const fs = require('fs');
const path = require('path');

const ACTIONS_FILE = process.argv[2] || 'actions.json';
const SCOPE_FILE = process.argv[3] || 'ossf-reporting/scope.json';

function transformToScope(actionsData) {
  // Extract unique repository names from actions array
  // Filter out archived repos but keep forks
  const repos = actionsData.actions
    .filter(action => !action.isArchived) // Exclude archived
    .map(action => action.repo);

  // Get unique repo names and sort
  const uniqueRepos = [...new Set(repos)].sort();

  // Get organization name (use first action's owner or from top level)
  const organization = actionsData.organization || 
                      (actionsData.actions[0] && actionsData.actions[0].owner) ||
                      'devops-actions';

  // Build scope.json structure
  const scope = {
    'github.com': {
      [organization]: {
        included: uniqueRepos,
        excluded: []
      }
    }
  };

  return scope;
}

function main() {
  try {
    console.log(`Reading actions data from: ${ACTIONS_FILE}`);
    
    // Read the actions.json file
    const actionsData = JSON.parse(fs.readFileSync(ACTIONS_FILE, 'utf8'));
    
    console.log(`Found ${actionsData.actions.length} total actions`);
    
    // Transform to scope format
    const scope = transformToScope(actionsData);
    
    const organization = Object.keys(scope['github.com'])[0];
    const includedCount = scope['github.com'][organization].included.length;
    
    console.log(`Transformed to ${includedCount} unique repositories`);
    console.log(`Repositories: ${scope['github.com'][organization].included.join(', ')}`);
    
    // Write to scope file
    fs.writeFileSync(SCOPE_FILE, JSON.stringify(scope, null, 2) + '\n', 'utf8');
    
    console.log(`Successfully wrote scope to: ${SCOPE_FILE}`);
    
  } catch (error) {
    console.error('Error transforming data:', error.message);
    process.exit(1);
  }
}

main();
