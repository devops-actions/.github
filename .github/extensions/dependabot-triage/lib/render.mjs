// render.mjs — composes the full HTML document served to the canvas iframe.

import { CSS } from "./styles.mjs";
import { CLIENT_JS } from "./client.mjs";

export function renderIndexHtml() {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dependabot PR Triage</title>
    <style>${CSS}</style>
  </head>
  <body>
    <div id="app"></div>
    <script>${CLIENT_JS}</script>
  </body>
</html>`;
}
