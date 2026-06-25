import { describe, it, expect } from "vitest";
import { printableHtml } from "./lib/printable";

describe("printableHtml (Node-only PDF strategy)", () => {
  it("injects the print toolbar before </body>", () => {
    const input = "<html><body><h1>Rapport</h1></body></html>";
    const out = printableHtml(input);
    expect(out).toContain("<h1>Rapport</h1>");
    expect(out).toContain("pdf-toolbar");
    expect(out).toContain("Opslaan als PDF");
    // toolbar must come before the closing body tag
    expect(out.indexOf("pdf-toolbar")).toBeLessThan(out.indexOf("</body>"));
  });

  it("auto-triggers the browser print dialog on load", () => {
    const out = printableHtml("<html><body>x</body></html>");
    expect(out).toContain("window.print()");
    expect(out).toContain("addEventListener('load'");
  });

  it("hides the toolbar in print media so it never appears in the PDF", () => {
    const out = printableHtml("<html><body>x</body></html>");
    expect(out).toContain('media="print"');
    expect(out).toContain(".pdf-toolbar{display:none!important}");
  });

  it("does not reference puppeteer or any headless Chromium binary", () => {
    const out = printableHtml("<html><body>x</body></html>");
    expect(out.toLowerCase()).not.toContain("puppeteer");
    expect(out).not.toContain("/usr/bin/chromium");
  });

  it("appends the toolbar when there is no </body> tag (fragment input)", () => {
    const out = printableHtml("<div>fragment</div>");
    expect(out).toContain("<div>fragment</div>");
    expect(out).toContain("pdf-toolbar");
  });
});
