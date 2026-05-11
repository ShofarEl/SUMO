#!/usr/bin/env node

/**
 * Verify frontend is ready for Vercel deployment
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

console.log('🔍 Verifying Vercel deployment readiness...\n');

// Check vercel.json exists
check(
  'vercel.json exists',
  existsSync(join(__dirname, 'vercel.json')),
  'Create vercel.json in project root'
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

// Check environment files
check(
  'Frontend .env.production exists',
  existsSync(join(__dirname, 'frontend', '.env.production')),
  'Create .env.production in frontend directory'
);

check(
  'Frontend .env.example exists',
  existsSync(join(__dirname, 'frontend', '.env.example')),
  'Create .env.example in frontend directory'
);

// Check .env.production has correct backend URL
if (existsSync(join(__dirname, 'frontend', '.env.production'))) {
  const envContent = readFileSync(join(__dirname, 'frontend', '.env.production'), 'utf8');
  
  check(
    'VITE_API_URL configured',
    envContent.includes('VITE_API_URL=https://sumo-d68k.onrender.com'),
    'Update VITE_API_URL in .env.production'
  );
  
  check(
    'VITE_WS_URL configured',
    envContent.includes('VITE_WS_URL=https://sumo-d68k.onrender.com'),
    'Update VITE_WS_URL in .env.production'
  );
}

// Check package.json scripts
if (existsSync(join(__dirname, 'frontend', 'package.json'))) {
  const frontendPkg = JSON.parse(
    readFileSync(join(__dirname, 'frontend', 'package.json'), 'utf8')
  );
  
  check(
    'Frontend has build script',
    frontendPkg.scripts && frontendPkg.scripts.build,
    'Add "build" script to frontend package.json'
  );
  
  check(
    'Frontend has preview script',
    frontendPkg.scripts && frontendPkg.scripts.preview,
    'Add "preview" script to frontend package.json'
  );
}

// Check if frontend builds
console.log('\n📦 Testing frontend build...');
try {
  const { execSync } = await import('child_process');
  execSync('cd frontend && npm run build', { 
    stdio: 'pipe',
    encoding: 'utf8'
  });
  check(
    'Frontend builds successfully',
    true,
    ''
  );
  
  check(
    'Build output exists',
    existsSync(join(__dirname, 'frontend', 'dist', 'index.html')),
    'Build did not create dist/index.html'
  );
} catch (error) {
  check(
    'Frontend builds successfully',
    false,
    'Run: cd frontend && npm run build'
  );
}

// Check documentation
check(
  'Vercel deployment guide exists',
  existsSync(join(__dirname, 'VERCEL_DEPLOYMENT.md')),
  'Deployment documentation not found'
);

check(
  'CORS update guide exists',
  existsSync(join(__dirname, 'UPDATE_CORS.md')),
  'CORS update guide not found'
);

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n✅ Frontend is ready for Vercel deployment!');
  console.log('\n📋 Deployment Steps:');
  console.log('1. Push code to GitHub');
  console.log('2. Go to https://vercel.com/new');
  console.log('3. Import your repository');
  console.log('4. Click Deploy (Vercel auto-detects config)');
  console.log('5. After deploy, update backend CORS (see UPDATE_CORS.md)');
  console.log('\n📖 Full guide: VERCEL_DEPLOYMENT.md');
  process.exit(0);
} else {
  console.log('\n❌ Frontend needs fixes before deployment');
  console.log('\nFix the failed checks above and run this script again.');
  process.exit(1);
}
