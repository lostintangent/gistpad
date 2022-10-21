
# Contributing to GistPad

Thank you for your interest in contributing to GistPad! 

The goal of this documentation is to provide a high-level overview of how you can build and debug the project. This guide will explain the process of setting up your development environment to work on the Gistpad extension, as well as the process of sending out your change for review.

## Table of Contents

- **[Before you start coding](#before-you-start-coding)**
- **[Developing](#developing)**
  - [Setup](#setup)
  - [Run](#run)
  - [Debug](#debug)
  - [Sideload](#sideloading-the-extension)
- **[Submit your change for review](#submit-your-change-for-review)

## Before you start coding

If you are interested in fixing a bug or contributing a feature, please [file an issue first](https://github.com/lostintangent/gistpad/issues/new/choose). Wait for a project maintainer to respond before you spend time coding.

If you wish to work on an existing issue, please add a comment saying so, as someone may already be working on it. A project maintainer may respond with advice on how to get started. If you're not sure which issues are available, search for issues with the help wanted label.

## Developing

### Setup

1. Ensure you have [node](https://nodejs.org/en/) installed.
- Note: make sure that you are using npm v7 or higher. The file format for package-lock.json [changed significantly](https://docs.npmjs.com/cli/v7/configuring-npm/package-lock-json#file-format) in npm v7.

2. Clone the repository, run `npm install`, and open a development instance of VS Code:

```bash
git clone https://github.com/vsls-contrib/gistpad.git 
cd gistpad
npm install
code .
```

### Run

To run the extension with your patch, open the Run view (`Ctrl+Shift+D` or `⌘+⇧+D`), select Launch Extension, and click Run (`F5`).

This will open a new VS Code window with the title `[Extension Development Host]`.  In this window, open the GistPad tab from the sidebar. 

### Debug

You can go to the Debug viewlet (`Ctrl+Shift+D`) and select `Run Extension (watch)` then hit run (`F5`). 

If you make subsequent edits in the codebase, you can reload (`Ctrl+R` or `⌘+R`) the `[Extension Development Host]` instance of VS Code, which will load the new code. The debugger will automatically reattach.

In the original VS Code window, you can now add breakpoints which will be hit when you use any of the the plugin's features in the second window.

#### Lint

You can run `npm run lint` on the command-line to check for lint errors in your program. You can also use the [TSLint](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-tslint-plugin) plugin to see errors as you code.

## Sideloading the extension

After making changes to the extension, you might want to test it end to end instead of running it in debug mode. To do this, you can sideload the extension. This can be done by preparing the extension and loading it directly.

1. `npm install -g vsce` to make sure you have vsce installed globally
2. `git clone https://github.com/vsls-contrib/gistpad.git` to clone the repo if you haven't already done so
3. `cd gistpad`
4. `npm install` to install dependencies if you haven't already done so
5. `vsce package` to build the package. This will generate a file with extension `vsix`
6. Run the command `Extensions: Install from VSIX...`, choose the vsix file generated in the previous step

For more information on using GistPad extension, follow the instructions for [getting started](https://github.com/vsls-contrib/gistpad#getting-started).

## Submit your change for review

Once you have coded, built, and tested your change, it's ready for review!

- Your change should include tests (if possible).
- Your commit message should be descriptive, provide context, and reference any issues it addresses. 

Example:

```bash
Refactor func Foo.
This will make the handling of <corner case>
shorter and easier to test.

For #nnnn
```

## Attribution

This documentation is adapted from the Microsoft / vscode-go, available [here](https://github.com/golang/vscode-go/wiki/contributing#developing).
