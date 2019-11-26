# GistFS

GistFS is a Visual Studio Code extension that allows you to develop [GitHub Gists](https://gist.github.com/) entirely from within the editor. You can open, create, delete and fork Gists, and then seamlessly begin editing files, as if they were local.

<img src="https://user-images.githubusercontent.com/116461/69490621-b6c03600-0e3f-11ea-9c52-b65bb73885b1.gif" width="800px" />

## Getting Started

1. Install this extension from the marketplace

1. Run the `GistFS: New Gist (Public)`, `GistFS: New Gist (Secret)` or `GistFS: Open Gist` command (depending on which you want), and then when prompted, enter a GitHub token that includes the `gist` scope

    > In order to generate a new token, simply visit [this page](https://github.com/settings/tokens/new), give it a name (e.g. `gistfs`), and then check the `gist` checkbox.

1. Begin editing files, and have them be fully synchronized with the service!

1. When you're done with the Gist, run the `GistFS: Delete Gist` command to delete it

## Contributed Commands

This extension provides the following commands:

* `GistFS: Open Gist` - Prompts you for a Gist ID and then opens it as a virtual workspace.

* `GistFS: New Gist (Public)` - Creates a new [public Gist](https://help.github.com/en/enterprise/2.13/user/articles/about-gists#public-gists), and then opens it as a virtual workspace.

* `GistFS: New Gist (Secret)` - Creates a new [secret Gist](https://help.github.com/en/enterprise/2.13/user/articles/about-gists#secret-gists), and then opens it as a virtual workspace.

* `GistFS: Fork Gist` - Forks the currently opened Gist, and then opens it as a virtual workspace.

* `GistFS: Delete Gist` - Deletes the currently opened Gist, and then closes the folder.

* `GistFS: Sign Out` - Sign out of the currently GitHub session.

## Supported Filesystem Operations

Once you've opened a Gist, you can perform the following filesystem operations:

* Editing existing files
* Adding new files
* Renaming files
* Deleting files
* Copying/pasting files

> GitHub Gist doesn't support directories, and therefore, this extension doesn't allow you to create them.