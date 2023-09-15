#!/usr/bin/env node
import chalk from 'chalk';
import gradient from 'gradient-string';
import figlet from 'figlet';
import { createSpinner } from 'nanospinner';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

const sleep = (ms = 2000) => new Promise(r => setTimeout(r, ms));

async function welcome() {
  console.log(`
    ${chalk.bgCyan('Welcome to our capacitor version setup')} 
  `);
}

async function start() {
  const spinner = createSpinner('Versioning your apps and cool stuff..\n').start();

  try {
    const data = await readFile('package.json', 'utf8');
    const jsonObject = JSON.parse(data);
    console.log('oiiii', jsonObject.version);
    console.log(jsonObject.version);

    await sleep(500);
    spinner.success({ text: `You're all set` });
  } catch (error) {
    spinner.error({ text: `💀💀💀 Game over, Something clearly went wrong!` });
    console.log(error);
    process.exit(1);
  }
}

async function createPrettierFile() {
  const prettierContent = `{
  "arrowParens": "avoid",
  "singleQuote": true,
  "bracketSpacing": true,
  "endOfLine": "lf",

  "semi": true,
  "htmlWhitespaceSensitivity": "ignore",
  "bracketSameLine": true
}`;

  await writeFile('.prettierrc', prettierContent, 'utf8');

  await writeFile(join('.vscode', 'settings.json'), formatOnsaveContent, 'utf8');
  execSync('npx prettier --write .');
}

function endProcess() {
  figlet(`Tchitos!\n at your service.`, (err, data) => {
    console.log(gradient.pastel.multiline(data) + '\n');

    console.log(
      chalk.green(`Coding ain't about knowledge; it's about making the command line look cool
      `)
    );
    process.exit(0);
  });
}

await welcome();
await start();
process.exit(0);

// endProcess();
