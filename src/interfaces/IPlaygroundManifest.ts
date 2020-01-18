import { ScriptType } from "../commands/playground";

export interface IPlaygroundManifest {
  scripts?: string[];
  styles?: string[];
  layout?: string;
  showConsole?: boolean;
  template?: boolean;
  scriptType?: ScriptType;
}
