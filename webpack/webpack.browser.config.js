const path = require('path');

const merge = require('webpack-merge');
const devConfig = require('./webpack.config.js');

module.exports = merge(devConfig, {
  // target: 'webworker',
  resolve: {
    alias: {
      '@abstractions': path.join(__dirname, '../src/abstractions/browser')
    }
  },
  node: {
    util: true
  }
});