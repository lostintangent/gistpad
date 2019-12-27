import * as vscode from "vscode";

export async function performSignInFlow() {
  const callableUri = await vscode.env.asExternalUri(
    vscode.Uri.parse(
      `${vscode.env.uriScheme}://vsls-contrib.gistfs/did-authenticate`
    )
  );
  await vscode.env.openExternal(callableUri);
}
