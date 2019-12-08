const path = require("path");
const merge = require("webpack-merge");
const devConfig = require("./webpack.config.js");

const CopyPlugin = require('copy-webpack-plugin');

module.exports = merge(devConfig, {
  plugins: [
    new CopyPlugin(
      [{
        from: path.resolve(__dirname, '../src/abstractions/node/commands/scripts/*'),
        to: path.resolve(__dirname, '../out/prod/scripts/'),
        flatten: true,
      }]
    )
  ]
});