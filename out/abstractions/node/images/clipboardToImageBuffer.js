"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clipboardToImageBuffer = exports.ClipboardToImageBuffer = void 0;
const child_process_1 = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const randomInt_1 = require("./utils/randomInt");
function createImagePath() {
    return path.join(os.tmpdir(), `${(0, randomInt_1.randomInt)()}_${(0, randomInt_1.randomInt)()}.png`);
}
class ClipboardToImageBuffer {
    async getImageBits() {
        const platform = process.platform;
        const imagePath = createImagePath();
        switch (platform) {
            case "win32":
                return await this.getImageFromClipboardWin(imagePath);
            case "darwin":
                return await this.getImageFromClipboardMac(imagePath);
            case "linux":
                return await this.getImageFromClipboardLinux(imagePath);
            default:
                throw new Error(`Not supported platform "${platform}".`);
        }
    }
    getImageFromClipboardWin(imagePath) {
        return new Promise((res, rej) => {
            const scriptPath = path.join(__dirname, "./scripts/win.ps1");
            let command = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
            const powershellExisted = fs.existsSync(command);
            if (!powershellExisted) {
                command = "powershell";
            }
            const powershell = (0, child_process_1.spawn)(command, [
                "-noprofile",
                "-noninteractive",
                "-nologo",
                "-sta",
                "-executionpolicy",
                "unrestricted",
                "-windowstyle",
                "hidden",
                "-file",
                scriptPath,
                imagePath
            ]);
            powershell.on("error", function (e) {
                const { code } = e;
                rej(code === "ENOENT"
                    ? "The powershell command is not in you PATH environment variables.Please add it and retry."
                    : e);
            });
            powershell.stdout.on("data", function (data) {
                const filePath = data.toString().trim();
                if (filePath === "no image") {
                    rej("No image found.");
                }
                const binary = fs.readFileSync(filePath);
                if (!binary) {
                    rej("No temporary image file read");
                }
                res(binary);
                fs.unlinkSync(imagePath);
            });
        });
    }
    getImageFromClipboardMac(imagePath) {
        return new Promise((res, rej) => {
            const scriptPath = path.join(__dirname, "./scripts/mac.applescript");
            const ascript = (0, child_process_1.spawn)("osascript", [scriptPath, imagePath]);
            ascript.on("error", (e) => {
                rej(e);
            });
            ascript.stdout.on("data", (data) => {
                const filePath = data.toString().trim();
                if (filePath === "no image") {
                    return rej("No image found.");
                }
                const binary = fs.readFileSync(filePath);
                if (!binary) {
                    return rej("No temporary image file read.");
                }
                fs.unlinkSync(imagePath);
                res(binary);
            });
        });
    }
    getImageFromClipboardLinux(imagePath) {
        return new Promise((res, rej) => {
            const scriptPath = path.join(__dirname, "./scripts/linux.sh");
            const ascript = (0, child_process_1.spawn)("sh", [scriptPath, imagePath]);
            ascript.on("error", function (e) {
                rej(e);
            });
            ascript.stdout.on("data", (data) => {
                const result = data.toString().trim();
                if (result === "no xclip") {
                    const message = "You need to install xclip command first.";
                    return rej(message);
                }
                if (result === "no image") {
                    const message = "Cannot get image in the clipboard.";
                    return rej(message);
                }
                const binary = fs.readFileSync(result);
                if (!binary) {
                    return rej("No temporary image file read.");
                }
                res(binary);
                fs.unlinkSync(imagePath);
            });
        });
    }
}
exports.ClipboardToImageBuffer = ClipboardToImageBuffer;
exports.clipboardToImageBuffer = new ClipboardToImageBuffer();
//# sourceMappingURL=clipboardToImageBuffer.js.map