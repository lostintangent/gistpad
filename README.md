# GistPad 📘

GistPad is a Visual Studio Code extension that allows you to edit GitHub [Gists](https://gist.github.com/) and repositories from the comfort of your favorite editor. You can open, create, delete, fork and star gists and repositories, and then seamlessly begin editing files **as if they were local**, without ever cloning, pushing or pulling anything. It's like your very own developer library for building and referencing code snippets, commonly-used config/scripts, programming-related notes, [knowledge bases](#wikis) and [interactive samples](#codeswing).

<img src="https://user-images.githubusercontent.com/116461/69910156-96274b80-13fe-11ea-9be4-d801f4e9c377.gif" width="750px" />

## Table of Contents

- **[Getting Started](#getting-started)**
- **[Gist Management](#gist-management)**
  - [Sorting and grouping](#sorting-and-grouping)
  - [Files and Directories](#files-and-directories)
  - [Commenting](#gist-commenting)
  - [Pasting Images](#pasting-images)
  - [Following Users](#following-users)
  - [Exporting to Repositories](#exporting-to-repositories)
  - [Scratch Notes](#scratch-notes)
  - [Showcase](#showcase)
  - [GistLog](#gistlog)
- **[Repository Management](#repositories)**
  - [Branches](#branches)
  - [Wikis](#wikis)
- **[CodeSwing](#codeswing)**
- **[Contributed Commands](#contributed-commands-file-explorer)**
- **[Configuration Settings](#configuration-settings)**

## Getting Started

1. Install this extension from the marketplace and then reload VS Code

1. Open the `GistPad` tab _(look for the notebook icon in the activity bar)_. From there, you can open a Gist or GitHub repo by ID/URL, or sign in with a GitHub account in order to manage your [gists](#gist-management) and [repositories](#repositories).

   To sign-in, simply click the `Sign In` button and follow the provided flow in order to authenticate with your GitHub account.

From here, you can create and edit [gists](#gist-management), [repositories](#repositories), [wikis](#wikis) and [runnable code samples](#codeswing). Have fun and let us know how we can make your knowledge management experience even more awesome 🙌

## Gist Management

In order to create a new gist, simply open up the `Gists` tree in the `GistPad` tab, and click the `+` icon in the toolbar and specify the description and files to seed it with (including support for [directories](#files-and-directories)!). Additionally, you can create gists from local files or snippets, by right-clicking them in the `Explorer` tree, or right-clicking an editor window/tab, and selecting `Copy File to Gist`, `Add Selection to Gist` or `Paste Gist File Contents` ([details](#contributed-commands-editor))

<img width="250px" src="https://user-images.githubusercontent.com/116461/69903980-98819b00-1355-11ea-913b-c51981891bcd.png" />

> Alternative, you can run the `GistPad: New Gist` and `GistPad: New Secret Gist` commands to create gists.

From here, you can edit gist files by expanding the gist and clicking the desired file. Furthermore, you can open, rename, delete, etc. gists by right-clicking them in the tree and using one of the provided commands.

### Sorting and Grouping

By default, the `Gists` tree sorts gist by their update-time, which allows you to focus on the most recently used gists. However, if you'd like to sort your gists alphabetically, you can click the sort toggle button on the `Gists` tree's toolbar.

<img width="200px" src="https://user-images.githubusercontent.com/116461/75098896-65276480-5570-11ea-9880-a76347a15f73.png" />

Additionally, by default, your gists are displayed as a flat list. However, if you'd like to group them by type, you can click the group toggle button on the `Gists` tree's toolbar.

 <img width="200px" src="https://user-images.githubusercontent.com/116461/75098775-3fe62680-556f-11ea-8253-3198b00837e1.png" />

#### Gist Types

When grouping is enabled, gists are grouped into the following built-in types:

- **note** - Gists that are composed of nothing but `.txt`, `.md`/`.markdown` or `.adoc` files
- **notebook** - Gists that are compose of nothing by Jupyter Notebook files (`.ipynb`)
- **code-swing** - Gists that include either a `codeswing.json` file and/or an `index.html` file. Read more about swings [here](#codeswing).
- **code-swing-template** - Swings whose `codeswing.json` file sets the `template` property to `true`. Read more about swing templates [here](#user-templates).
- **code-swing-tutorial** - Swings whose `codeswing.json` file specifies a `tutorial` property. Read more about tutorials [here](#tutorials).
- **code-tour** - Gists that include a `main.tour` file, and were created by exporting a [CodeTour](#codetour).
- **diagram** - Gists that include a `.drawio` file.
- **flash-code** - Gists that include a `.deck` file.
- **code-snippet** - Gists that don't match any of the above more-specific types.

Additionally, if you want to group gists by your own custom types, then simply add a tag to the end of the gist's description, using the following format: `#tag` (or `#tag-name`). Then, when you enable grouping of gists, your gists will be grouped by both the aforementioned types, as well as your custom tag types. You can identify tag groups by the use of the `#` icon next to them.

<img width="200px" src="https://user-images.githubusercontent.com/116461/75264671-9c7e5700-57a4-11ea-9bee-eb61cfb9d2f0.png" />

### Files and Directories

When you create a gist via the `New Gist` (or `New Secret Gist`) command, you can specify a comma-separated list of file names to seed the gist with. Furthermore, you could add `/` to your filenames, in order to add them to a sub-directory within the gist. For example, if you create a new gist, and specify `todos/personal.txt,todos/work.txt,reminders.txt`, the gist will include a `reminders.txt` file at the root of the gist, and `personal.txt` and `reminders.txt` files within a new directory called `todos`.

<img width="200px" src="https://user-images.githubusercontent.com/116461/74593846-7b6b7880-4fe4-11ea-9bf8-722bf7887ef1.png" />

At any time, you can add new files to a gist or directory by right-clicking them and selecting `Add New File(s)` or `Upload File(s)`. You can also rename/delete directories as well, by right-clicking them in the tree and selecting the appropriate command. If you'd like to move a file from one directory to another, simply right-click the file, select `Rename File` and edit the directory name that it's in. It's that simple!

### Gist Commenting

Gist comments are exposed within the editor at the bottom of any opened Gist files. If a Gist includes multiple files, then the comment thread will be displayed at the bottom of them all (duplicated and synchronized).

<img src="https://user-images.githubusercontent.com/116461/70118599-42467d80-161d-11ea-85eb-7f4cc6e4006b.gif" width="700px" />

If you're not authenticated, you can view existing comments, but you can't reply to them. If you are authenticated, you can add/reply, as well as edit/delete your own comments. In order to control the behavior of how Gist comment threads are displayed, refer to the `GistPad > Comments: Show Thread` config setting.

### Pasting Images

In order to make it easy to author markdown and HTML/Pug files that include image assets, you can copy images into your clipboard (e.g. taking a screenshot, clicking `Copy Image` in your browser, etc.) and then paste them directly into a gist file by right-clicking the editor and selecting `Paste Image`, or using one of the following keyboard shortcuts: `ctrl + shift + v` _(Windows/Linux)_,`cmd + shift + v` _(macOS)_.

![paste-image](https://user-images.githubusercontent.com/1478800/70382701-9a7ac980-1914-11ea-9fb0-6e55424e2e54.gif)

By default, when you paste an image into a Gist file, it's uploaded as a `.png` to the gist, and the appropriate reference is added to it from the document (e.g. inserting an `<img />`). However, this behavior can be changed by using the `GistPad > Images: Paste Format` and/or `GistPad > Images: Paste Type` settings. Refer to the [config settings](#configuration-settings) section below for more details.

By default, when you paste an image, it is uploaded to a directory called `images` within the gist. However, if you'd like to change this (e.g. to `assets` instead), you can set the `GistPad > Images: Directory Name` setting.

### Following Users

GitHub Gists already allows you to star other user's gists, and when you do that, those will appear in the `Gists` tree, underneath a `Starred Gists` node. However, if you want to follow a GitHub user, and easily browse all of their current and future gists (without having to star each one!), you can run the `GistPad: Follow User` command and specify their GitHub user name. Once you've done that, you'll see a new node in the `Gists` tree which displays all of their public gists, and allows you to open/fork/clone/star them just like any other gist.

<img width="252" src="https://user-images.githubusercontent.com/116461/69890797-c03e1800-12ef-11ea-85be-7d6fe2c8c7ef.png" />

### Exporting to Repositories

At some point, your code/notes might outgrow the feature set offered by Gists (e.g. when you want to start collaborating on the content with other developers). In that event, you can simply right-click the gist, and select the `Export to Repository` command in order to create a new GitHub repository, that contains the content of your gist. The created repo will be public or private, depending on the public/private state of the exported gist.

### Scratch Notes

To make it easy to capture ephemeral/fleeting notes as you learn new things throughout the day, GistPad allows you to create "scratch notes" by clicking the `New scratch note...` command under the `Scratch Notes` node in the `Gists` tree (or running the `GistPad: New Scratch Note` command). A scratch note is simply a text document, whose name is formatted based on the day/time it was created.

By default, scratch notes create Markdown documents, but you can customize that behavior (e.g. to create text/AsciiDoc/etc. files) by customizing the `GistPad > Scratch Notes: File Extension` setting. Furthermore, scratch notes are created per day, but you can customize this by setting the `GistPad > Scratch Notes: Directory Format` and `GistPad > Scratch Notes: File Format` settings.

In order to help differentiate scratch notes from your "permanent notes", scratch notes appear as children of a top-level `Scratch Notes` node in the `Gists` tree. This makes it easy to view your outstanding scratch notes, so you can periodically audit them, in order to migrate any meaningful content to a more appropriate location (e.g. a new or existing gist).

<img width="200px" src="https://user-images.githubusercontent.com/116461/75699016-908f0b00-5c64-11ea-95d9-e8c8faf93738.png" />

You can create as many scratch notes as you need, and when you're done with them, you can delete individual notes and/or clear all of your notes by right-clicking the `Scratch Notes` node in the tree and selecting `Clear Scratch Notes`.

> Behind the scenes, scratch notes are simply files that are managed within a "special" secret gist on your behalf. This way, you can focus entirely on the ephemeral nature of the notes, and not worry about creating/deleting gists.

### Showcase

In order to illustrate what you can do with gists and [code swings](#codeswing), as well as keep up-to-date with the cool stuff that folks in the community are building, you can check out the `Showcase` view in the `GistPad` tab. This shows a list of categories, which are meant to highlight different use cases for gists, along with some examples. Simply click the `Open` button for any gist in order to explore it, or expand the gist to see its file contents. If you have a gist that you think is worth showcasing, please open an issue and let us know about it. Otherwise, we'll keep the showcase updated periodically, to highlight new and interesting things. So stay tuned!

<img width="250px" src="https://user-images.githubusercontent.com/116461/74891549-2c9f4500-533c-11ea-9bbb-c5907d41a589.png" />

### GistLog

In addition to being able to use Gists to share code snippets/files, you can also use it as a mini-blog, thanks to integration with [GistLog](https://gistlog.co). In order to start blogging, simply run the `GistPad: New GistLog` command, which will create a new Gist that includes two files: `blog.md` and `gistlog.yml`.

![GistLog](https://user-images.githubusercontent.com/116461/70856110-fdc3a900-1e8a-11ea-8e26-2c3917e11db0.gif)

The `blog.md` file will be automatically opened for editing, and as soon as you're ready to publish your post, open `gistlog.yml` and set the `published` property to `true`. Then, right-click your Gist and select the `Open Gist in GistLog` menu. This will open your browser to the URL that you can share with others, in order to read your new post.

In addition to being able to view individual posts on GistLog, you can also open your entire feed by right-clicking the `Your Gists` tree node and selecting the `Open Feed in GistLog` menu item. This will launch your GistLog landing page that displays are published GistLog posts.

## Repositories

In addition to managing gists, GistPad also allows you to create and edit GitHub repos without needing to clone anything locally. To get started, run the `GistPad: Open Repository` command, and specify/select the name of the repo you'd like to start managing. If you want to create a new repo, then select the `Create new repo` or `Create new private repo` options, then specify the name of the repo.

After running this command, you'll see a new `Repositories` tree in the `GistPad` tab, which displays the selected repo(s). From here, you can add/upload/edit/delete/rename files, and behind the scenes, your edits will be translated into commits on the respective repo. GistPad will automatically keep your data in sync with GitHub, so you never have to think about pushing or pulling. You can just focus on editing 🚀

<img width="250px" src="https://user-images.githubusercontent.com/116461/87234682-46dbcd00-c388-11ea-9c57-6ce0e8c3105a.png" />

> Note: Once you're managing at least one repository, you can create/manage new repositories by clicking the `+` icon in the toolbar of the `Repositories` tree.

### Directories

In order to create new directories, simply add a new file and include the directory names in the specified file's path (e.g. `foo/bar/baz.md`). GistPad will then create any necessary directories as part of the file creation process. Furthermore, if you want to move a file from one directory to another, simply right-click the file in the `Repositories` tree, select `Rename File`, and then specify the new directory name in the file's path.

### Repo Templates

In addition to creating a new repo "from scratch", you can also create a repository from a [repo template](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/creating-a-repository-from-a-template). To do this, simply run the `GistPad: Open Repository` command and select the `Create new repo from template` or `Create new private repo from template` options. You'll be presented with some "well-known" repo templates to select from, but you can also specify the name of an arbitrary repo template as well.

### Branches

By default, when you create/manage a repository, GistPad will assume you're interested in editing the `master` branch. However, when managing a repo, you can specify a different branch by appending `#<branch>` to the specified repo name (e.g. `vsls-contrib/gistpad#featureA`). When you're managing a non-master branch, the repo node in the `Repositories` tree will display the branch name.

If at any time, you want to switch branches, simply right-click the repo node in the `Repositories` tree and select `Switch Branch`. This will let you pick one of the repo's remote branches, as well as create a new branch. When you're done with a branch, simply right-click the repo and select either `Delete Branch` or `Merge Branch`. The later will perform a "squash merge" against `master`. Using branches allows you to "batch" change sets together, and then apply them in a single/semantic commit.

### Pasting Images

Just like gists, you can copy images into your clipboard (e.g. taking a screenshot, clicking `Copy Image` in your browser, etc.) and then paste them directly into a markdown file by right-clicking the editor and selecting `Paste Image`, or using one of the following keyboard shortcuts: `ctrl+shift+v` _(Windows/Linux)_,`cmd+shift+v` _(macOS)_.

By default, when you paste an image into a repo file, it's uploaded as a `.png` to the repo, and the appropriate reference is added to it from the document (e.g. an `[title](url)` link). However, this behavior can be changed by using the `GistPad > Images: Paste Format` and/or `GistPad > Images: Paste Type` settings. Refer to the [config settings](#configuration-settings) section below for more details. Furthermore, when you paste an image, it is uploaded to a directory called `images` within the gist. However, if you'd like to change this (e.g. to `assets` instead), you can set the `GistPad > Images: Directory Name` setting.

### Wikis

By default, when you create/manage a GitHub repository, GistPad will let you edit it like a remotely-accessible "file system". However, if you'd like to use the repo as a Roam/Obsidian-like wiki, that's composed of bi-directionally linked markdown pages, then you can indicate that the repo is a wiki in one of the following ways:

1. Including `wiki` in the repo's name (e.g. `lostintangent/gistpad-wiki`)
1. Adding a `gistpad.json` or `.vscode/gistpad.json` file to the repo itself

<img width="250px" src="https://user-images.githubusercontent.com/116461/87234704-83a7c400-c388-11ea-90a8-2a660bef4dc5.png" />

> Note: For interoperability with Foam, GistPad will also identify a repo as a wiki if it includes a `.vscode/foam.json` file.

#### Pages

Wikis are composed of "pages", which are markdown files that are identified using their `# Heading`, not their underlying file name. As a result, when you add a new page to a wiki, you simply give it a title/heading (e.g. `Todo List`), as opposed to a file path. Behind the scenes, GistPad will create a new markdown file and pre-populate file name and `# Heading` using the specified title.

Additionally, to make it really simple to add a new wiki page, you can either run the `GistPad: Add Wiki Page` command, or click the notebook icon in your status bar.

<img width="75px" src="https://user-images.githubusercontent.com/116461/100490918-7c354d00-30d4-11eb-97d1-28035258656b.png" />

> Note: While wikis add a "pages" abstraction layer on top of repos, they are still repos behind the scenes. As a result, if you like to add an arbitrary [file or directory](#files-and-directories) to your wiki, you can right-click it's node in the tree and select `Add New File`.

#### Daily Pages

In addition to being able to create topic-oriented pages, GistPad allows you to open your "today page" at any time, which makes it easy to keep track of your daily progress and/or journal. To open your current daily page (that represents today), simply click on the calendar icon to the right of the repo node in the `Repositories` tree. This will open a new page, that is titled based on the current date (e.g. `June 24, 2020`), and placed in a directory named `Daily`. If this page doesn't exist, GistPad will create it, otherwise, it will open the existing one.

<img width="800px" src="https://user-images.githubusercontent.com/116461/87234721-b356cc00-c388-11ea-946a-e7f9c92258a6.png" />

Additionally, to make it really simple to open your "today page", you can either run the `GistPad: Open Today Page` command, or click the calendar icon in your status bar.

<img width="75px" src="https://user-images.githubusercontent.com/116461/100490937-a981fb00-30d4-11eb-9e69-e7ab9b9bab61.png" />

> If you'd like to change the name of the directory that daily pages are stored in, you can set the `GistPad > Wikis > Daily: Directory Name` setting. Furthermore, if you want to change the format that is used to title daily pages, you can set the `GistPad > Wikis > Daily: Title Format` setting.

#### Links

In order to create connections between pages, you can add `[[links]]` to a page. When you type `[[`, GistPad will display a completion list of the name of all existing pages. Furthermore, you can type a new topic/page title, and GistPad will automatically create that page for you.

When a page includes `[[links]]`, they will be syntax highlighted, and you can hover over them to quickly see the context of the referenced page. Furthermore, you can `cmd+click` the link in order to directly jump to that page. If the page doesn't already exit, then `cmd+clicking` it will automatically create the page before opening it. This workflow makes it easy to author and navigate the set of pages within your wiki.

<img width="800px" src="https://user-images.githubusercontent.com/116461/87234714-96ba9400-c388-11ea-92c3-544d9a3bb633.png" />

#### Backlinks

When you add `[[links]]` to a page, the referenced page automatically detects the "back link", and displays it as a child node of the page in the `Repositories` tree. This allows you to navigate `[[links]]` bi-directionallly, and allows your wiki to form a "network" of information. Each back link displays a line preview of the reference, and when clicked will automatically navigate you to the page location that references the selected page.

Furthermore, when you open a page that contains backlinks, the set of backlinks will be displayed at the bottom of the page, including a line preview of the backlink. This makes it possible to have pages that don't actually include content themselves, but rather, are simply "topic aggregators" to view the connections between pages in the same wiki.

#### Embedding Files

In addition to adding links to pages, it's sometimes valuable to embed the contents of another page directly into a note, so that you can easily read them together. To do this, you can use the `![[link]]` syntax, where you'll recieve auto-completion support just like regular links. When you use an embed link, the target page's contents will be displayed within the note whenever you view it's markdown preview.

## CodeSwing

If you're building web applications, and want to create a quick playground environment in order to experiment with HTML, CSS or JavaScript (or [Sass/SCSS, Less, Pug and TypeScript](#additional-language-support)), you can install the [CodeSwing extension](https://aka.ms/codeswing), in order to have a CodePen-like web experience, integrated into VS Code. GistPad provides an integration with CodeSwing, and so once it's installed, you can right-click the `Your Gists` node in the `GistPad` tree and select `New CodeSwing` or `New Secret CodeSwing`. This will create a new gist, seeded with the selected template fiels, and then provide you with a live preview Webview, so that you can iterate on the code and visually see how it behaves.

When you create a new swing, you'll be asked to select a template, which is simply a way to get started quickly, using the libraries and languages you intend to use (e.g. React.js, Vue.js). Since the swing is backed by a Gist, your changes are saved and shareable with your friends. Additionally, as you find other swings that you'd like to use, simply fork them and create your own swings. That way, you can use Gists as "templates" for swing environments, and collaborate on them with others just like you would any other gist. When you're done with a swing, simply close the preview window and all other documents will be automatically closed. If you no longer need the swing, then delete it just like any other gist 👍

## Contributed Commands (File Explorer)

In addition to the `Gists` view, GistPad also contributes an `Copy File to Gist` command to the context menu of the `Explorer` file tree, which allows you to easily add local files to a new or existing Gist.

<img width="260px" src="https://user-images.githubusercontent.com/116461/69831695-58001100-11df-11ea-997e-fc8020556348.png" />

## Contributed Commands (Editor)

In addition to the `Explorer` file tree commands, GistPad also contributes the following commands to the editor's context menu:

- `Add Selection to Gist` - Allows you to add a snippet/selection of code to a Gist, instead of the entire document

- `Paste Gist File` - Allows you to paste the contents of a Gist file into the active editor

- `Paste Image` - Allows you to paste an image from your clipboard into a markdown, HTML or Pug file. The command will automatically upload the image and then add a reference to it.

<img width="250px" src="https://user-images.githubusercontent.com/116461/69903980-98819b00-1355-11ea-913b-c51981891bcd.png" />

The `Copy File to Gist` command is also available on the editor tab's context menu.

## Contributed Commands (Editor Title Bar)

In addition to the commands added to the editor context menu, GistPad also contributes the following commands to the editor's title bar menu (click the `...` in the upper right section of an editor window):

- `Rename File` - Allows you to rename the current file.

## Contributed Commands (Command Palette)

In addition to the `Gists` view, this extension also provides the following commands:

- `GistPad: Delete Gist` - Allows you to delete one of your Gists. If you have a Gist workspace open, it will delete that and then close the folder

- `GistPad: Follow User` - Follow another GitHub user, which allows you to browser/access/fork their Gists from within the `Gists` view.

- `GistPad: Fork Gist` - Forks the currently opened Gist, and then opens it as a virtual workspace.

- `GistPad: Open Gist` - Displays your list of Gists (if you're signed in), and then opens the files for the selected one. You can also specify a gist by URL, `username/id`, or ID, which doesn't require being signed in.

- `GistPad: Open Gist as Workspace` - Same behavior as the `GistPad: Open Gist` command, but will open the selected Gist as a workspace, instead of "loose files".

- `GistPad: New Gist` - Creates a new [public Gist](https://help.github.com/en/enterprise/2.13/user/articles/about-gists#public-gists), and then opens its associated files. If you'd like to seed the gist with multiple files, you can specify a comma-separated list of names (e.g. `foo.txt,bar.js`).

- `GistPad: New Scratch Note` - Creates a new "scratch note", which is a file whose name is derived from the `GistPad > Scratch Notes: Extension` and `Gist > Scratch Notes: Format` settings.

- `GistPad: New Secret Gist` - Same behavior as the `GistPad: New Gist (Public)` command, except that it creates a [secret Gist](https://help.github.com/en/enterprise/2.13/user/articles/about-gists#secret-gists).

- `GistPad: New CodeSwing` - Creates a new [CodeSwing](#CodeSwing).

- `GistPad: New GistLog` - Creates a [GistLog](#gistlog).

- `GistPad: Refresh Gists` - Refreshes the gist data and reloads the `Gists` tree.

- `GistPad: Sign In` - Sign-in with a GitHub account, in order to view/edit/delete your Gists.

- `GistPad: Starred Gists` - Lists your starred Gists, and then opens the files for the selected one.

- `GistPad: Paste Gist File - Allows you to paste the contents of a Gist file into the active editor

## Configuration Settings

- `Gistpad: Api Url` - Specifies the GitHub API server to use. By default, this points at GitHub.com (`https://api.github.com`), but if you're using GitHub Enterprise, then you need to set this to the v3 API URL of your GitHub server. This should be something like `https://[YOUR_HOST]/api/v3`.

* `Gistpad: Tree Icons` - Specifies whether to show the gist type icons in the gists tree.

* `GistPad > Comments: Show Thread` - Specifies when to show the comment thread UI whenever you open a Gist file. Can be set to one of the following values:

  - `always`: Always display the comment thread whenever you open a Gist file. You can manually collapse it as needed.
  - `never`: Never automatically open the comment thread when you open a Gist file. You can manually expand it as needed.
  - `whenNotEmpty` _(default)_: Automatically display the comment thread whenever there are actually comments in a Gist file. Otherwise, leave it collapsed.

* `Gistpad > Images: Paste Format`: Specifies the markup format to use when pasting an image into a gist file. Can be set to one of the following values:

  - `markdown` _(default)_: Pastes the image reference using `Markdown` format (e.g. `![image](link)`).
  - `html`: Pastes the image reference using `HTML` format (e.g. `<img src="link" />`). Note, when you paste an image into an HTML file, it will always use this format type, regardless what the setting is.

* `Gistpad > Images: Paste Type`: Specifies the method to use when pasting an image into a gist file. Can be set to one of the following values:

  - `file` _(default)_: The pasted image is uploaded as a `.png` to the gist, and a reference is added to file it's pasted into.
  - `base64`: The pasted image is base64-encoded and then embedded into the gist file.

* `Gistpad > Images: Upload Directory Name`: Specifies the name of the directory to upload images to. Defaults to `images`.

* `GistPad > Scratch Notes: Directory Format` - Specifies the [moment.js](https://momentjs.com/) format string to use when generating directories for new scratch notes. Defaults to `LL` (e.g. `March 6, 2020`).

* `GistPad > Scratch Notes: File Extension` - Specifies the file extension to use when generating new scratch notes. Defaults to `.md`.

* `GistPad > Scratch Notes: File Format` - Specifies the [moment.js](https://momentjs.com/) format string to use when generating new scratch notes. Defaults to `LT` (e.g. `2:52 PM`).

* `GistPad > Scratch Notes: Show` - Specifies whether or not to display the scratch notes node in the gists tree view. Defaults to `true`.

* `GistPad > Showcase URL` - Specifies the URL to use when displaying the showcase entry. This allows teams/classrooms/etc. to create their own showcase and share it amongst themselves.
