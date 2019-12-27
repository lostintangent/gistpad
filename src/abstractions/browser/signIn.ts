import * as vscode from "vscode";

export async function performSignInFlow(): Promise<string | undefined> {
  const callableUri = await vscode.env.asExternalUri(
    vscode.Uri.parse(
      `${vscode.env.uriScheme}://vsls-contrib.gistfs/did-authenticate`
    )
  );
  await vscode.env.openExternal(callableUri);

  // Return empty token since the url handler will fetch token from keytar and initialize auth.
  return;
}
