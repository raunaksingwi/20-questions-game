const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for audio files
config.resolver.assetExts.push('wav', 'ogg');

// Ensure @expo/vector-icons fonts are included in web builds
config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');

module.exports = config;