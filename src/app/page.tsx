import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignUpButton } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";

const REPO_URL = "https://github.com/michael-w1/pdf-chat";

/** Drop a real screenshot here and the hero uses it automatically. */
const SCREENSHOT = "/demo.png";

/**
 * Read the screenshot's real pixel dimensions from the PNG header, so the
 * image is rendered at its own aspect ratio rather than cropped into a fixed
 * one. Swapping in a differently shaped capture then needs no code change.
 */
function screenshotMeta(): { width: number; height: number } | null {
  try {
    const file = path.join(process.cwd(), "public", "demo.png");
    const header = Buffer.alloc(24);
    const fd = fs.openSync(file, "r");
    try {
      fs.readSync(fd, header, 0, 24, 0);
    } finally {
      fs.closeSync(fd);
    }
    // PNG signature, then the IHDR chunk carries width and height at byte 16.
    if (header.toString("ascii", 1, 4) !== "PNG") return null;
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
  } catch {
    return null;
  }
}

export default async function Home() {
  const { userId } = await auth();
  const screenshot = screenshotMeta();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
      <section className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Ask a PDF what it actually says
        </h1>

        <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
          Upload a document and ask questions about it. Answers are built from
          the passages that were actually retrieved, and each one cites the
          pages it came from, so you can check it rather than trust it.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {userId ? (
            <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
              Open your documents
            </Link>
          ) : (
            <SignUpButton>
              <button className={buttonVariants({ size: "lg" })}>
                Try it
              </button>
            </SignUpButton>
          )}

          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden
              className="size-4 fill-current"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.49-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            View source
          </a>
        </div>
      </section>

      {/* The product itself, not an illustration of it. */}
      <section className="mt-14">
        {screenshot ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-foreground/5">
            <Image
              src={SCREENSHOT}
              alt="The document workspace: a PDF on the left, and a chat answer on the right citing the pages it came from."
              width={screenshot.width}
              height={screenshot.height}
              priority
              sizes="(max-width: 768px) 100vw, 1024px"
              className="h-auto w-full"
            />
          </div>
        ) : (
          <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center">
            <p className="text-sm font-medium">Screenshot goes here</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Save a capture of the document workspace to{" "}
              <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">
                public/demo.png
              </code>{" "}
              and it will appear automatically.
            </p>
          </div>
        )}
      </section>

      <section className="mt-20 max-w-2xl">
        <h2 className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
          How it works
        </h2>

        <dl className="mt-8 space-y-8">
          <div>
            <dt className="font-medium">Hybrid retrieval, then reranking</dt>
            <dd className="mt-1.5 leading-relaxed text-muted-foreground">
              Each question runs as a keyword search and a vector search at the
              same time. The two rankings are fused, then a reranking model
              reorders what survives. Embeddings alone are weak on exact
              strings like names and part numbers, and keyword search alone
              misses paraphrased questions. Running both covers each
              other&apos;s failures.
            </dd>
          </div>

          <div>
            <dt className="font-medium">Extraction that understands layout</dt>
            <dd className="mt-1.5 leading-relaxed text-muted-foreground">
              Documents are parsed into markdown rather than a flat text dump,
              so tables keep their rows and multi-column pages read in the
              right order instead of interleaving. Page numbers survive
              chunking, which is what makes the citations clickable.
            </dd>
          </div>

          <div>
            <dt className="font-medium">Secure uploads</dt>
            <dd className="mt-1.5 leading-relaxed text-muted-foreground">
              The browser uploads straight to blob storage using a write-only
              credential the server issues for one specific object, valid for
              fifteen minutes. It cannot choose where its bytes land or read
              anything back, and the server checks size and file type before
              any billable work starts.
            </dd>
          </div>

          <div>
            <dt className="font-medium">Containers, not serverless functions</dt>
            <dd className="mt-1.5 leading-relaxed text-muted-foreground">
              Parsing and embedding a long PDF takes ten seconds or more, which
              is uncomfortable against a serverless execution limit. Running as
              a container removes the ceiling, and scaling to zero means an
              idle app costs nothing.
            </dd>
          </div>
        </dl>

        <p className="mt-10 text-sm leading-relaxed text-muted-foreground">
          Built with Next.js, TypeScript and tRPC on Azure AI Search, Azure
          OpenAI, Document Intelligence and Container Apps. The{" "}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="text-brand underline underline-offset-4 hover:no-underline"
          >
            source and architecture notes
          </a>{" "}
          are on GitHub.
        </p>
      </section>
    </main>
  );
}
