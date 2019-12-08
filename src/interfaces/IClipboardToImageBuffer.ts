
// abstraction over the clipboard
export interface IClipboardToImageBuffer {
    getImageBits(): Promise<Buffer>;
}