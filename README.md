# GistPad

GistPad is a Visual Studio Code extension that allows you to develop [GitHub Gists](https://gist.github.com/) entirely from within the editor. You can open, create, delete and fork Gists, and then seamlessly begin editing files, as if they were local. It's like your very own, cloud-based scratchpad 🚀

<img src="https://user-images.githubusercontent.com/116461/69490621-b6c03600-0e3f-11ea-9c52-b65bb73885b1.gif" width="800px" />

## Getting Started

1. Install this extension from the marketplace

    > **Linux Users**: Ensure you have the `gnome-keyring` and `libsecret` packages installed as well. These will enable GistPad to read/write your GitHub auth token securely.

1. Open the `Explorer` tab and expand the `Gists` view. From there, you can open a Gist by ID/URL, or sign-in in wth a GitHub token, in order to view/edit/create/delete Gists.

    <img width="263" src="https://user-images.githubusercontent.com/116461/69767270-4d3a7300-1130-11ea-9785-fc88c5dda79c.png" />

    > In order to generate a new token, simply visit [this page](https://github.com/settings/tokens/new), give it a name (e.g. `gistpad`), and then check the `gist` checkbox.

## Available Commands

In addition to the `Gists` view, this extension also provides the following commands:

* `GistPad: Open Gist` - Displays your list of Gists (if you're signed in), and then opens the files for the selected one. You can also specify a Gist ID directly, which doesn't require being signed in.

* `GistPad: Open Gist as Workspace` - Same behavior as the `GistPad: Open Gist` command, but will open the selected Gist as a workspace, istead of "loose files".

* `GistPad: New Gist` - Creates a new [public Gist](https://help.github.com/en/enterprise/2.13/user/articles/about-gists#public-gists), and then opens its associated files. If you'd like to seed the gist with multiple files, you can specify a comma-seperated list of names (e.g. `foo.txt,bar.js`).

* `GistPad: New Gist (Secret)` - Same behavior as the `GistPad: New Gist (Public)` command, except that it creates a [secret Gist](https://help.github.com/en/enterprise/2.13/user/articles/about-gists#secret-gists).

* `GistPad: Delete Gist` - Allows you to delete one of your Gists. If you have a Gist workspace open, it will delete that and then close the folde

* `GistPad: Starred Gists` - Lists your starred Gists, and then opens the files for the selected one.

* `GistPad: Fork Gist` - Forks the currently opened Gist, and then opens it as a virtual workspace.

* `GistPad: Sign In` - Sign-in with a GitHub token, in order to view/edit/delete your Gists.

* `GistPad: Sign Out` - Sign out of the currently authenticated GitHub session.

## Supported Filesystem Operations

Once you've opened a Gist, you can perform the following filesystem operations:

* Editing existing files
* Adding new files
* Renaming files
* Deleting files
* Copying/pasting files

> GitHub Gist doesn't support directories, and therefore, this extension doesn't allow you to create them.