const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

const config = {
  mode: "production",
  entry: "./src/extension.ts",
  externals: {
    vscode: "commonjs vscode"
  },
  resolve: {
    extensions: [".ts", ".js", ".json"]
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
  }
};

const nodeConfig = {
  ...config,
  target: "node",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  resolve: {
    ...config.resolve,
    alias: {
      "@abstractions": path.join(__dirname, "./src/abstractions/node")
    }
  },
  plugins: [
    new CopyPlugin([
      {
        from: path.resolve(
          __dirname,
          "./src/abstractions/node/images/scripts/*"
        ),
        to: path.resolve(__dirname, "./dist/scripts/"),
        flatten: true
      }
    ])
  ]
};

const webConfig = {
  ...config,
  target: "webworker",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension-web.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  resolve: {
    ...config.resolve,
    alias: {
      "@abstractions": path.join(__dirname, "./src/abstractions/browser")
    },
    fallback: {
      "child_process": false,
      "crypto": false,
      "fs": false, // TODO: Implement file uploading in the browser
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "path": require.resolve("path-browserify"),
      "querystring": require.resolve("querystring-es3"),
      "stream": false,
      "url": require.resolve("url/"),
      "util": require.resolve("util/"),
      "zlib": false
    }
  }
};


module.exports = [nodeConfig, webConfig];