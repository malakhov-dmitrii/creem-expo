const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const creemExpoPath = path.resolve(__dirname, '../packages/creem-expo');
const demoNodeModules = path.resolve(__dirname, 'node_modules');

// Allow Metro to resolve source files from the creem-expo package
config.watchFolders = [creemExpoPath];

// Ensure ALL react-native related modules resolve from demo-app's node_modules
// (not from creem-expo's node_modules which has an older RN version)
config.resolver.nodeModulesPaths = [demoNodeModules];
config.resolver.extraNodeModules = {
  'react': path.resolve(demoNodeModules, 'react'),
  'react-native': path.resolve(demoNodeModules, 'react-native'),
  'react-native-webview': path.resolve(demoNodeModules, 'react-native-webview'),
  'expo-web-browser': path.resolve(demoNodeModules, 'expo-web-browser'),
  'expo-linking': path.resolve(demoNodeModules, 'expo-linking'),
};

// Block Metro from looking into creem-expo's node_modules
config.resolver.blockList = [
  new RegExp(path.resolve(creemExpoPath, 'node_modules').replace(/[/\\]/g, '[/\\\\]') + '.*'),
];

module.exports = config;
