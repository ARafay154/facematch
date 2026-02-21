const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);
const assetExts = defaultConfig.resolver.assetExts || [];

const config = {
  resolver: {
    assetExts: assetExts.includes('tflite') ? assetExts : [...assetExts, 'tflite'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
