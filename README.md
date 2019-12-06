# GistPad

[![Join space](https://vslscommunitieswebapp.azurewebsites.net/badge/gistpad)](http://vslscommunitieswebapp.azurewebsites.net/join_redirect/gistpad)

GistPad is a Visual Studio Code extension that allows you to develop [GitHub Gists](https://gist.github.com/) entirely from within the editor. You can open, create, delete and fork Gists, and then seamlessly begin editing files, as if they were local. It's like your very own, cloud-based scratchpad and code snippet manager. Additionally, you can collaborate with your friends and colleagues by "following" them, so that you can access/browse/fork and comment on their Gists, directly from within Visual Studio Code 🚀

<img src="https://user-images.githubusercontent.com/116461/69910156-96274b80-13fe-11ea-9be4-d801f4e9c377.gif" width="750px" />

## Getting Started

1. Install this extension from the marketplace

   > **Linux Users**: Ensure you have the `gnome-keyring` and `libsecret` packages installed as well. These will enable GistPad to read/write your GitHub auth token securely.

1. Open the `Explorer` tab and expand the `Gists` view. From there, you can open a Gist by ID/URL, or sign-in in wth a GitHub token, in order to view/edit/create/delete Gists.

   <img width="300px" src="https://user-images.githubusercontent.com/116461/69827991-d56f5580-11ce-11ea-9081-17f27b470fd1.png" />

   > In order to generate a new token, simply visit [this page](https://github.com/settings/tokens/new), give it a name (e.g. `gistpad`), and then check the `gist` checkbox.

1. Add existing files to your Gists by right-clicking them in the `Explorer` tree, or right-clicking an editor window, and selecting `Add Document to Gist`, `Add Selection to Gist` or `Paste Gist File` ([details](#contributed-commands-editor))

   <img width="250px" src="https://user-images.githubusercontent.com/116461/69903980-98819b00-1355-11ea-913b-c51981891bcd.png" />

1. View and reply to comments in a Gist by scrolling to the bottom of a Gist file interacting with the thread

    <img width="450px" src="https://user-images.githubusercontent.com/116461/70117955-a9633280-161b-11ea-88a5-ac8a15a3b7a0.png" />

2. Stay up-to-date with your friend's and colleague's Gists by following them via the `GistPad: Follow User` command

   <img width="252" src="https://user-images.githubusercontent.com/116461/69890797-c03e1800-12ef-11ea-85be-7d6fe2c8c7ef.png" />

## Gist Commenting

Gist comments are exposed within the editor at the bottom of any opened Gist files. If a Gist includes multiple files, then the comment thread will be displayed at the bottom of them all (duplicated and synchronized).

<img src="https://user-images.githubusercontent.com/116461/70118599-42467d80-161d-11ea-85eb-7f4cc6e4006b.gif" width="700px" />

If you're not authenticated, you can view existing comments, but you can't reply to them. If you are authenticated, you can add/reply, as well as edit/delete your own comments.

## Paste Screenshots

`> GistPad: Paste Screenshot` allows to paste screenshots from your clipboard:

![paste-screenshot](https://user-images.githubusercontent.com/1478800/70298532-d001a480-17a6-11ea-8ee2-3d0daf29097d.gif)

By default the screenshot gets uploaded as a `.png` file to the gist and the link is added to the gist as `Markdown` image markup. The behaviour can be changed using the next settings.

- `Gistpad: Paste Screenshot Type`:

  - `file` (default): the screenshot is `uploaded` as a `.png` file to the gist.
  - `base64`: the screenshot is `base64`-embedded into the gist.
  
- `Gistpad: Paste Screenshot Output`

  - `markdown` (default): the `Markdown` format is used for the image markup, e.g. `![image](link)`.
  - `html`: the `HTML` format is used for the image markup, e.g. `<img src="link" />`.


## Contributed Commands (File Explorer)

In addition to the `Gists` view, GistPad also contributes an `Add Document to Gist` command to the context menu of the `Explorer` file tree, which allows you to easily add local files to an existing or new Gist.

<img width="260px" src="https://user-images.githubusercontent.com/116461/69831695-58001100-11df-11ea-997e-fc8020556348.png" />

## Contributed Commands (Editor)

In addition to the `Explorer` file tree commands, GistPad also contributes the following commands to the editor's context menu:

- `Add Document to Gist` - Same behavior as the equivalent command in the `Explorer` tree

- `Add Selection to Gist` - Allows you to add a snippet/selection of code to a Gist, instead of the entire document

- `Paste Gist File` - Allows you to paste the contents of a Gist file into the active document

    <img width="250px" src="https://user-images.githubusercontent.com/116461/69903980-98819b00-1355-11ea-913b-c51981891bcd.png" />

## Contributed Commands (Command Palette)

In addition to the `Gists` view, this extension also provides the following commands:

- `GistPad: Follow User` - Follow another GitHub user, whuich allows you to browser/access/fork their Gists from within the `Gists` view.

- `GistPad: Paste Screenshot` - Paste screenshot from the clipboard.

- `GistPad: Open Gist` - Displays your list of Gists (if you're signed in), and then opens the files for the selected one. You can also specify a Gist ID directly, which doesn't require being signed in.

- `GistPad: Open Gist as Workspace` - Same behavior as the `GistPad: Open Gist` command, but will open the selected Gist as a workspace, istead of "loose files".

- `GistPad: New Gist` - Creates a new [public Gist](https://help.github.com/en/enterprise/2.13/user/articles/about-gists#public-gists), and then opens its associated files. If you'd like to seed the gist with multiple files, you can specify a comma-seperated list of names (e.g. `foo.txt,bar.js`).

- `GistPad: New Gist (Secret)` - Same behavior as the `GistPad: New Gist (Public)` command, except that it creates a [secret Gist](https://help.github.com/en/enterprise/2.13/user/articles/about-gists#secret-gists).

- `GistPad: Delete Gist` - Allows you to delete one of your Gists. If you have a Gist workspace open, it will delete that and then close the folde

- `GistPad: Starred Gists` - Lists your starred Gists, and then opens the files for the selected one.

- `GistPad: Fork Gist` - Forks the currently opened Gist, and then opens it as a virtual workspace.

- `GistPad: Sign In` - Sign-in with a GitHub token, in order to view/edit/delete your Gists.

- `GistPad: Sign Out` - Sign out of the currently authenticated GitHub session.

## Contributed Settings

- `Gistpad: Paste Screenshot Type`:

  - `file` (default): the screenshot is `uploaded` as a `.png` file to the gist.
  - `base64`: the screenshot is `base64`-embedded into the gist.
  
- `Gistpad: Paste Screenshot Output`

  - `markdown` (default): the `Markdown` format is used for the image markup, e.g. `![image](link)`.
  - `html`: the `HTML` format is used for the image markup, e.g. `<img src="link" />`.

## Supported Filesystem Operations

Once you've opened a Gist, you can perform the following filesystem operations:

- Editing existing files
- Adding new files
- Renaming files
- Deleting files
- Copying/pasting files

> GitHub Gist doesn't support directories, and therefore, this extension doesn't allow you to create them.
