import { workspace } from "vscode";
import { EXTENSION_NAME } from "../../constants";

function getConfigSetting(settingName: string) {
  return workspace.getConfiguration(EXTENSION_NAME).get(`wikis.${settingName}`);
}

export const config = {
  get dailyDirectName() {
    return getConfigSetting("daily.directoryName");
  },
  get dailyTitleFormat() {
    return getConfigSetting("daily.titleFormat");
  },
  get dailyFilenameFormat() {
    return getConfigSetting("daily.filenameFormat");
  }
};
