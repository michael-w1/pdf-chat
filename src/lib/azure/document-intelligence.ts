import createClient, {
    getLongRunningPoller,
    isUnexpected,
    type AnalyzeOperationOutput,
    type DocumentIntelligenceClient,
} from "@azure-rest/ai-document-intelligence";
import { AzureKeyCredential } from "@azure/core-auth";
import { azureCredential, requireEnv } from "./credential";

let cached: DocumentIntelligenceClient | undefined;

function client(): DocumentIntelligenceClient {
    if (cached) return cached;

    const endpoint = requireEnv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT");
    const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY;

    cached = createClient(endpoint, key ? new AzureKeyCredential(key) : azureCredential());
    return cached;
}

/**
 * Extract a PDF as markdown, one entry per page.
 *
 * The `prebuilt-layout` model understands document structure, so tables stay
 * tables and multi-column pages read in the right order. Plain text extraction
 * interleaves columns and flattens tables into unusable runs of numbers, which
 * is exactly the content users ask questions about.
 */
export async function extractPages(pdf: Buffer): Promise<string[]> {
    const initial = await client()
        .path("/documentModels/{modelId}:analyze", "prebuilt-layout")
        .post({
            contentType: "application/octet-stream",
            body: pdf,
            queryParameters: {
                outputContentFormat: "markdown",
                // Offsets must line up with JavaScript string indexing, which
                // is UTF-16. The service default counts grapheme clusters and
                // would mis-slice any page containing emoji or similar.
                stringIndexType: "utf16CodeUnit",
            },
        });

    if (isUnexpected(initial)) {
        throw new Error(
            `Document Intelligence rejected the document: ${initial.body?.error?.message ?? initial.status}`
        );
    }

    const poller = getLongRunningPoller(client(), initial);
    const finished = (await poller.pollUntilDone()).body as AnalyzeOperationOutput;

    if (finished.status !== "succeeded" || !finished.analyzeResult) {
        throw new Error(
            `Document analysis did not succeed: ${finished.error?.message ?? finished.status}`
        );
    }

    const { content, pages } = finished.analyzeResult;

    // Each page carries spans pointing into the single markdown string.
    // Slicing by span is what preserves the page number for citations.
    if (!pages?.length) return content ? [content] : [];

    return pages.map((page) => {
        const text = (page.spans ?? [])
            .map((span) => content.slice(span.offset, span.offset + span.length))
            .join("\n")
            .trim();
        return text;
    });
}
