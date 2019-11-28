## v0.0.7 (11/28/2016)

* Added a new `Add to Gist` command to the context menu of both the `Explorer` tree and the document editor. This way you can easily add files to a gist

     <img width="260px" src="https://user-images.githubusercontent.com/116461/69831695-58001100-11df-11ea-997e-fc8020556348.png" /> <img width="400px" src="https://user-images.githubusercontent.com/116461/69831691-53d3f380-11df-11ea-8578-266e27ec4d43.png" />
    
* Added the `Copy Contents` command to the `Gists` view, which allows you to copy file contents and paste them into other files
* Updated the `Add Active File` command within the `Gists` view to support "untitled" files

## v0.0.6 (11/28/2016)

* Renamed the existing from `GistFS` to `GistPad`, to best reflect it's purpose
* Introduced a `GistPad` tab, to allow you choose between managing Gists in it's own side-bar, or via the `Gists` view on the `Explorer` tab
* Added the `Change Description` command to the `Gists` view, which allows changing an existing Gist's description
* Added the `Rename File` command to the `Gists` view, which allows renaming an existing file in a Gist
* Added the `Add Active File` command to the `Gists` view, which allows "uploading" the active editor to the specified Gist
* Remove the username prefix from the display name of your own Gists
* Added a lock icon (🔒) suffix to the display name of secret Gists

## v0.0.5 (11/27/2016)

* Introduced the `Gists` view to the `Explorer` tab, which allows you to manage/access your Gists from a single place

     <img width="300px" src="https://user-images.githubusercontent.com/116461/69827991-d56f5580-11ce-11ea-9081-17f27b470fd1.png" />

## v0.0.4 (11/27/2016)

* Improved the `GistPad: Delete Gist` command, by allowing you to select a Gist from your list of Gists, instead of just providing a Gist ID
* Improved the `GistPad: Open Gist` command, by allowing you to select one of your Gists from a list, instead of just providing a Gist ID
* Updated the default behavior of opening gists, to open them as "loose files" instead of as a workspace
* Introduced a new `GistPad: Open Gist as Workspace` command, which behaves the same as `GistPad: Open Gist`, but opens the Gist as a workspace instead of "loose files"
* Added support for being able to seed multiple files when creating a Gist, by specifying a comma-seperated list of files names
* Added a progress indicator when creating a new Gist
* Introduced a new `GistPad: Sign In` command, to explicitly sign in to your GitHub account
* When opening the files for a Gist, Markdown files are now displayed in preview mode by default
* Allow specifying a Gist URL in addition to an ID when opening a Gist

## v0.0.3 (11/26/2016)

* Introduced the `GistPad: List Gists` command, which lets you view your list of gists and then open one
* Introduced the `GistPad: Starred Gists` command, which lets you view your starred of gists and then open one

## v0.0.2 (11/25/2016)

* Replaced the `GistPad: New Gist` command with the following commands, in order to simplify Gist creation: `GistPad: New Gist (Public)`, `GistPad: New Gist (Secret)`

## v0.0.1 (11/24/2016)

Initial release! 🎉