#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// copy non-ts directories from src to dist/src
const dirs = [
  'src/integrations/plaid/.tmp',
  'src/services/scripts/.tmp',
  'src/templates',
];

const files = [
  'src/lib/companyTextMatch.py',
];

const copyDirs = () => {
  console.log('copying non-ts directory contents to /dist...');
  for (const dir of dirs) {
    // create .tmp dir in dist/src/integrations/plaid if doesnt already exist
    const destination = path.resolve('dist', dir);
    if (!fs.existsSync(destination)) {
      execSync(`mkdir ${destination}`);
    }

    execSync(`cp -R ${path.resolve(dir)}/* ${destination}`);
  }

  console.log('[+] static non-ts directory contents copied to /dist successfully\n');
};

const copyFiles = () => {
  console.log('copying non-ts files to /dist...');

  for (const file of files) {
    execSync(`cp ${path.resolve(file)} ${path.resolve('dist', file)}`);
  }

  console.log('[+] non-ts files copied to /dist successfully\n');
};

(() => {
  copyDirs();
  copyFiles();
})();
