import * as vscode from "vscode";

const CONTRIBUTION_NAME = "gistpad.playgrounds.languages";

type PlaygroundLanguageType = "markup" | "stylesheet" | "script";

interface PlaygroundLanguageDefinition {
  type: PlaygroundLanguageType;
  extensions: string[];
  source: string;
}

const languages = new Map<PlaygroundLanguageType, Map<string, string>>();

export function getExtensions(type: PlaygroundLanguageType) {
  const languageDefinitions = languages.get(type);
  if (!languageDefinitions) {
    return [];
  }

  return Array.from(languageDefinitions.keys());
}

export async function compileCode(
  type: PlaygroundLanguageType,
  extension: string,
  code: string
): Promise<string | null> {
  const extensionId = languages.get(type)?.get(extension);
  if (!extensionId) {
    return null;
  }
  const compiler = await getExtension(extensionId);
  return compiler ? compiler(extension, code) : null;
}

async function getExtension(id: string) {
  const extensionInstance = vscode.extensions.getExtension(id);
  if (!extensionInstance) {
    return;
  }

  if (!extensionInstance.isActive) {
    await extensionInstance.activate();
  }

  return extensionInstance.exports?.gistPadCompile;
}

export function discoverLanguageProviders() {
  const languageDefinitions: PlaygroundLanguageDefinition[] = vscode.extensions.all.flatMap(
    (e) =>
      e.packageJSON.contributes && e.packageJSON.contributes[CONTRIBUTION_NAME]
        ? e.packageJSON.contributes[CONTRIBUTION_NAME].map((language: any) => ({
            source: e.id,
            ...language
          }))
        : []
  );

  languageDefinitions.forEach((language) => {
    if (!languages.has(language.type)) {
      languages.set(language.type, new Map());
    }

    language.extensions.forEach((extension) => {
      languages.get(language.type)!.set(extension, language.source);
    });
  });
}

vscode.extensions.onDidChange(discoverLanguageProviders);
