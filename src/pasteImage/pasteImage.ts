'use strict';

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { randomInt } from '../utils';

// class Logger {
//   static channel: vscode.OutputChannel;

//   static log(message: any) {
//     if (this.channel) {
//       let time = moment().format("MM-DD HH:mm:ss");
//       this.channel.appendLine(`[${time}] ${message}`);
//     }
//   }

//   static showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined> {
//     this.log(message);

//     return vscode.window.showInformationMessage(message, ...items);
//   }

//   static showErrorMessage(message: string, ...items: string[]): Thenable<string | undefined> {
//     this.log(message);
//     return vscode.window.showErrorMessage(message, ...items);
//   }
// }

export const createMDImage = (imageBits: Buffer): string => {
  const base64Str = imageBits.toString('base64');
  const imageSrc = `data:image/png;base64,${base64Str}`;

  // TODO: move to config
  const isImgPayload = true;
  const imageMarkup = (isImgPayload)
    ? `<img src="${imageSrc}" />`
    : `![image](${imageSrc})`;

  return imageMarkup;
}

export class Paster {
  // TODO: make it work on Windows
  public static getImageFromClipboardWin(): Promise<Buffer> {
    return new Promise((res) => {
      const imagePath = '';
      const scriptPath = path.join(__dirname, '../../res/pc.ps1');

      let command = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
      const powershellExisted = fs.existsSync(command)
      if (!powershellExisted) {
        command = 'powershell'
      }

      const powershell = spawn(command, [
        '-noprofile',
        '-noninteractive',
        '-nologo',
        '-sta',
        '-executionpolicy', 'unrestricted',
        '-windowstyle', 'hidden',
        '-file', scriptPath,
        imagePath
      ]);

      powershell.on('error', function (e: any) {
        // const { code } = e as any;

        // if (code === "ENOENT") {
        //   Logger.showErrorMessage(`The powershell command is not in you PATH environment variables.Please add it and retry.`);
        // } else {
        //   Logger.showErrorMessage(e);
        // }
      });

      powershell.on('exit', function (code, signal) {
        // console.log('exit', code, signal);
      });

      powershell.stdout.on('data', function (data: Buffer) {
        res(data);
        // cb(imagePath, data.toString().trim());
      });
    });
  }

  // TODO: remove temp image after the use
  public static getImageFromClipboardMac(): Promise<Buffer> {
    const imagePath = path.join(os.tmpdir(), `${randomInt()}_${randomInt()}.png`);
    return new Promise((res, rej) => {
      const scriptPath = path.join(__dirname, './scripts/mac.applescript');

      const ascript = spawn('osascript', [scriptPath, imagePath]);
      ascript.on('error', function (e: any) {
        // Logger.showErrorMessage(e);
      });
      ascript.on('exit', function (code, signal) {
        console.log('exit', code, signal);
      });
      ascript.stdout.on('data', function (data: Buffer) {
        const filePath = data.toString().trim();
        console.log(`path: ${filePath}`);

        try {
          const binary = fs.readFileSync(filePath);
          if (!binary) {
            rej('No temporary iamge file read');
          }
          res(binary);
        } catch (e) {
          console.log(e);
        }
      });
    });
  }

  // TODO: make it work in Linux
  public static getImageFromClipboardLinux(): Promise<Buffer> {
    const imagePath = '';
    return new Promise((res) => {
      let scriptPath = path.join(__dirname, '../../res/linux.sh');

      let ascript = spawn('sh', [scriptPath, imagePath]);
      ascript.on('error', function (e: any) {
        // Logger.showErrorMessage(e);
      });
      ascript.on('exit', function (code, signal) {
        // console.log('exit',code,signal);
      });
      ascript.stdout.on('data', function (data: Buffer) {
        let result = data.toString().trim();
        if (result == "no xclip") {
          // Logger.showInformationMessage('You need to install xclip command first.');
          return;
        }

        res(data);
      });
    });
  }

  public static async getImageFromClipboard(): Promise<Buffer> {
    const platform = process.platform;

    switch (platform) {
      case ('win32'): {
        return await Paster.getImageFromClipboardWin();
      }

      case ('darwin'): {
        return await Paster.getImageFromClipboardMac();
      }

      case ('linux'): {
        return await Paster.getImageFromClipboardLinux();
      }

      default: {
        throw new Error(`Not supported platform "${platform}".`);
      }
    }
  }
}

export const paster = new Paster();
