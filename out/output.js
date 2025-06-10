"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Output = exports.messageType = void 0;
const vscode = require("vscode");
const config = require("./config");
var messageType;
(function (messageType) {
    messageType["Info"] = "Info";
    messageType["Warning"] = "Warning";
    messageType["Error"] = "Error";
    messageType["Verbose"] = "Verbose";
    messageType["Debug"] = "Debug";
})(messageType || (exports.messageType = messageType = {}));
class Output {
    constructor() {
        this.messageType = messageType;
        this._outputChannel = vscode.window.createOutputChannel("GistPad");
    }
    getDate() {
        const date = new Date();
        let timePart = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`;
        let datePart = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; // prettier-ignore
        return `${datePart} ${timePart}`;
    }
    appendLine(message, messageType) {
        if (config.get("output")) {
            this._outputChannel.appendLine(`${this.getDate()} - ${messageType}: ${message}`);
        }
    }
    hide() {
        this._outputChannel.hide();
    }
    show() {
        this._outputChannel.show();
    }
    dispose() {
        this._outputChannel.dispose();
    }
}
exports.Output = Output;
//# sourceMappingURL=output.js.map