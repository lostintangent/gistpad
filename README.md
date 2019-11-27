# GistFS

GistFS is a Visual Studio Code extension that allows you to develop [GitHub Gists](https://gist.github.com/) entirely from within the editor. You can open, create, delete and fork Gists, and then seamlessly begin editing files, as if they were local.

<img src="https://user-images.githubusercontent.com/116461/69490621-b6c03600-0e3f-11ea-9c52-b65bb73885b1.gif" width="800px" />

## Getting Started

1. Install this extension from the marketplace

    > **Linux Users**: Ensure you have the `gnome-keyring` and `libsecret` packages installed as well. These will enable GistFS to read/write your GitHub auth token securely.

1. Run the `GistFS: New Gist`, `GistFS: New Gist (Secret)` or `GistFS: Open Gist` command (depending on which you want), and then when prompted, enter a GitHub token that includes the `gist` scope

    <img width="466" src="https://user-images.githubusercontent.com/116461/69696114-94941580-10d6-11ea-80a6-94b6735a5596.png" />

    > In order to generate a new token, simply visit [this page](https://github.com/settings/tokens/new), give it a name (e.g. `gistfs`), and then check the `gist` checkbox.

1. Begin editing files, and rest assured that they'll be fully synchronized with the service!

1. When you're done with the Gist, run the `GistFS: Delete Gist` command to delete it

    <img width="550px" src="https://user-images.githubusercontent.com/116461/69696163-bb524c00-10d6-11ea-98dc-c2ae643fa4bc.png" />

## Available Commands

This extension provides the following commands:

* `GistFS: Open Gist` - Displays your list of Gists (if you're signed in), and then opens the files for the selected one. You can also specify a Gist ID directly, which doesn't require being signed in.

* `GistFS: Open Gist as Workspace` - Same behavior as the `GistFS: Open Gist` command, but will open the selected Gist as a workspace, istead of "loose files".

* `GistFS: New Gist` - Creates a new [public Gist](https://help.github.com/en/enterprise/2.13/user/articles/about-gists#public-gists), and then opens its associated files. If you'd like to seed the gist with multiple files, you can specify a comma-seperated list of names (e.g. `foo.txt,bar.js`).

* `GistFS: New Gist (Secret)` - Same behavior as the `GistFS: New Gist (Public)` command, except that it creates a [secret Gist](https://help.github.com/en/enterprise/2.13/user/articles/about-gists#secret-gists).

* `GistFS: Delete Gist` - Allows you to delete one of your Gists. If you have a Gist workspace open, it will delete that and then close the folde

* `GistFS: Starred Gists` - Lists your starred Gists, and then opens the files for the selected one.

* `GistFS: Fork Gist` - Forks the currently opened Gist, and then opens it as a virtual workspace.

* `GistFS: Sign In` - Sign-in with a GitHub token, in order to view/edit/delete your Gists.

* `GistFS: Sign Out` - Sign out of the currently authenticated GitHub session.

## Supported Filesystem Operations

Once you've opened a Gist, you can perform the following filesystem operations:

* Editing existing files
* Adding new files
* Renaming files
* Deleting files
* Copying/pasting files

> GitHub Gist doesn't support directories, and therefore, this extension doesn't allow you to create them.