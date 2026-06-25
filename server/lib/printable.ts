/**
 * Node-only PDF strategy. Instead of rendering with a headless Chromium binary
 * (unavailable in the Autoscale Node-only deploy runtime), we serve the existing
 * styled report HTML and let the user's own browser produce the PDF via the
 * native print dialog. This preserves all template styling and removes the
 * puppeteer dependency entirely.
 *
 * A small toolbar (hidden when printing) offers a one-click "Opslaan als PDF"
 * button, and the page auto-opens the print dialog shortly after load.
 */
export function printableHtml(html: string): string {
  const toolbar = `
  <style media="screen">
    .pdf-toolbar{position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;align-items:center;justify-content:space-between;gap:12px;
      padding:10px 16px;background:#1E3A5F;color:#fff;font-family:system-ui,-apple-system,sans-serif;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.15)}
    .pdf-toolbar button{background:#C9A84C;color:#1E3A5F;border:none;border-radius:8px;padding:8px 16px;font-weight:700;font-size:14px;cursor:pointer}
    .pdf-toolbar button:hover{filter:brightness(1.05)}
    body{margin-top:52px}
  </style>
  <style media="print">.pdf-toolbar{display:none!important}body{margin-top:0!important}</style>
  <div class="pdf-toolbar">
    <span>Gebruik &ldquo;Opslaan als PDF&rdquo; om dit rapport te downloaden.</span>
    <button onclick="window.print()">Opslaan als PDF</button>
  </div>
  <script>window.addEventListener('load',function(){setTimeout(function(){try{window.print()}catch(e){}},400)})</script>`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${toolbar}</body>`);
  }
  return `${html}${toolbar}`;
}
