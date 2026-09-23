import { privateProcedure, router } from "./trpc";
import { TRPCError } from "@trpc/server";
import db from "@/lib/prisma";
import { z } from "zod";
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";
import {
    MAX_FILE_BYTES,
    buildBlobName,
    createUploadUrl,
    deleteBlob,
} from "@/lib/azure/blob";
import { deleteChunksForFile } from "@/lib/azure/search";
import { checkUploadRateLimit } from "@/lib/rate-limit";

export const appRouter = router({
    authCallback: privateProcedure.query(async ({ ctx }) => {
        const { user } = ctx;
        const email = user.emailAddresses[0]?.emailAddress;

        if (!email) throw new TRPCError({ code: "UNAUTHORIZED" });

        // Upsert so concurrent callback retries cannot race on create.
        await db.user.upsert({
            where: { id: user.id },
            create: { id: user.id, email },
            update: {},
        });

        return { success: true };
    }),

    getUserFiles: privateProcedure.query(async ({ ctx }) => {
        const { userId } = ctx;
        return await db.file.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }),

    /**
     * Reserve a blob name and hand back a write-only SAS URL for it.
     *
     * The server picks the path, so the browser cannot choose where its bytes
     * land or overwrite another user's object. The row is created up front in
     * PENDING state, which also gives the client the id it needs to request
     * processing once the upload finishes.
     */
    createUploadSlot: privateProcedure
        .input(
            z.object({
                name: z.string().trim().min(1).max(255),
                size: z.number().int().positive().max(MAX_FILE_BYTES),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId } = ctx;

            // Uploads are the expensive path: each one triggers layout
            // analysis billed per page plus embedding of every chunk. Checked
            // before the row is created, so a rejected request costs nothing.
            const rateLimit = await checkUploadRateLimit((since) =>
                db.file.count({ where: { userId, createdAt: { gte: since } } })
            );
            if (!rateLimit.allowed) {
                throw new TRPCError({
                    code: "TOO_MANY_REQUESTS",
                    message: "Upload limit reached. Please try again later.",
                });
            }

            const file = await db.file.create({
                data: {
                    name: input.name,
                    userId,
                    uploadStatus: "PENDING",
                    // Placeholder replaced below, once the generated id is known.
                    blobName: `pending/${crypto.randomUUID()}`,
                },
            });

            const blobName = buildBlobName(userId, file.id);
            await db.file.update({ where: { id: file.id }, data: { blobName } });

            return {
                fileId: file.id,
                uploadUrl: await createUploadUrl(blobName),
            };
        }),

    deleteFile: privateProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { userId } = ctx;

            const file = await db.file.findFirst({
                where: { id: input.id, userId },
            });

            if (!file) throw new TRPCError({ code: "NOT_FOUND" });

            // Best-effort cleanup of external resources. A failure here should
            // not block removing the file from the user's dashboard.
            try {
                await deleteChunksForFile(file.id);
            } catch (err) {
                console.error(`Failed to delete search chunks for ${file.id}:`, err);
            }

            try {
                await deleteBlob(file.blobName);
            } catch (err) {
                console.error(`Failed to delete blob ${file.blobName}:`, err);
            }

            // Messages are removed by the onDelete: Cascade relation.
            await db.file.delete({
                where: { id: input.id },
            });

            return file;
        }),

    getFileUploadStatus: privateProcedure
        .input(z.object({ fileId: z.string() }))
        .query(async ({ ctx, input }) => {
            const file = await db.file.findFirst({
                where: { id: input.fileId, userId: ctx.userId },
            });

            if (!file) return { status: "PENDING" as const };

            return { status: file.uploadStatus };
        }),

    getFileMessages: privateProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).nullish(),
                cursor: z.string().nullish(),
                fileId: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { userId } = ctx;
            const { fileId, cursor } = input;
            const limit = input.limit ?? INFINITE_QUERY_LIMIT;

            const file = await db.file.findFirst({
                where: { id: fileId, userId },
            });

            if (!file) throw new TRPCError({ code: "NOT_FOUND" });

            const messages = await db.message.findMany({
                take: limit + 1,
                where: { fileId },
                orderBy: { createdAt: "desc" },
                cursor: cursor ? { id: cursor } : undefined,
                select: {
                    id: true,
                    isUserMessage: true,
                    createdAt: true,
                    text: true,
                    sourcePages: true,
                },
            });

            let nextCursor: typeof cursor | undefined = undefined;

            if (messages.length > limit) {
                const nextItem = messages.pop();
                nextCursor = nextItem?.id;
            }

            return { messages, nextCursor };
        }),
});

export type AppRouter = typeof appRouter;
