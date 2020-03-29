import { commands, TextDocument, ViewColumn, window } from "vscode";
import * as config from "../config";

enum EditorLayoutOrientation {
  horizontal = 0,
  vertical = 1
}

const EditorLayouts = {
  splitOne: {
    orientation: EditorLayoutOrientation.horizontal,
    groups: [{}, {}]
  },
  splitTwo: {
    orientation: EditorLayoutOrientation.horizontal,
    groups: [
      {
        orientation: EditorLayoutOrientation.vertical,
        groups: [{}, {}],
        size: 0.5
      },
      { groups: [{}], size: 0.5 }
    ]
  },
  splitThree: {
    orientation: EditorLayoutOrientation.horizontal,
    groups: [
      {
        orientation: EditorLayoutOrientation.vertical,
        groups: [{}, {}, {}],
        size: 0.5
      },
      { groups: [{}], size: 0.5 }
    ]
  },
  grid: {
    orientation: EditorLayoutOrientation.horizontal,
    groups: [
      {
        orientation: EditorLayoutOrientation.vertical,
        groups: [{}, {}],
        size: 0.5
      },
      {
        orientation: EditorLayoutOrientation.vertical,
        groups: [{}, {}],
        size: 0.5
      }
    ]
  }
};

export enum PlaygroundLayout {
  grid = "grid",
  preview = "preview",
  splitBottom = "splitBottom",
  splitLeft = "splitLeft",
  splitLeftTabbed = "splitLeftTabbed",
  splitRight = "splitRight",
  splitRightTabbed = "splitRightTabbed",
  splitTop = "splitTop"
}

export async function createLayoutManager(
  includedFiles: number,
  layout?: string
) {
  if (!layout) {
    layout = await config.get("playgrounds.layout");
  }

  let currentViewColumn = ViewColumn.One;
  let previewViewColumn = includedFiles + 1;

  let editorLayout: any;
  if (includedFiles === 3) {
    editorLayout =
      layout === PlaygroundLayout.grid
        ? EditorLayouts.grid
        : EditorLayouts.splitThree;
  } else if (includedFiles === 2) {
    editorLayout = EditorLayouts.splitTwo;
  } else {
    editorLayout = EditorLayouts.splitOne;
  }

  if (layout === PlaygroundLayout.splitRight) {
    editorLayout = {
      ...editorLayout,
      groups: [...editorLayout.groups].reverse()
    };

    currentViewColumn = ViewColumn.Two;
    previewViewColumn = ViewColumn.One;
  } else if (layout === PlaygroundLayout.splitTop) {
    editorLayout = {
      ...editorLayout,
      orientation: EditorLayoutOrientation.vertical
    };
  } else if (layout === PlaygroundLayout.splitBottom) {
    editorLayout = {
      orientation: EditorLayoutOrientation.vertical,
      groups: [...editorLayout.groups].reverse()
    };

    currentViewColumn = ViewColumn.Two;
    previewViewColumn = ViewColumn.One;
  } else if (layout === PlaygroundLayout.splitLeftTabbed) {
    editorLayout = EditorLayouts.splitOne;
    previewViewColumn = ViewColumn.Two;
  } else if (layout === PlaygroundLayout.splitRightTabbed) {
    editorLayout = EditorLayouts.splitOne;

    currentViewColumn = ViewColumn.Two;
    previewViewColumn = ViewColumn.One;
  }

  await commands.executeCommand("workbench.action.closeAllEditors");

  // The preview layout mode only shows a single file,
  // so there's no need to set a custom editor layout for it.
  if (includedFiles > 0 && layout !== PlaygroundLayout.preview) {
    await commands.executeCommand("vscode.setEditorLayout", editorLayout);
  }

  return {
    previewViewColumn,
    showDocument: async function(
      document: TextDocument,
      preserveFocus: boolean = true
    ) {
      if (layout === PlaygroundLayout.preview) {
        return;
      }

      const editor = window.showTextDocument(document, {
        preview: false,
        viewColumn: currentViewColumn,
        preserveFocus
      });

      if (
        layout !== PlaygroundLayout.splitLeftTabbed &&
        layout !== PlaygroundLayout.splitRightTabbed
      ) {
        currentViewColumn++;
      }

      return editor;
    }
  };
}
