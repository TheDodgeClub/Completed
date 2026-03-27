const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Exclude @zxing/library tmp directories from file watching (they get created then removed during install)
config.resolver = config.resolver || {};
config.resolver.blockList = [
  /node_modules\/\.pnpm\/@zxing\+library[^/]*\/node_modules\/@zxing\/library_tmp_/,
];

module.exports = config;
