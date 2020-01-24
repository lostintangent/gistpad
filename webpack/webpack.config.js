const path = require("path");
const webpack = require("webpack");

const config = {
  mode: "production",
  target: "node",
  entry: "./src/extension.ts",
  output: {
    path: path.resolve(__dirname, "../out/prod"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../../[resource-path]"
  },
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode",
    "uglify-js": "commonjs uglify-js", // Pug relies on uglify-js, which doesn't play nice with Webpack. Fortunately we don't need it, so we exclude it from the bundle
    "aws-sdk": "commonjs aws-sdk", // This comes from the Sass dependency, and is an optional dependency that we don't need
    fsevents: "commonjs fsevents", // This comes from the SaaS dependency, but is a native module and therefore can't be webpacked
    "@microsoft/typescript-etw": "commonjs @microsoft/typescript-etw"
  },
  resolve: {
    extensions: [".ts", ".js", ".json"],
    alias: {
      "@abstractions": path.join(__dirname, "../src/abstractions/node")
    }
  },
  node: {
    __filename: false,
    __dirname: false
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader"
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.SourceMapDevToolPlugin({
      test: /\.ts$/,
      noSources: false,
      module: true,
      columns: true
    })
  ]
};

module.exports = config;
