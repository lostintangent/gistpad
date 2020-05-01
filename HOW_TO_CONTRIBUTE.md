
# Contributing to GistPad Project

Thank you for your interest in contributing to GistPad! 
The goal of this documentation is to provide a high-level overview of how discovered issues are reported and you can build the project for your technical contributions.  

# Reporting an issue 

For reporting an issue or submitting your contributions, please fill out the coresponding templates:

* Bug report

* Feature request

* Pull request

as throughly as possible. 

# Building, Debugging and Sildeloading the extension in Visual Studio Code:

## Building and Debugging the extension

Ensure you have [node](https://nodejs.org/en/) installed.
Clone the repo, run `npm install` and open a development instance of Code.

```bash
git clone https://github.com/vsls-contrib/gistpad.git 
cd gistpad
npm install
code .
```

You can now go to the Debug viewlet (`Ctrl+Shift+D`) and select `Run Extension (watch)` then hit run (`F5`).

This will open a new VS Code window which will have the title `[Extension Development Host]`. In this window, open the GistPad tab from the sidebar. 

In the original VS Code window, you can now add breakpoints which will be hit when you use any of the the plugin's features in the second window.

## Sideloading the extension
After making changes to the extension, you might want to test it end to end instead of running it in debug mode. To do this, you can sideload the extension. This can be done by preparing the extension and loading it directly.

1. `npm install -g vsce` to make sure you have vsce installed globally
2. `git clone https://github.com/vsls-contrib/gistpad.git` to clone the repo if you haven't already done so
3. `cd gistpad`
4. `npm install` to install dependencies if you haven't already done so
5. `vsce package` to build the package. This will generate a file with extension `vsix`
6. Run the command `Extensions: Install from VSIX...`, choose the vsix file generated in the previous step

For more information on using GistPad extension, follow the instructions for [getting started](https://github.com/shfarazi/gistpad/tree/documentation#getting-started).

## Attribution

This documentation is adapted from the Microsoft / vscode-go, available at
https://github.com/Microsoft/vscode-go/wiki/Building,-Debugging-and-Sideloading-the-extension-in-Visual-Studio-Code.



