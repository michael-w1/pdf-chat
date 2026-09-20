import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// Chunking parameters for embedding. Overlap keeps sentences that straddle
// a boundary retrievable from either side.
export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 200;

export type PageMetadata = {
    source: string;
    /** 1-based page number in the original PDF. */
    page: number;
};

/**
 * Build one Document per page of extracted text, tagged with its page
 * number so answers can cite it. Pages with no text are dropped.
 */
export function buildPageDocuments(
    pages: string[],
    source: string
): Document<PageMetadata>[] {
    return pages
        .map(
            (pageText, i) =>
                new Document<PageMetadata>({
                    pageContent: pageText.trim(),
                    metadata: { source, page: i + 1 },
                })
        )
        .filter((doc) => doc.pageContent.length > 0);
}

/**
 * Split page documents into overlapping chunks. Whole pages can exceed the
 * embedding model's token limit and retrieve poorly. Every chunk keeps the
 * metadata of the page it came from.
 */
export async function chunkDocuments(
    docs: Document<PageMetadata>[],
    options: { chunkSize?: number; chunkOverlap?: number } = {}
): Promise<Document<PageMetadata>[]> {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: options.chunkSize ?? CHUNK_SIZE,
        chunkOverlap: options.chunkOverlap ?? CHUNK_OVERLAP,
    });
    return splitter.splitDocuments(docs) as Promise<Document<PageMetadata>[]>;
}
