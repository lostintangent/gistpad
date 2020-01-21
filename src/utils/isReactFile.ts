import * as path from "path";
import { REACT_EXTENSIONS } from "../commands/constants";
import { Gist } from "../store";

export const isReactFile = (fileName: string) => {
  return REACT_EXTENSIONS.includes(path.extname(fileName));
};

export const includesReactFiles = (gist: Gist) => {
  return Object.keys(gist.files).some(isReactFile);
};
