## v0.0.5 (11/27/2016)

* Introduced the `Gists` view to the `Explorer` tab, which allows you to manage/access your Gists from a single place

    <img width="263" src="https://user-images.githubusercontent.com/116461/69767270-4d3a7300-1130-11ea-9785-fc88c5dda79c.png" />

## v0.0.4 (11/27/2016)

* Improved the `GistFS: Delete Gist` command, by allowing you to select a Gist from your list of Gists, instead of just providing a Gist ID
* Improved the `GistFS: Open Gist` command, by allowing you to select one of your Gists from a list, instead of just providing a Gist ID
* Updated the default behavior of opening gists, to open them as "loose files" instead of as a workspace
* Introduced a new `GistFS: Open Gist as Workspace` command, which behaves the same as `GistFS: Open Gist`, but opens the Gist as a workspace instead of "loose files"
* Added support for being able to seed multiple files when creating a Gist, by specifying a comma-seperated list of files names
* Added a progress indicator when creating a new Gist
* Introduced a new `GistFS: Sign In` command, to explicitly sign in to your GitHub account
* When opening the files for a Gist, Markdown files are now displayed in preview mode by default
* Allow specifying a Gist URL in addition to an ID when opening a Gist

## v0.0.3 (11/26/2016)

* Introduced the `GistFS: List Gists` command, which lets you view your list of gists and then open one
* Introduced the `GistFS: Starred Gists` command, which lets you view your starred of gists and then open one

## v0.0.2 (11/25/2016)

* Replaced the `GistFS: New Gist` command with the following commands, in order to simplify Gist creation: `GistFS: New Gist (Public)`, `GistFS: New Gist (Secret)`

## v0.0.1 (11/24/2016)

Initial release! 🎉