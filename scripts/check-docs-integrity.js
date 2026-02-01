import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const REQUIRED_FILES = [
  'docs/basic/intro.md',
  'docs/basic/quick-start.md',
  'docs/basic/configuration.md',
  'src/benchmark/README.md',
];

console.log('Starting Document Integrity Check...');

let missingFiles = 0;

REQUIRED_FILES.forEach((file) => {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing required file: ${file}`);
    missingFiles++;
  } else {
    console.log(`✅ Found: ${file}`);
  }
});

// Check for empty directories in docs
function checkEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  if (files.length === 0) {
    console.warn(`⚠️ Warning: Empty directory found: ${dir}`);
    return;
  }

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      checkEmptyDirs(fullPath);
    }
  });
}

checkEmptyDirs(path.join(rootDir, 'docs'));

if (missingFiles > 0) {
  console.error(`\nFAILED: Found ${missingFiles} missing required documentation files.`);
  process.exit(1);
} else {
  console.log('\nPASSED: All required documentation files exist.');
  process.exit(0);
}
