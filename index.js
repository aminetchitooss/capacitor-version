#!/usr/bin/env node
import chalk from 'chalk';
import gradient from 'gradient-string';
import figlet from 'figlet';
import { createSpinner } from 'nanospinner';
import { writeFile, readFile, stat, readdir } from 'fs/promises';
import { join } from 'path';
const warningList = ['build.gradle', 'Info.plist', 'project.pbxproj'];
const excludedFolders = ['Pod', 'capacitor-cordova-ios-plugins', 'DerivedData'];

async function start() {
  const spinner = createSpinner('Versioning your apps and cool stuff..').start();
  try {
    const packageVersion = await getVersionName();

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
    console.log(gradient.pastel.multiline(data) + '\n');

    console.log(
      chalk.green(`Coding ain't about knowledge; it's about making the command line look cool
      `)
    );
    process.exit(0);
  });
}

/**
 * Returns if the file was found
 * @private
 * @return {Boolean} true if file found
 */
async function findFile(startDir, fileName, cb) {
  const files = await readdir(startDir);

  for (const file of files.filter(d => !excludedFolders.some(f => d.indexOf(f) > -1))) {
    const filePath = join(startDir, file);
    const isDirectory = (await stat(filePath)).isDirectory();

    if (isDirectory) {
      const foundFile = await findFile(filePath, fileName, cb);
      if (foundFile) return foundFile;
    } else if (file === fileName) {
      await cb(filePath);
      return true;
    }
  }

  return false;
}

async function findAllFiles(startDir, fileName, results, cb) {
  if (!results) results = [];
  const files = await readdir(startDir);

  for (const file of files.filter(d => !excludedFolders.some(f => d.indexOf(f) > -1))) {
    const filePath = join(startDir, file);
    const isDirectory = (await stat(filePath)).isDirectory();

    if (isDirectory) {
      await findAllFiles(filePath, fileName, results, cb);
    } else if (file === fileName) {
      await cb(filePath);
      results.push(filePath);
    }
  }

  return results;
}

/**
 * Returns the version Name in package.json
 * @private
 * @return {Number} the new version code
 */
async function getVersionName() {
  try {
    const data = await readFile('package.json', 'utf8');
    const jsonObject = JSON.parse(data);
    const packageVersion = jsonObject.version;
    return packageVersion;
  } catch (error) {
    throw error;
  }
}

/**
 * Writes the new data on the file
 * @private
 */
async function replaceDataFile(filePath, newData, oldData) {
  try {
    if (oldData == newData) {
      warningList.forEach(element => {
        if (filePath.indexOf(element) > -1)
          return console.log(
            `\n\n - ${chalk.bgRgb(255, 165, 0)(filePath.split('/')[0].toUpperCase())} ${chalk.yellowBright(
              chalk.underline(filePath)
            )} has not been updated\n`
          );
      });
    }
    await writeFile(filePath, newData, 'utf8');
  } catch (error) {
    throw error;
  }
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
    const pbxProjeFile = await findFile('ios', 'project.pbxproj', async filePath => {
      const fileData = await readFile(filePath, 'utf8');
      const updatedFileAndBundleVersion = get_Updated_Version_iOS_proj_File_With_New_Version(fileData, versionName);
      newBundleVersion = updatedFileAndBundleVersion.bundleVersion;
      await replaceDataFile(filePath, updatedFileAndBundleVersion.iosFile, fileData);
    });
    if (!pbxProjeFile) throw Error('Make sure you run this command in root folder');

    const pListFile = await findAllFiles('ios', 'Info.plist', [], async filePath => {
      const fileData = await readFile(filePath, 'utf8');
      const updatedContent = get_Updated_Version_iOS_pList_File(fileData, versionName, newBundleVersion);
      await replaceDataFile(filePath, updatedContent, fileData);
    });
    if (!pListFile) throw Error('Make sure you run this command in root folder');
  } catch (error) {
    throw error;
  }
}

/**
 * Returns both the bundleVersion and the data of the project.pbxproj File with updated CURRENT_PROJECT_VERSION
 * @private
 * @param {String} iosFile The data of the project.pbxproj File
 * @param {String} versionName The full version string
 * @return {Number} the new version code
 */
function get_Updated_Version_iOS_proj_File_With_New_Version(iosFile, versionName) {
  let bundleVersion = getNewVersionCode(null, versionName);
  iosFile = iosFile.replace(/CURRENT_PROJECT_VERSION = (.*?);/, (_, capturedValue) => {
    bundleVersion = getNewVersionCode(parseInt(capturedValue, 10), versionName);
    return `CURRENT_PROJECT_VERSION = ${bundleVersion};`;
  });

  return { iosFile, bundleVersion };
}

/**
 * Returns the data of the Info.plist File with updated CFBundleVersion and CFBundleShortVersionString
 * @private
 * @param {String} iosFile The data of the Info.plist File
 * @param {String} versionName The full version string
 * @return {Number} the new version code
 */
function get_Updated_Version_iOS_pList_File(iosFile, versionName, bundleVersion) {
  iosFile = iosFile.replace(/<key>CFBundleVersion<\/key>\s*<string>.*?<\/string>/, function (match, cg1) {
    const versionUpdatedContent = match.replace(/<string>(.*?)<\/string>/, (_, capturedValue) => {
      // return `<string>${getNewVersionCode(parseInt(capturedValue, 10), versionName)}<\/string>`;
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
    const androidFile = await findFile('android/app', 'build.gradle', async filePath => {
      const fileData = await readFile(filePath, 'utf8');
      const updatedContent = replace_Version_In_gradle_File(fileData, versionName);
      await replaceDataFile(filePath, updatedContent, fileData);
    });
    if (!androidFile) throw Error('Make sure you run this command in root folder');
  } catch (error) {
    throw error;
  }
}

/**
 * Returns the data of the gradle File with updated versionCode
 * @private
 * @param {String} gradleFile The data of the gradle File
 * @param {String} versionName The full version string
 * @return {Number} the new version code
 */
function replace_Version_In_gradle_File(gradleFile, versionName) {
  gradleFile = gradleFile.replace(/versionCode (\d+)/, function (_, cg1) {
    const newVersionCodeNumber = getNewVersionCode(parseInt(cg1, 10), versionName);
    return 'versionCode ' + newVersionCodeNumber;
  });
  gradleFile = gradleFile.replace(/versionName (["'])(.*)["']/, 'versionName $1' + versionName + '$1');
  return gradleFile;
}

/**
 * Returns the new version code based on program options
 * @private
 * @param {String} versionName The full version string
 * @return {Number} the new version code
 */
function getNewVersionCode(versionCode, versionName) {
  return versionCode ? versionCode + 1 : generateVersionCode(versionName);
}

/**
 * Returns version code from a standard version name
 * @private
 * @param {String} versionName The full version string
 * @return {Number} e.g. returns 1002003 for given version 1.2.3
 */
function generateVersionCode(versionName) {
  const [major, minor, patch] = versionName.split('.');

  return Math.pow(10, 6) * major + Math.pow(10, 3) * minor + patch;
}

const version = await start();
endProcess(version);
