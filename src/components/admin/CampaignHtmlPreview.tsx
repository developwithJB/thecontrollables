import React from "react";
const PREVIEW_CSP =
  "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-src 'none'";
/** Opaque sandbox: campaign markup never shares the admin page's origin. */
export function CampaignHtmlPreview({ html }: { html: string }) {
  const document = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}"></head><body>${html}</body></html>`;
  return React.createElement("iframe", {
    title:"Campaign email preview", sandbox:"", referrerPolicy:"no-referrer", srcDoc:document,
    className:"h-[400px] w-full border-0 bg-white",
  });
}
