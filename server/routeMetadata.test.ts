import { describe, expect, it } from "vitest";
import { injectRouteMetadata } from "./routeMetadata";

const indexHtml =
  '<!doctype html><html><head><title>Default</title><meta name="description" content="Default" /></head><body></body></html>';

describe("injectRouteMetadata", () => {
  it("injects canonical and Open Graph metadata for Founding 100", () => {
    const result = injectRouteMetadata(indexHtml, "/founding-100");

    expect(result).toContain(
      "<title>Founding 100-pilot | MijnComfortabel</title>"
    );
    expect(result).toContain('href="https://mijncomfortabel.nl/founding-100"');
    expect(result).toContain('property="og:url"');
  });

  it("leaves unrelated routes unchanged", () => {
    expect(injectRouteMetadata(indexHtml, "/privacy")).toBe(indexHtml);
  });
});
