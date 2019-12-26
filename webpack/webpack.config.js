/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// @ts-check

"use strict";

const path = require("path");
const webpack = require("webpack");

/**@type {import('webpack').Configuration}*/
const config = {
  //   stats: "minimal",
  mode: "development",
  target: "node", // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

  entry: "./src/extension.ts", // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, "../out/prod"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../../[resource-path]"
  },
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    electron: "electron", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/,
    "uglify-js": "commonjs uglify-js", // Pug relies on uglify-js, which doesn't play nice with Webpack. Fortunately we don't need it, so we exclude it from the bundle
    "aws-sdk": "commonjs aws-sdk" // This comes from the Sass dependency, and is an optional dependency that we don't need
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: [".ts", ".js", ".json"],
    alias: {
      "@abstractions": path.join(__dirname, "../src/abstractions/node")
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            // vscode-nls-dev loader:
            // * rewrite nls-calls
            loader: "vscode-nls-dev/lib/webpack-loader",
            options: {
              base: "."
            }
          },
          {
            loader: "ts-loader"
          }
        ]
      },
      {
        test: /node_modules[\\|/](jsonc-parser)/,
        use: {
          loader: "umd-compat-loader?amd=true"
        }
      }
    ]
  },
  node: {
    __filename: false,
    __dirname: false
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
