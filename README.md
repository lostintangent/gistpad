# GistPad

[![Join space](https://vslscommunitieswebapp.azurewebsites.net/badge/gistpad)](http://vslscommunitieswebapp.azurewebsites.net/join_redirect/gistpad)

GistPad is a Visual Studio Code extension that allows you to develop [GitHub Gists](https://gist.github.com/) entirely from within the editor. You can open, create, delete and fork Gists, and then seamlessly begin editing files, as if they were local. It's like your very own, cloud-based scratchpad, code snippet manager, knowledge base, [playground](#playgrounds) and [blog](#gistlog). Additionally, you can collaborate with your friends and colleagues by "following" them, so that you can access/browse/fork and comment on their Gists, directly from within Visual Studio Code 🚀

<img src="https://user-images.githubusercontent.com/116461/69910156-96274b80-13fe-11ea-9be4-d801f4e9c377.gif" width="750px" />

## Getting Started

1. Install this extension from the marketplace

   > **Linux Users**: Ensure you have the `gnome-keyring` and `libsecret` packages installed as well. These will enable GistPad to read/write your GitHub auth token securely.

   > **GitHub Enterprise users**: Set the `gistpad.apiUrl` setting to point at the API URL of your GitHub server instance (e.g. `https://[YOUR_HOST]/api/v3`).

1. Open the `Explorer` tab and expand the `Gists` view. From there, you can open a Gist by ID/URL, or sign-in in wth a GitHub token, in order to view/edit/create/delete Gists.

   <img width="300px" src="https://user-images.githubusercontent.com/116461/69827991-d56f5580-11ce-11ea-9081-17f27b470fd1.png" />

   > **Git+HTTPS Users**: If you've already signed-in to `github.com` with the `git` CLI, GistPad will attempt to provide SSO, assuming you're using HTTPS-based auth, and your login session includes the `gist` scope _(SSH-based auth isn't supported)_. Otherwise, you can generate an auth token by visiting [this page](https://github.com/settings/tokens/new), giving the token a name (e.g. `gistpad`), and ensuring to check the `gist` checkbox.

1. Add local files/snippets to your Gists by right-clicking them in the `Explorer` tree, or right-clicking an editor window, and selecting `Add Document to Gist`, `Add Selection to Gist` or `Paste Gist File` ([details](#contributed-commands-editor))

   <img width="250px" src="https://user-images.githubusercontent.com/116461/69903980-98819b00-1355-11ea-913b-c51981891bcd.png" />

1. View and reply to comments in a Gist by scrolling to the bottom of a Gist file and interacting with the thread (including embedded code snippets!)

   <img width="450px" src="https://user-images.githubusercontent.com/116461/70117955-a9633280-161b-11ea-88a5-ac8a15a3b7a0.png" />

1. Stay up-to-date with your friend's and colleague's Gists by following them via the `GistPad: Follow User` command

   <img width="252" src="https://user-images.githubusercontent.com/116461/69890797-c03e1800-12ef-11ea-85be-7d6fe2c8c7ef.png" />

## Gist Commenting

Gist comments are exposed within the editor at the bottom of any opened Gist files. If a Gist includes multiple files, then the comment thread will be displayed at the bottom of them all (duplicated and synchronized).

<img src="https://user-images.githubusercontent.com/116461/70118599-42467d80-161d-11ea-85eb-7f4cc6e4006b.gif" width="700px" />

If you're not authenticated, you can view existing comments, but you can't reply to them. If you are authenticated, you can add/reply, as well as edit/delete your own comments. In order to control the behavior of how Gist comment threads are displayed, refer to the `GistPad: Show Comment Thread` config setting.

## Pasting Images

In order to make it easy to author markdown files, that include images, you can copy images into your clipboard and then paste them directly into a gist file:

![paste-screenshot](https://user-images.githubusercontent.com/1478800/70382701-9a7ac980-1914-11ea-9fb0-6e55424e2e54.gif)

In order to paste an image into a gist file, use one of the following methods:

- From the editor's context menu: `Paste Screenshot` command (this only appears within GistPad-managed markdown files).
- From command palette: `GistPad: Paste Screenshot` command.
- Keyboard shortcut:
  - Windows/Linux: `ctrl + shift + v`
  - Mac OSx: `cmd + shift + v`

By default the screenshot gets uploaded as a `.png` file to the gist and the link is added to the gist as `Markdown` image markup. The behaviour can be changed using the follow settings:

- `Gistpad: Paste Screenshot Type`:

  - `file` (default): the screenshot is `uploaded` as a `.png` file to the gist.
  - `base64`: the screenshot is `base64`-embedded into the gist.

- `Gistpad: Paste Screenshot Output`

  - `markdown` (default): the `Markdown` format is used for the image markup, e.g. `![image](link)`.
  - `html`: the `HTML` format is used for the image markup, e.g. `<img src="link" />`.

## Playgrounds

If you're building web applications, and want to create a quick playground environment in order to experiment with HTML, CSS or JavaScript, you can right-click the `Your Gists` node and select `New Web Playground`. This will create a new Gist, seeded with an HTML, CSS and JavaScript file, and then provide you with a live preview Webview, so that you can iterate on the code and visually see how it behaves.

![Playgrounds](https://user-images.githubusercontent.com/116461/71195678-47254700-2243-11ea-9b09-aa28ec526185.gif)

Since the playground is backed by a Gist, your changes are saved and shareable with your friends. Additionally, as you find other playgrounds that you'd like to use, simply fork them and create your own playgrounds. That way, you can use Gists as "templates" for playground environments, and collaborate on them with others just like you would any other gist. When you done with a playground, simply clone the preview window and all other documents will be automatically closed. If you no longer need the playground, then delete it just like any other gist.

If you'd prefer to write TypeScript instead of JavaScript, simply rename the `index.js` file to `index.ts`, and the code will be transparently compiled for you as you write it. If you'd like to always use TypeScript, then set the `GistPad: Playground Script Language` setting to `typescript`, and all new playgrounds will include an `index.ts` file by default.

Finally, if you don't want/need HTML and/or CSS as part of your playgrounds, you can simply delete those files. If you want to supress these files when creating new playgrounds (e.g. because you're using React with "CSS in JS"), then you can set the `GistPad > Playground: Include Stylesheet` and/or `GistPad > Playground: Include Markup` settings to `false`.

## GistLog

In addition to being able to use Gists to share code snippets/files, you can also use it as a mini-blog, thanks to integration with [GistLog](https://gistlog.co). In order to start blogging, simply run the `GistPad: New GistLog` command, which will create a new Gist that includes two files: `blog.md` and `gistlog.yml`.

![GistLog](https://user-images.githubusercontent.com/116461/70856110-fdc3a900-1e8a-11ea-8e26-2c3917e11db0.gif)

The `blog.md` file will be automatically opened for editing, and as soon as you're ready to publish your post, open `gistlog.yml` and set the `published` property to `true`. Then, right-click your Gist and select the `Open Gist in GistLog` menu. This will open your browser to the URL that you can share with others, in order to read your new post.

In addition to being able to view individual posts on GistLog, you can also open your entire feed by right-clicking the `Your Gists` tree node and selecting the `Open Feed in GistLog` menu item. This will launch your GistLog landing page that displays are published GistLog posts.

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

## Configuration Settings

- `Gistpad: Api Url` - Specifies the GitHub API server to use. By default, this points at GitHub.com (`https://api.github.com`), but if you're using GitHub Enterprise, then you need to set this to the v3 API URL of your GitHub server. This should be something like `https://[YOUR_HOST]/api/v3`.

- `Gistpad: Git SSO` - Specifies whether to enable single sign-in (SSO) with the `git` CLI, when you've already authenticated with github.com. Defaults to `true`.

- `Gistpad: Paste Screenshot Type`: Specifies how to handle image pastes. Can be set to one of the following values:

  - `file` _(default)_: The pasted image is uploaded as a `.png` file to the gist, and a URL reference is added to the markdown file.
  - `base64`: The pasted image is base64-encoded and then embedded into the gist file.

- `Gistpad: Paste Screenshot Output`: Specifies the format to use when referencing the pasted image from a Gist file. Can be set to one of the following values:

  - `markdown` _(default)_: the `Markdown` format is used for the image markup, e.g. `![image](link)`.
  - `html`: the `HTML` format is used for the image markup, e.g. `<img src="link" />`.

* `GistPad > Playground: Include Markup` - Specifies whether to include a markup file (`index.html`) when creating new web playgrounds.

* `GistPad > Playground: Include Stylesheet` - Specifies whether to include a stylesheet file (`index.css`) when creating new web playgrounds.

* `GistPad > Playground: Script Language` - Specifies the default scripting language to use when creating new web playgrounds. Can be set to one of the following values:

  - `javascript` _(default)_: Will result in an `index.js` file being created whenever you create a new web playground.
  - `javascriptreact`: Will result in an `index.jsx` file being created whenever you create a new web playground.
  - `typescript`: Will result in an `index.ts` file being created whenever you create a new web playground.
  - `typescriptreact`: Will result in an `index.tsx` file being created whenever you create a new web playground.

* `GistPad: Show Comment Thread` - Specifies when to show the comment thread UI whenever you open a Gist file. Can be set to one of the following values:

  - `always`: Always display the comment thread whenever you open a Gist file. You can manually collapse it as needed.
  - `never`: Never automatically open the comment thread when you open a Gist file. You can manually expand it as needed.
  - `whenNotEmpty` _(default)_: Automatically display the comment thread whenever there are actually comments in a Gist file. Otherwise, leave it collapsed.

## Keyboard Shortcuts

- `Paste Screenshot` command:

  - Windows/Linux: `ctrl + shift + v`
  - Mac OSx: `cmd + shift + v`

## Supported Filesystem Operations

Once you've opened a Gist, you can perform the following filesystem operations:

- Editing existing files
- Adding new files
- Renaming files
- Deleting files
- Copying/pasting files

> GitHub Gist doesn't support directories, and therefore, this extension doesn't allow you to create them.

## Recommended Extensions

In order to improve the productivity of editing Gists, and make VS Code behave similarly to the GitHub.com experience, the following extensions are recommended, depending on how you expect to use Gists (e.g. markdown files, code snippets):

| Extension           | Stats                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Markdown All-in-One | [![Latest Release](https://vsmarketplacebadge.apphb.com/version-short/yzhang.markdown-all-in-one.svg)](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one) [![Installs](https://vsmarketplacebadge.apphb.com/installs/yzhang.markdown-all-in-one.svg)](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one) [![Rating](https://vsmarketplacebadge.apphb.com/rating-short/yzhang.markdown-all-in-one.svg)](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one) |
| Markdown Checkbox   | [![Latest Release](https://vsmarketplacebadge.apphb.com/version-short/bierner.markdown-checkbox.svg)](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-checkbox) [![Installs](https://vsmarketplacebadge.apphb.com/installs/bierner.markdown-checkbox.svg)](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-checkbox) [![Rating](https://vsmarketplacebadge.apphb.com/rating-short/bierner.markdown-checkbox.svg)](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-checkbox)       |
