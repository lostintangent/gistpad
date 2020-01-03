const devConfig = require("./webpack.config.js");
const merge = require("webpack-merge");
const path = require("path");

module.exports = merge(devConfig, {
  target: "webworker",
  resolve: {
    alias: {
      "@abstractions": path.join(__dirname, "../src/abstractions/browser")
    }
  },
  node: {
    util: true,
    fs: "empty",
    readline: "empty"
  }
});
