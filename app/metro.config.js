const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for audio files
config.resolver.assetExts.push('wav', 'ogg');

module.exports = config;