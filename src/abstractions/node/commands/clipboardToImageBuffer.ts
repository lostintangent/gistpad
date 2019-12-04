'use strict';

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { IClipboardToImageBuffer } from '../../../interfaces/IClipboardToImageBuffer';
import { log } from '../../../logger';
import { randomInt } from '../../../utils/randomInt';

const createImagePath = () => {
  const imagePath = path.join(os.tmpdir(), `${randomInt()}_${randomInt()}.png`);

  return imagePath;
}

const removeImage = (imagePath: string) => {
  fs.unlink(imagePath, (e: any | null) => {
    log.error(e);
  });
}

export class ClipboardToImageBuffer implements IClipboardToImageBuffer {
  public async getImageBits(): Promise<Buffer> {
    const platform = process.platform;
    const imagePath = createImagePath();

    switch (platform) {
      case 'win32': {
        return await this.getImageFromClipboardWin(imagePath);
      }

      case 'darwin': {
        return await this.getImageFromClipboardMac(imagePath);
      }

      case 'linux': {
        return await this.getImageFromClipboardLinux(imagePath);
      }

      default: {
        throw new Error(`Not supported platform "${platform}".`);
      }
    }
  }

  private getImageFromClipboardWin(imagePath: string): Promise<Buffer> {
    return new Promise((res) => {
      const scriptPath = path.join(__dirname, './scripts/win.ps1');

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
        log.error(e);

        const { code } = e as any;

        vscode.window.showErrorMessage(
          (code === "ENOENT")
            ? 'The powershell command is not in you PATH environment variables.Please add it and retry.'
            : e
        );
      });

      powershell.stdout.on('data', function (data: Buffer) {
        res(data);
        removeImage(imagePath);
      });
    });
  }

  // TODO: remove temp image after the use
  private getImageFromClipboardMac(imagePath: string): Promise<Buffer> {
    return new Promise((res, rej) => {
      const scriptPath = path.join(__dirname, './scripts/mac.applescript');

      const ascript = spawn('osascript', [scriptPath, imagePath]);
      ascript.on('error', function (e: any) {
        log.error(e);
      });

      ascript.stdout.on('data', function (data: Buffer) {
        const filePath = data.toString().trim();
        const binary = fs.readFileSync(filePath);

        if (!binary) {
          rej('No temporary image file read');
        }

        res(binary);

        removeImage(imagePath);
      });
    });
  }

  // TODO: make it work in Linux
  private getImageFromClipboardLinux(imagePath: string): Promise<Buffer> {
    return new Promise((res) => {
      const scriptPath = path.join(__dirname, './scripts/linux.sh');

      const ascript = spawn('sh', [scriptPath, imagePath]);
      ascript.on('error', function (e: any) {
        log.error(e);
      });

      ascript.stdout.on('data', function (data: Buffer) {
        let result = data.toString().trim();
        if (result === 'no xclip') {
          vscode.window.showErrorMessage('You need to install xclip command first.');
          return;
        }

        res(data);
        removeImage(imagePath);
      });
    });
  }
}

export const clipboardToImageBuffer = new ClipboardToImageBuffer();
