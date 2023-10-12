import { writeFile, stat, readdir, readFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

const warningList = ['build.gradle', 'Info.plist', 'project.pbxproj'];
const excludedFolders = ['Pod', 'capacitor-cordova-ios-plugins', 'DerivedData'];

const Utils = {
  overrideTimeStamp: false,
  buildId: 0,
  /**
   * Returns the version Name in package.json
   * @private
   * @return {Number} the new version code
   */
  getVersionName: async function () {
    try {
      const data = await readFile('package.json', 'utf8');
      const jsonObject = JSON.parse(data);
      const packageVersion = jsonObject.version;
      return packageVersion;
    } catch (error) {
      throw error;
    }
  },
  findFile: async function (startDir, fileName, cb) {
    const files = await readdir(startDir);

    for (const file of files.filter(d => !excludedFolders.some(f => d.indexOf(f) > -1))) {
      const filePath = join(startDir, file);
      const isDirectory = (await stat(filePath)).isDirectory();

      if (isDirectory) {
        const foundFile = await Utils.findFile(filePath, fileName, cb);
        if (foundFile) return foundFile;
      } else if (file === fileName) {
        await cb(filePath);
        return true;
      }
    }

    return false;
  },

  findAllFiles: async function (startDir, fileName, results, cb) {
    if (!results) results = [];
    const files = await readdir(startDir);

    for (const file of files.filter(d => !excludedFolders.some(f => d.indexOf(f) > -1))) {
      const filePath = join(startDir, file);
      const isDirectory = (await stat(filePath)).isDirectory();

      if (isDirectory) {
        await Utils.findAllFiles(filePath, fileName, results, cb);
      } else if (file === fileName) {
        await cb(filePath);
        results.push(filePath);
      }
    }

    return results;
  },

  replaceDataFile: async function (filePath, newData, oldData) {
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
  },
  /**
   * Returns the new version code based on program options
   * @private
   * @param {String} versionName The full version string
   * @return {Number} the new version code
   */
  getNewVersionCode: function (versionCode, versionName) {
    this.buildId = this.overrideTimeStamp
      ? Utils.generateVersionCode(versionName, true)
      : versionCode
      ? versionCode + 1
      : Utils.generateVersionCode(versionName);

    return this.buildId;
  },

  /**
   * Returns version code from a standard version name
   * @private
   * @param {String} versionName The full version string
   * @return {Number} e.g. returns 1002003 for given version 1.2.3
   */
  generateVersionCode: function (versionName) {
    if (this.overrideTimeStamp) return this.buildId;

    const [major, minor, patch] = versionName.split('.');

    return Math.pow(10, 6) * major + Math.pow(10, 3) * minor + patch;
  },

  handleChangingFileWithPattern: async function (filePath, versionName, functionName, newBundleVersion) {
    const fileData = await readFile(filePath, 'utf8');
    const updatedContent = newBundleVersion ? functionName(fileData, versionName, newBundleVersion) : functionName(fileData, versionName);
    if (updatedContent?.iosFile) {
      await Utils.replaceDataFile(filePath, updatedContent.iosFile, fileData);
      return { bundleVersion: updatedContent.bundleVersion };
    } else await Utils.replaceDataFile(filePath, updatedContent, fileData);
  },

  parseCommandLineArgs: function () {
    const args = process.argv.slice(2).join('=').split('=').join(' ').split(' ');
    const timestamp = args.some(a => a == '--timestamp');
    const argsDict = {
      timestamp: false
    };

    let currentKey;

    for (const arg of args) {
      if (arg.startsWith('--')) {
        // If the argument starts with '--', it's a key
        currentKey = arg.slice(2);
        argsDict[currentKey] = null; // Initialize with null value
      } else if (currentKey !== null) {
        // If we have a current key, set its value
        argsDict[currentKey] = arg;
        currentKey = null; // Reset the current key
      }
    }
    argsDict.timestamp = argsDict.timestamp?.toString() != 'false' ? timestamp : false;
    this.overrideTimeStamp = argsDict.timestamp;
    if (argsDict.timestamp) this.buildId = Math.round(Date.now() / 1000);
  }
};

export default Utils;
