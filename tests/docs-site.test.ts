import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderPage } from "../docs/src/pages.js";
import { findPage, navigation, normalizePath, pages } from "../docs/src/site.js";

describe("documentation site", () => {
  it("has unique routed pages with renderable headings", () => {
    const paths = pages.map((page) => page.path);
    expect(new Set(paths).size).toBe(paths.length);

    for (const page of pages) {
      const markup = renderToStaticMarkup(renderPage(page.path));
      expect(markup).toContain("<h1");
      expect(findPage(page.path)).toEqual(page);
    }
  });

  it("includes every non-home page in navigation exactly once", () => {
    const navigatedPaths = navigation.flatMap((group) => group.pages.map((page) => page.path));
    const expectedPaths = pages.filter((page) => page.path !== "/").map((page) => page.path);
    expect(navigatedPaths.sort()).toEqual(expectedPaths.sort());
  });

  it("normalizes route paths consistently", () => {
    expect(normalizePath("guide/search")).toBe("/guide/search/");
    expect(normalizePath("/guide/search?source=nav")).toBe("/guide/search/");
    expect(normalizePath("/")).toBe("/");
  });
});
