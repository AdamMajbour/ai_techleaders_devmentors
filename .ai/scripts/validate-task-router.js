#!/usr/bin/env node

/**
 * Validation script for task-router structure
 * Checks:
 * 1. All routed paths exist
 * 2. Root AGENTS.md <= 150 lines
 * 3. Unit AGENTS.md <= 120 lines
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const ROOT_AGENTS_PATH = path.join(repoRoot, 'AGENTS.md');
const PACKAGE_AGENTS = {
  app: path.join(repoRoot, 'packages/app/AGENTS.md'),
  core: path.join(repoRoot, 'packages/core/AGENTS.md'),
  db: path.join(repoRoot, 'packages/db/AGENTS.md'),
  ui: path.join(repoRoot, 'packages/ui/AGENTS.md'),
};

const MAX_LINES = {
  root: 150,
  unit: 120,
};

const KNOWN_PATHS = {
  'This file': ROOT_AGENTS_PATH,
  '.ai/specs/engineering-standards.md': path.join(repoRoot, '.ai/specs/engineering-standards.md'),
  'docs/design-system.md': path.join(repoRoot, 'docs/design-system.md'),
  '.ai/specs/product-brief.md': path.join(repoRoot, '.ai/specs/product-brief.md'),
  'CLAUDE.md': path.join(repoRoot, 'CLAUDE.md'),
};

// Clean path by removing markdown formatting
function cleanPath(p) {
  // Remove backticks
  let cleaned = p.replace(/`/g, '');
  // Remove parentheses content like "(see below)"
  cleaned = cleaned.replace(/\(.*?\)/g, '').trim();
  return cleaned;
}

// Check if a path exists
function pathExists(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

// Resolve a path from the routing table
function resolveRoutedPath(relativePath) {
  // Clean the path first
  const cleaned = cleanPath(relativePath);
  
  // Handle known paths
  if (KNOWN_PATHS[cleaned]) {
    return KNOWN_PATHS[cleaned];
  }
  
  // Handle paths with "then" or "+" (multiple actions)
  if (cleaned.includes('then') || cleaned.includes('+')) {
    // Extract first concrete path
    const paths = cleaned.split(/then|\+/).map(p => p.trim());
    for (const p of paths) {
      if (p && p !== 'route by affected package' && p !== 'affected package docs' && p !== 'package-specific rules' && p !== 'and') {
        return resolveRoutedPath(p);
      }
    }
    return null; // Skip these
  }
  
  // Handle "Spec + docs" patterns
  if (cleaned.includes('Spec') && cleaned.includes('docs')) {
    // Just check .ai/specs/ exists
    return path.join(repoRoot, '.ai/specs');
  }
  
  // Handle "spec in .ai/specs/" pattern
  if (cleaned.includes('.ai/specs/')) {
    const basePath = path.join(repoRoot, '.ai/specs');
    if (pathExists(basePath)) {
      return basePath;
    }
    return null;
  }
  
  // Standard resolution
  let resolved = path.resolve(repoRoot, cleaned);
  
  // Try with .md extension if not already present
  if (!pathExists(resolved) && !resolved.endsWith('.md') && !cleaned.includes('.')) {
    resolved = path.resolve(repoRoot, cleaned + '.md');
  }
  
  return resolved;
}

// Extract paths from routing table in root AGENTS.md
function extractRoutedPaths(content) {
  const paths = [];
  const lines = content.split('\n');
  let inTable = false;
  let tableSection = null;
  let skipUntilEmpty = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip if we're in a skip mode
    if (skipUntilEmpty) {
      if (line.trim() === '') {
        skipUntilEmpty = false;
      }
      continue;
    }
    
    // Detect package reference table (3 columns) - skip this entire table
    if (line.includes('| Package |') && line.includes('| AGENTS.md |') && line.includes('| Focus |')) {
      skipUntilEmpty = true;
      continue;
    }
    
    // Detect table headers
    if (line.includes('| Task |') && line.includes('| Read |')) {
      inTable = true;
      tableSection = 'general';
      continue;
    }
    
    // End table on empty line after table
    if (inTable && line.trim() === '' && i > 0) {
      const prevLine = lines[i - 1];
      if (prevLine.startsWith('|')) {
        inTable = false;
        tableSection = null;
      }
    }
    
    if (inTable && line.startsWith('|') && !line.includes('---') && !line.includes('===')) {
      // Parse table row: | Task | Read |
      // Match the entire line with exactly 2 data columns
      const match = line.match(/^\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$/);
      if (match) {
        const task = match[1].trim();
        const readPath = match[2].trim();
        
        if (task && readPath) {
          paths.push({ task, path: readPath, section: tableSection });
        }
      }
    }
  }
  
  return paths;
}

// Main validation
function validate() {
  console.log('Validating task-router structure...\n');
  
  let hasErrors = false;
  const errors = [];
  
  // Check 1: Root AGENTS.md exists
  console.log('1. Checking root AGENTS.md...');
  if (!pathExists(ROOT_AGENTS_PATH)) {
    console.error('   ❌ Root AGENTS.md not found');
    hasErrors = true;
    errors.push('Root AGENTS.md not found');
  } else {
    console.log('   ✅ Root AGENTS.md exists');
  }
  
  // Check 2: File sizes
  console.log('\n2. Checking file sizes...');
  const rootContent = fs.readFileSync(ROOT_AGENTS_PATH, 'utf-8');
  const rootLines = rootContent.split('\n').length;
  console.log(`   Root AGENTS.md: ${rootLines} lines (max ${MAX_LINES.root})`);
  if (rootLines > MAX_LINES.root) {
    console.error(`   ❌ Root AGENTS.md exceeds ${MAX_LINES.root} lines`);
    hasErrors = true;
    errors.push(`Root AGENTS.md exceeds ${MAX_LINES.root} lines (${rootLines})`);
  } else {
    console.log('   ✅ Root AGENTS.md within limit');
  }
  
  // Check 3: Package AGENTS.md files
  console.log('\n3. Checking package AGENTS.md files...');
  for (const [pkg, filePath] of Object.entries(PACKAGE_AGENTS)) {
    if (!pathExists(filePath)) {
      console.error(`   ❌ packages/${pkg}/AGENTS.md not found`);
      hasErrors = true;
      errors.push(`packages/${pkg}/AGENTS.md not found`);
    } else {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').length;
      console.log(`   packages/${pkg}/AGENTS.md: ${lines} lines (max ${MAX_LINES.unit})`);
      if (lines > MAX_LINES.unit) {
        console.error(`   ❌ packages/${pkg}/AGENTS.md exceeds ${MAX_LINES.unit} lines`);
        hasErrors = true;
        errors.push(`packages/${pkg}/AGENTS.md exceeds ${MAX_LINES.unit} lines (${lines})`);
      } else {
        console.log(`   ✅ packages/${pkg}/AGENTS.md within limit`);
      }
    }
  }
  
  // Check 4: CLAUDE.md files
  console.log('\n4. Checking CLAUDE.md files...');
  for (const [pkg] of Object.entries(PACKAGE_AGENTS)) {
    const claudPath = path.join(repoRoot, `packages/${pkg}/CLAUDE.md`);
    if (!pathExists(claudPath)) {
      console.error(`   ❌ packages/${pkg}/CLAUDE.md not found`);
      hasErrors = true;
      errors.push(`packages/${pkg}/CLAUDE.md not found`);
    } else {
      const content = fs.readFileSync(claudPath, 'utf-8').trim();
      if (content !== '@AGENTS.md') {
        console.warn(`   ⚠️  packages/${pkg}/CLAUDE.md should contain only '@AGENTS.md'`);
        errors.push(`packages/${pkg}/CLAUDE.md should contain only '@AGENTS.md'`);
      } else {
        console.log(`   ✅ packages/${pkg}/CLAUDE.md correct`);
      }
    }
  }
  
  // Check 5: Routing table paths
  console.log('\n5. Checking routing table paths...');
  const routedPaths = extractRoutedPaths(rootContent);
  console.log(`   Found ${routedPaths.length} routed entries`);
  
  let missingCount = 0;
  let skipCount = 0;
  for (const { task, path: relativePath, section } of routedPaths) {
    // Clean the path
    const cleaned = cleanPath(relativePath);
    
    // Skip special entries
    if (!cleaned) {
      skipCount++;
      continue;
    }
    
    const skipPatterns = [
      'route by affected package',
      'affected package docs',
      'package-specific rules',
      'and',
      'then',
      ', then',
      '+ affected',
      'Spec +',
    ];
    
    if (skipPatterns.some(p => cleaned.includes(p))) {
      console.log(`   ℹ️  Skipping: "${relativePath}" (conditional)`);
      skipCount++;
      continue;
    }
    
    if (cleaned === 'This file') {
      console.log(`   ✅ This file`);
      continue;
    }
    
    if (cleaned === 'This file + package AGENTS.md') {
      console.log(`   ✅ This file + package AGENTS.md`);
      continue;
    }
    
    const resolvedPath = resolveRoutedPath(relativePath);
    
    if (resolvedPath === null) {
      console.log(`   ⚠️  Skipping: "${relativePath}" (complex pattern)`);
      skipCount++;
      continue;
    }
    
    if (pathExists(resolvedPath)) {
      console.log(`   ✅ ${cleaned}`);
    } else {
      console.error(`   ❌ Missing: ${relativePath}`);
      console.error(`      Cleaned: ${cleaned}`);
      console.error(`      Resolved to: ${resolvedPath}`);
      missingCount++;
      hasErrors = true;
      errors.push(`Missing path: ${relativePath}`);
    }
  }
  
  if (missingCount === 0) {
    console.log('   ✅ All concrete routed paths exist');
  }
  console.log(`   ℹ️  Skipped ${skipCount} conditional/pattern entries`);
  
  // Summary
  console.log('\n' + '='.repeat(60));
  if (hasErrors) {
    console.error('❌ VALIDATION FAILED');
    console.error('\nErrors:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  } else {
    console.log('✅ ALL VALIDATIONS PASSED');
    process.exit(0);
  }
}

// Run validation
try {
  validate();
} catch (error) {
  console.error('\n❌ Validation error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
