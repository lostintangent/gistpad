/// <reference types="jest" />

import { parse } from "node-html-parser";
import { RenderPlaygroundHtml } from "../../src/playgrounds/renderPlaygroundHtml";
import { mockGist1 } from "../mocks/gist1";

test("RenderPlaygroundHtml structure render", async () => {
  const renderHtml = new RenderPlaygroundHtml(mockGist1);

  const renderedDoc = await renderHtml.render();

  const result = `html
  head
    base
    style
    style##gistpad-styles
  body
    div#app
      h1
        #text
      p
        #text
      button
        #text
        span.fa.fa-heart
    script
    script`;

  const htmlRoot = parse(renderedDoc);

  expect(result).toBe((htmlRoot as any).firstChild.structure);
});
