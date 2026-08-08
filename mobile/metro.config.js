const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  maxWorkers: 0,
  resolver: {
    blockList: [
      /.*[/\\]android[/\\]\.cxx[/\\].*/,
      /.*[/\\]node_modules[/\\]react-native-reanimated[/\\]android[/\\]\.cxx[/\\].*/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
