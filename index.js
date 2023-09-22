#!/usr/bin/env node
import chalk from 'chalk';
import gradient from 'gradient-string';
import figlet from 'figlet';
import { createSpinner } from 'nanospinner';
import { readFile } from 'fs/promises';
import Utils from './utils.js';

async function start() {
  const spinner = createSpinner('Versioning your apps and cool stuff..').start();
  try {
    const packageVersion = await Utils.getVersionName();

    await updateVersionForAndroid(packageVersion);

    await updateVersionForIOS(packageVersion);

    spinner.success({ text: `You're all set` });
    return packageVersion;
  } catch (error) {
    spinner.error({ text: `💀💀💀 Game over, Something clearly went wrong!` });
    console.log(error);
    process.exit(1);
  }
}

function endProcess(version) {
  figlet(`${version}`, (err, data) => {
    console.log(gradient.atlas.multiline(data) + '\n');

    console.log(
      chalk.green(`Coding ain't about knowledge; it's about making the command line look cool
      `)
    );
    process.exit(0);
  });
}

/**********************************************iOS************************************************************** */

/**
 * Updates version For Android
 * @private
 * @param {String} versionName The full version string
 */
async function updateVersionForIOS(versionName) {
  try {
    let newBundleVersion = 1;
    const pbxProjeFile = await Utils.findFile('ios', 'project.pbxproj', async filePath => {
      const fileData = await readFile(filePath, 'utf8');
      const updatedFileAndBundleVersion = get_Updated_Version_iOS_proj_File_With_New_Version(fileData, versionName);
      newBundleVersion = updatedFileAndBundleVersion.bundleVersion;
      await Utils.replaceDataFile(filePath, updatedFileAndBundleVersion.iosFile, fileData);
    });
    if (!pbxProjeFile) throw Error('Make sure you run this command in root folder');

    const pListFile = await Utils.findAllFiles('ios', 'Info.plist', [], async filePath => {
      const fileData = await readFile(filePath, 'utf8');
      const updatedContent = get_Updated_Version_iOS_pList_File(fileData, versionName, newBundleVersion);
      await Utils.replaceDataFile(filePath, updatedContent, fileData);
    });
    if (!pListFile) throw Error('Make sure you run this command in root folder');
  } catch (error) {
    throw error;
  }
}

function get_Updated_Version_iOS_proj_File_With_New_Version(iosFile, versionName) {
  let bundleVersion = Utils.getNewVersionCode(null, versionName);
  iosFile = iosFile.replace(/CURRENT_PROJECT_VERSION = (.*?);/, (_, capturedValue) => {
    bundleVersion = Utils.getNewVersionCode(parseInt(capturedValue, 10), versionName);
    return `CURRENT_PROJECT_VERSION = ${bundleVersion};`;
  });
  iosFile = iosFile.replace(/MARKETING_VERSION = (.*?);/, (_, __) => {
    return `MARKETING_VERSION = ${versionName};`;
  });

  return { iosFile, bundleVersion };
}

function get_Updated_Version_iOS_pList_File(iosFile, versionName, bundleVersion) {
  iosFile = iosFile.replace(/<key>CFBundleVersion<\/key>\s*<string>.*?<\/string>/, function (match, cg1) {
    const versionUpdatedContent = match.replace(/<string>(.*?)<\/string>/, (_, capturedValue) => {
      // return `<string>${Utils.getNewVersionCode(parseInt(capturedValue, 10), versionName)}<\/string>`;
      return `<string>${bundleVersion}<\/string>`;
    });
    return versionUpdatedContent;
  });

  iosFile = iosFile.replace(/<key>CFBundleShortVersionString<\/key>\s*<string>.*?<\/string>/, function (match, cg1) {
    const versionUpdatedContent = match.replace(/<string>.*?<\/string>/, `<string>${versionName}<\/string>`);
    return versionUpdatedContent;
  });

  return iosFile;
}

/**********************************************Android************************************************************** */

/**
 * Updates version For Android
 * @private
 * @param {String} versionName The full version string
 */
async function updateVersionForAndroid(versionName) {
  try {
    const androidFile = await Utils.findFile('android/app', 'build.gradle', async filePath => {
      await Utils.handleChangingFileWithPattern(filePath, versionName, replace_Version_In_gradle_File);
    });
    if (!androidFile) throw Error('Make sure you run this command in root folder');
  } catch (error) {
    throw error;
  }
}

function replace_Version_In_gradle_File(gradleFile, versionName) {
  gradleFile = gradleFile.replace(/versionCode (\d+)/, function (_, cg1) {
    const newVersionCodeNumber = Utils.getNewVersionCode(parseInt(cg1, 10), versionName);
    return 'versionCode ' + newVersionCodeNumber;
  });
  gradleFile = gradleFile.replace(/versionName (["'])(.*)["']/, 'versionName $1' + versionName + '$1');
  return gradleFile;
}

const version = await start();
endProcess(version);
