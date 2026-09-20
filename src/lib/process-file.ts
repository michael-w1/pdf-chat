import db from "@/lib/prisma";
import { buildPageDocuments, chunkDocuments } from "@/lib/chunking";
import { deleteBlob, downloadBlob, verifyUploadedBlob } from "@/lib/azure/blob";
import { extractPages } from "@/lib/azure/document-intelligence";
import { embedTexts } from "@/lib/azure/openai";
import { buildChunkId, upsertChunks, type ChunkDocument } from "@/lib/azure/search";

/**
 * Turn an uploaded PDF into searchable chunks.
 *
 * This runs inside a normal request rather than a queue. That is only viable
 * because the app is hosted on Container Apps, which has no serverless
 * execution ceiling. A dedicated worker is still the right end state, and is
 * listed as a known limitation in the README.
 */
export async function processFile(fileId: string, userId: string): Promise<void> {
    const file = await db.file.findFirst({ where: { id: fileId, userId } });
    if (!file) throw new Error(`File ${fileId} not found for user`);

    await db.file.update({
        where: { id: file.id },
        data: { uploadStatus: "PROCESSING" },
    });

    try {
        // The upload SAS could not enforce size or type, so verify here before
        // spending money on analysis and embeddings.
        const check = await verifyUploadedBlob(file.blobName);
        if (!check.ok) {
            await deleteBlob(file.blobName);
            throw new Error(check.reason);
        }

        const pdf = await downloadBlob(file.blobName);
        const pages = await extractPages(pdf);

        const pageDocs = buildPageDocuments(pages, file.blobName);
        if (pageDocs.length === 0) {
            throw new Error("No extractable text found in PDF");
        }

        const chunks = await chunkDocuments(pageDocs);
        const vectors = await embedTexts(chunks.map((c) => c.pageContent));

        const documents: ChunkDocument[] = chunks.map((chunk, i) => ({
            id: buildChunkId(file.id, i),
            fileId: file.id,
            userId,
            page: chunk.metadata.page,
            content: chunk.pageContent,
            contentVector: vectors[i]!,
        }));

        await upsertChunks(documents);

        await db.file.update({
            where: { id: file.id },
            data: { uploadStatus: "SUCCESS" },
        });
    } catch (err) {
        console.error(`Processing failed for file ${fileId}:`, err);

        try {
            await db.file.update({
                where: { id: file.id },
                data: { uploadStatus: "FAILED" },
            });
        } catch (dbErr) {
            console.error("Could not mark file FAILED:", dbErr);
        }

        throw err;
    }
}
