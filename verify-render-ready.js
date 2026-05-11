#!/usr/bin/env node

/**
 * Verify project is ready for Render deployment
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const checks = [];
let passed = 0;
let failed = 0;

function check(name, condition, message) {
  checks.push({ name, passed: condition, message });
  if (condition) {
    passed++;
    console.log(`✓ ${name}`);
  } else {
    failed++;
    console.log(`✗ ${name}`);
    if (message) console.log(`  ${message}`);
  }
}

console.log('🔍 Verifying Render deployment readiness...\n');

// Check render.yaml exists
check(
  'render.yaml exists',
  existsSync(join(__dirname, 'render.yaml')),
  'Create render.yaml in project root'
);

// Check backend structure
check(
  'Backend directory exists',
  existsSync(join(__dirname, 'backend')),
  'Backend directory not found'
);

check(
  'Backend package.json exists',
  existsSync(join(__dirname, 'backend', 'package.json')),
  'Backend package.json not found'
);

check(
  'Backend server.js exists',
  existsSync(join(__dirname, 'backend', 'src', 'server.js')),
  'Backend server.js not found'
);

check(
  '.node-version exists',
  existsSync(join(__dirname, 'backend', '.node-version')),
  'Create .node-version in backend directory'
);

// Check frontend structure
check(
  'Frontend directory exists',
  existsSync(join(__dirname, 'frontend')),
  'Frontend directory not found'
);

check(
  'Frontend package.json exists',
  existsSync(join(__dirname, 'frontend', 'package.json')),
  'Frontend package.json not found'
);

check(
  'Frontend vite.config.js exists',
  existsSync(join(__dirname, 'frontend', 'vite.config.js')),
  'Frontend vite.config.js not found'
);

// Check package.json scripts
if (existsSync(join(__dirname, 'backend', 'package.json'))) {
  const backendPkg = JSON.parse(
    readFileSync(join(__dirname, 'backend', 'package.json'), 'utf8')
  );
  
  check(
    'Backend has start script',
    backendPkg.scripts && backendPkg.scripts.start,
    'Add "start" script to backend package.json'
  );
  
  check(
    'Backend has engines specified',
    backendPkg.engines && backendPkg.engines.node,
    'Add "engines" field to backend package.json'
  );
}

if (existsSync(join(__dirname, 'frontend', 'package.json'))) {
  const frontendPkg = JSON.parse(
    readFileSync(join(__dirname, 'frontend', 'package.json'), 'utf8')
  );
  
  check(
    'Frontend has build script',
    frontendPkg.scripts && frontendPkg.scripts.build,
    'Add "build" script to frontend package.json'
  );
}

// Check .env files are not committed
check(
  '.env not in git',
  !existsSync(join(__dirname, '.git')) || 
  existsSync(join(__dirname, '.gitignore')) &&
  readFileSync(join(__dirname, '.gitignore'), 'utf8').includes('.env'),
  'Add .env to .gitignore'
);

// Check documentation
check(
  'Deployment guide exists',
  existsSync(join(__dirname, 'RENDER_DEPLOYMENT.md')),
  'Deployment documentation not found'
);

check(
  'Deployment checklist exists',
  existsSync(join(__dirname, 'DEPLOYMENT_CHECKLIST.md')),
  'Deployment checklist not found'
);

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n✅ Project is ready for Render deployment!');
  console.log('\nNext steps:');
  console.log('1. Push code to GitHub');
  console.log('2. Set up MongoDB Atlas');
  console.log('3. Follow RENDER_DEPLOYMENT.md guide');
  console.log('4. Use DEPLOYMENT_CHECKLIST.md during deployment');
  process.exit(0);
} else {
  console.log('\n❌ Project needs fixes before deployment');
  console.log('\nFix the failed checks above and run this script again.');
  process.exit(1);
}
