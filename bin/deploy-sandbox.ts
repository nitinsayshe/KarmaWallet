#!/usr/bin/env node

import util from 'util';
import { exec } from 'child_process';
import { argv } from 'process';

const supportedEnvironments = [
  'sandbox',
];

const execAsync = util.promisify(exec);

const args = process.argv;
args.splice(0, 2);

let branch = '';
let env = '';

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--branch' || args[i] === '-b') && (i + 1) < args.length) {
    branch = argv[i + 1];
  }

  if ((args[i] === '--env' || args[i] === '-e') && (i + 1) < args.length) {
    env = args[i + 1];
  }
}

if (!branch) {
  console.error('ERROR: NO BRANCH FOUND');
  console.log('you can provide a branch like this:\n');
  console.log('npm run deploy:sandboxX -- --branch [branchName]');
  console.log('or');
  console.log('npm run deploy:sandboxX -- -b [branchName]\n');
  process.exit(1);
}

if (!env) {
  console.error('ERROR: NO ENVIRONMENT FOUND');
  console.log('you can provide an environment like this:\n');
  console.log('npm run deploy:sandboxX -- --env [envName]');
  console.log('or');
  console.log('npm run deploy:sandboxX -- -e [envName]\n');
  console.log('supported environments include:');
  console.log(`${supportedEnvironments.join('\n')}\n`);
  process.exit(1);
}

if (!supportedEnvironments.includes(env)) {
  console.error('ERROR: INVALID ENVIRONMENT FOUND');
  console.log(`${env} is not a valid environment.\n`);
  console.log('supported environments include:');
  console.log(`${supportedEnvironments.join('\n')}\n`);
  process.exit(1);
}

const execute = async () => {
  try {
    const { stderr } = await execAsync(`gh workflow run sandbox-deploy.yml -f branch=${branch} -f env=${env}`);

    if (stderr) {
      console.error(stderr);
      process.exit(1);
    }

    console.log('[+] DEPLOYING');
    console.log('visit https://github.com/karmawallet/karmawallet-backend-ts/actions to view the status of this deployment.\n');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const main = async () => {
  try {
    const { stdout, stderr } = await execAsync('git branch -a');

    if (stderr) return console.error(stderr);

    const branches = stdout.split('\n');
    const isValidBranch = !!branches.find(b => b.trim() === `remotes/origin/${branch}`);

    if (!isValidBranch) {
      console.error('ERROR: INVALID BRANCH FOUND');
      console.log(`${branch} is not a valid branch.\n`);
      process.exit(1);
    }

    switch (env) {
      case 'sandbox':
        return execute();
      default:
        console.error('ERROR: SOMETHING WENT WRONG\n');
        process.exit(1);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
