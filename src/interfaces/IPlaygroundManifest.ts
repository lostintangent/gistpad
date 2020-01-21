import { ScriptType } from "./PlaygroundTypes";

export interface IPlaygroundManifest {
  scripts?: string[];
  styles?: string[];
  layout?: string;
  showConsole?: boolean;
  template?: boolean;
  scriptType?: ScriptType;
}
