const webpack = require('webpack');

const TerserPlugin = require('terser-webpack-plugin');

const merge = require('webpack-merge');
const devConfig = require('./webpack.config.js');


module.exports = merge(devConfig, {
  // production config here
});