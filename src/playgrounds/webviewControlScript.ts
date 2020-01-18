import { CSS_ELEMENT_ID } from "../constants";

export const webviewControlScript = `
<script src="https://cdn.jsdelivr.net/npm/mock-xmlhttprequest@5.1.0/dist/mock-xmlhttprequest.min.js"></script>
<script>

// Wrap this code in braces, so that none of the variables
// conflict with variables created by a playground's scripts.
{
  document.getElementById("_defaultStyles").remove();

  const vscode = acquireVsCodeApi();
  const style = document.getElementById("${CSS_ELEMENT_ID}");

  let httpRequestId = 1;
  const pendingHttpRequests = new Map();

  window.addEventListener("message", ({ data }) => {    
    if (data.command === "updateCSS") {
      style.textContent = data.value;
    } else if (data.command === "httpResponse") {
      const xhr = pendingHttpRequests.get(data.value.id);
      xhr.respond(data.value.status, JSON.parse(data.value.headers), data.value.body, data.value.statusText);
      pendingHttpRequests.delete(data.value.id);
    }
  });

  function serializeMessage(message) {
    if (typeof message === "string") {
      return message
    } else {
      return JSON.stringify(message);
    }
  }

  window.alert = (message) => {
    const value = serializeMessage(message);
    vscode.postMessage({
      command: "alert",
      value
    });
  };

  console.clear = () => {
    vscode.postMessage({
      command: "clear",
      value: ""
    });
  };

  console.log = (message) => {
    const value = serializeMessage(message);
    vscode.postMessage({
      command: "log",
      value
    });
  };

  const mockXHRServer = MockXMLHttpRequest.newServer();
  mockXHRServer.setDefaultHandler((xhr) => {
    pendingHttpRequests.set(httpRequestId, xhr);
    vscode.postMessage({
      command: "httpRequest",
      value: {
        id: httpRequestId++,
        url: xhr.url,
        method: xhr.method,
        body: xhr.body,
        headers: JSON.stringify(xhr.headers || {})
      }
    });
  });
  mockXHRServer.install(window);
}

</script>
`;
