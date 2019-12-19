## v0.0.22 (12/18/2019)

- Introduced the concept of a Gist "Web Playground", which allows you to do rapid prototyping of web front-end code, that's backed by a Gist

  ![Playground](https://user-images.githubusercontent.com/116461/71146928-fe867300-21db-11ea-9244-9d1e865ddfba.gif)

- Updated the `Delete Gist` command, to automatically close all opened editors that were associated with the deleted gist
- Fixed a bug where the `Gists` tree view sometimes not rendering properly
- Fixed a bug in the `Open Gist as Workspace` command that would open the Gist files multiple times

## v0.0.21 (12/15/2019)

- Improving auth reliability, by detecting whether or not a specified token includes the `gist` scope or not.

## v0.0.20 (12/15/2019)

- Introduced support for SSO with the `git` CLI, when you've authenticated with github.com. To disable this, you can set the new `GistPad: Git SSO` setting to `false`.

## v0.0.19 (12/15/2019)

- Added the `Open Profile in GitHub` context menu to the `Your Gists` tree node, which allows opening your Gist profile page
- Added the `Open GistLog Feed` context menu to the `Your Gists` tree node, which allows opening your GistLog feed page

## v0.0.18 (12/14/2019)

- Introduced support for creating [GistLog](https://gistlog.co) posts via a new `GistPad: New GistLog` command

  ![GistLog](https://user-images.githubusercontent.com/116461/70856110-fdc3a900-1e8a-11ea-8e26-2c3917e11db0.gif)

- Added a new `Open Gist in GistLog` context menu to gists, that allows you to view an existing Gist on [GistLog](https://gistlog.co)
- Exposed the `New Public Gist`, `New Secret Gist` and `New GistLog` commands via the context menu on the `Your Gists` tree node
- Introduced a new `Gistpad: Show Comment Thread` configuration option, that allows you to configure when the Gist comment thread UI is displayed.

## v0.0.17 (12/12/2019)

- Added a new `Open Gist in NbViewer` context menu to gists, that allows you to open Gists with Jupyter Notebooks in the [Jupyter Nbviewer](https://nbviewer.jupyter.org/)
- Fixed a bug, that impacted Gist files with special characters in their name (e.g. `*`, `?`)
- Fixed a bug with comment threads, that ensure they're always displayed at the bottom of the file, even after making edits

## v0.0.16 (12/11/2019)

- Added a new `Clone Repository` context menu to gists, that allows you to clone a gist's repository locally
- Introduced a new `gistpad.apiUrl` setting, which allows users to use GitHub Enterprise servers

## v0.0.15 (12/08/2019)

- Added support for opening image files in a Gist, and viewing their preview
- Added a new `Copy URL` context menu item to Gist files, in order to quickly get their "raw URL"
- Add the ability to open gists with a custom protocol handler:

  - `Using gist URL`: vscode://vsls-contrib.gistfs/open-gist?url=https://gist.github.com/legomushroom/b01737ed99192dab436adea1d6d92975
  - `Using gist Id`: vscode://vsls-contrib.gistfs/open-gist?id=b01737ed99192dab436adea1d6d92975

## v0.0.14 (12/07/2019)

- 🖼️ Implement the `Paste Screenshot` command that allows to paste a screenshot from your clipboard into the gist.

  ![paste-screenshot](https://user-images.githubusercontent.com/1478800/70382701-9a7ac980-1914-11ea-9fb0-6e55424e2e54.gif)

- Removed the extension dependencies, and simply document them as being recommended in the readme

## v0.0.13 (12/07/2019)

- Gists are now sorted by their last update time, not alphabetically (in both the tree view and command palette)

## v0.0.12 (12/02/2019)

- Added the ability to view, add, edit and delete comments within the editor 🎉

  <img width="783" src="https://user-images.githubusercontent.com/116461/70117955-a9633280-161b-11ea-88a5-ac8a15a3b7a0.png" />

- Added an extension dependency on the [Markdown All in One](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one) extension
- Allow specifying a Gist URL in addition to an ID when opening a Gist

## v0.0.11 (11/30/2019)

- Added an extension dependency on the [GitHub Markdown Preview](https://marketplace.visualstudio.com/items?itemName=bierner.github-markdown-preview) extension, so that the VS Code markdown preview behaves similarly to GitHub's.

## v0.0.10 (11/30/2019)

- Added a new `Paste Gist File` command to the editor's context menu, which allows you to paste a Gist file into the active editor

## v0.0.9 (11/29/2019)

- Introduced the ability to follow users, so you can browser/access/fork their Gists directly from the `Gists` view

     <img width="252" src="https://user-images.githubusercontent.com/116461/69890797-c03e1800-12ef-11ea-85be-7d6fe2c8c7ef.png" />

* Added a new `Open Gist in Browser` command to the `Gists` view, which opens a Gist in your default browser
* Added a new `Copy Gist URL` command to the `Gists` view, which allows you to copy a Gist's URL to your clipboard

## v0.0.8 (11/29/2019)

- Added a new `Add Selection to Gist` command to the editor context menu. This allows you to add a snippet of code to a Gist, instead to an entire document (via the `Add Document to Gist`).
- Updated the `Gists` view to use the description as the Gist label (or it's file name if there isn't a description)

## v0.0.7 (11/28/2019)

- Added a new `Add Document to Gist` command to the context menu of both the `Explorer` tree and the document editor. This way you can easily add files to a gist

  <img width="260px" src="https://user-images.githubusercontent.com/116461/69831695-58001100-11df-11ea-997e-fc8020556348.png" /> <img width="400px" src="https://user-images.githubusercontent.com/116461/69831691-53d3f380-11df-11ea-8578-266e27ec4d43.png" />

- Added the `Copy Contents` command to the `Gists` view, which allows you to copy file contents and paste them into other files
- Updated the `Add Active File` command within the `Gists` view to support "untitled" files

## v0.0.6 (11/28/2016)

- Renamed the existing from `GistFS` to `GistPad`, to best reflect it's purpose
- Introduced a `GistPad` tab, to allow you choose between managing Gists in it's own side-bar, or via the `Gists` view on the `Explorer` tab
- Added the `Change Description` command to the `Gists` view, which allows changing an existing Gist's description
- Added the `Rename File` command to the `Gists` view, which allows renaming an existing file in a Gist
- Added the `Add Active File` command to the `Gists` view, which allows "uploading" the active editor to the specified Gist
- Remove the username prefix from the display name of your own Gists
- Added a lock icon (🔒) suffix to the display name of secret Gists

## v0.0.5 (11/27/2019)

- Introduced the `Gists` view to the `Explorer` tab, which allows you to manage/access your Gists from a single place

     <img width="300px" src="https://user-images.githubusercontent.com/116461/69827991-d56f5580-11ce-11ea-9081-17f27b470fd1.png" />

## v0.0.4 (11/27/2019)

- Improved the `GistPad: Delete Gist` command, by allowing you to select a Gist from your list of Gists, instead of just providing a Gist ID
- Improved the `GistPad: Open Gist` command, by allowing you to select one of your Gists from a list, instead of just providing a Gist ID
- Updated the default behavior of opening gists, to open them as "loose files" instead of as a workspace
- Introduced a new `GistPad: Open Gist as Workspace` command, which behaves the same as `GistPad: Open Gist`, but opens the Gist as a workspace instead of "loose files"
- Added support for being able to seed multiple files when creating a Gist, by specifying a comma-seperated list of files names
- Added a progress indicator when creating a new Gist
- Introduced a new `GistPad: Sign In` command, to explicitly sign in to your GitHub account
- When opening the files for a Gist, Markdown files are now displayed in preview mode by default

## v0.0.3 (11/26/2019)

- Introduced the `GistPad: List Gists` command, which lets you view your list of gists and then open one
- Introduced the `GistPad: Starred Gists` command, which lets you view your starred of gists and then open one

## v0.0.2 (11/25/2019)

- Replaced the `GistPad: New Gist` command with the following commands, in order to simplify Gist creation: `GistPad: New Gist (Public)`, `GistPad: New Gist (Secret)`

## v0.0.1 (11/24/2019)

Initial release! 🎉
