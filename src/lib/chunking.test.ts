import { describe, it, expect } from "vitest";
import { buildPageDocuments, chunkDocuments, CHUNK_SIZE } from "./chunking";

describe("buildPageDocuments", () => {
    it("creates one document per page with a 1-based page number", () => {
        const docs = buildPageDocuments(["first", "second", "third"], "file.pdf");

        expect(docs).toHaveLength(3);
        expect(docs.map((d) => d.metadata.page)).toEqual([1, 2, 3]);
        expect(docs.every((d) => d.metadata.source === "file.pdf")).toBe(true);
    });

    it("drops blank pages but keeps original page numbers for the rest", () => {
        const docs = buildPageDocuments(["intro", "   \n  ", "", "outro"], "file.pdf");

        expect(docs.map((d) => d.pageContent)).toEqual(["intro", "outro"]);
        expect(docs.map((d) => d.metadata.page)).toEqual([1, 4]);
    });

    it("trims surrounding whitespace from page text", () => {
        const [doc] = buildPageDocuments(["  hello world \n"], "file.pdf");
        expect(doc.pageContent).toBe("hello world");
    });
});

describe("chunkDocuments", () => {
    it("leaves short pages as a single chunk each", async () => {
        const docs = buildPageDocuments(["short page one", "short page two"], "f");
        const chunks = await chunkDocuments(docs);

        expect(chunks).toHaveLength(2);
        expect(chunks.map((c) => c.metadata.page)).toEqual([1, 2]);
    });

    it("splits a long page into multiple chunks within the size limit", async () => {
        const sentence = "The quick brown fox jumps over the lazy dog. ";
        const longPage = sentence.repeat(120); // ~5400 chars
        const docs = buildPageDocuments([longPage], "f");

        const chunks = await chunkDocuments(docs);

        expect(chunks.length).toBeGreaterThan(1);
        for (const chunk of chunks) {
            expect(chunk.pageContent.length).toBeLessThanOrEqual(CHUNK_SIZE);
            expect(chunk.pageContent.length).toBeGreaterThan(0);
        }
    });

    it("keeps the source page number on every chunk", async () => {
        const longPage = "lorem ipsum dolor sit amet ".repeat(200);
        const docs = buildPageDocuments(["tiny", longPage], "f");

        const chunks = await chunkDocuments(docs);

        const pagesSeen = new Set(chunks.map((c) => c.metadata.page));
        expect(pagesSeen).toEqual(new Set([1, 2]));
        expect(chunks.filter((c) => c.metadata.page === 2).length).toBeGreaterThan(1);
    });

    it("overlaps consecutive chunks so boundary text appears in both", async () => {
        const words = Array.from({ length: 400 }, (_, i) => `w${i}`).join(" ");
        const docs = buildPageDocuments([words], "f");

        const chunks = await chunkDocuments(docs, { chunkSize: 200, chunkOverlap: 50 });

        expect(chunks.length).toBeGreaterThan(1);
        const first = chunks[0].pageContent.split(" ");
        const second = chunks[1].pageContent.split(" ");
        const tailOfFirst = first.slice(-3);
        expect(tailOfFirst.some((w) => second.includes(w))).toBe(true);
    });
});
