type RouteMetadata = {
  title: string;
  description: string;
  canonicalUrl: string;
};

const founding100Metadata: Record<string, RouteMetadata> = {
  "/founding-100": {
    title: "Founding 100-pilot | MijnComfortabel",
    description:
      "Word één van maximaal 100 pilotdeelnemers en bouw mee aan MijnComfortabel en MATI.",
    canonicalUrl: "https://mijncomfortabel.nl/founding-100",
  },
  "/founding-100/bedankt": {
    title: "Aanmelding ontvangen | Founding 100",
    description: "Je aanmelding voor de Founding 100-pilot is ontvangen.",
    canonicalUrl: "https://mijncomfortabel.nl/founding-100/bedankt",
  },
};

export function injectRouteMetadata(
  indexHtml: string,
  pathname: string
): string {
  const metadata = founding100Metadata[pathname];
  if (!metadata) return indexHtml;

  const withoutExistingCanonical = indexHtml.replace(
    /<link\s+rel=["']canonical["'][^>]*>/gi,
    ""
  );
  const withTitle = withoutExistingCanonical.replace(
    /<title>.*?<\/title>/i,
    `<title>${metadata.title}</title>`
  );
  const withDescription = withTitle.replace(
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${metadata.description}" />`
  );

  return withDescription.replace(
    "</head>",
    [
      `<link rel="canonical" href="${metadata.canonicalUrl}" />`,
      `<meta property="og:title" content="${metadata.title}" />`,
      `<meta property="og:description" content="${metadata.description}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:url" content="${metadata.canonicalUrl}" />`,
      "</head>",
    ].join("\n")
  );
}
