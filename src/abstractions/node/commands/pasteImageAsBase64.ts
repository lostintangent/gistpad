import { createImageMarkup } from "../../../utils/createImageMarkup";
import { pasteImageMarkup } from "../../../utils/pasteImageMarkup";
import { clipboardToImageBuffer } from "./clipboardToImageBuffer";

export const createBase64ImageSource = (imageBits: Buffer): string => {
  const base64Str = imageBits.toString("base64");
  const imageSrc = `data:image/png;base64,${base64Str}`;

  return imageSrc;
};

export const pasteImageAsBase64 = async (imageMarkupId: string | number) => {
  const imageBits = await clipboardToImageBuffer.getImageBits();
  const base64Image = createBase64ImageSource(imageBits);
  const imageMarkup = await createImageMarkup(base64Image);

  await pasteImageMarkup(imageMarkup, imageMarkupId);
};
