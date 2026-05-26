"use client";

import dynamic from "next/dynamic";

const PdfRenderer = dynamic(() => import("./PdfRender"), {
  ssr: false,
});

export default function PdfRendererClient({ url }: { url: string }) {
  return (

      <PdfRenderer url={url} />
    )
}