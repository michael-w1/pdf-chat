"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// react-pdf touches browser-only APIs, so it cannot be server rendered.
const PdfRenderer = dynamic(() => import("./PdfRenderer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-lg border border-border bg-card">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

export default function PdfRendererClient({ url }: { url: string }) {
  return <PdfRenderer url={url} />;
}
