const CopyPlugin = require("copy-webpack-plugin");
const devConfig = require("./webpack.config.js");
const path = require("path");
const merge = require("webpack-merge");

module.exports = merge(devConfig, {
  plugins: [
    new CopyPlugin([
      {
        from: path.resolve(
          __dirname,
          "../src/abstractions/node/images/scripts/*"
        ),
        to: path.resolve(__dirname, "../out/prod/scripts/"),
        flatten: true
      }
    ])
  ]
});
