// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// The design handoff kit ships loose .jsx prototypes that are design references,
// not app source. Keep them out of the module graph so Metro neither bundles
// them nor treats their folders as packages.
const designKit = path.resolve(__dirname, 'design_handoff_spice_route_app');
const escaped = designKit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [new RegExp(`^${escaped}[/\\\\].*$`)];

module.exports = config;
