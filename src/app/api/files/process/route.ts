import { NextRequest } from "next/server";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs/server";
import db from "@/lib/prisma";
import { processFile } from "@/lib/process-file";

const BodyValidator = z.object({ fileId: z.string().min(1) });

/**
 * Kick off ingestion after the browser has uploaded straight to Blob Storage.
 *
 * Azure has no equivalent of a storage-provider upload callback, so the client
 * tells us the upload finished. That claim is not trusted: we re-check
 * ownership here and confirm the blob's existence, size and type before doing
 * any work.
 */
export const POST = async (req: NextRequest) => {
    const user = await currentUser();
    if (!user?.id) return new Response("Unauthorized", { status: 401 });

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    const parsed = BodyValidator.safeParse(body);
    if (!parsed.success) return new Response("Invalid request", { status: 400 });

    const file = await db.file.findFirst({
        where: { id: parsed.data.fileId, userId: user.id },
    });
    if (!file) return new Response("Not Found", { status: 404 });

    // Already done or already running: nothing to do, and re-running would
    // duplicate chunks and re-bill the analysis.
    if (file.uploadStatus === "SUCCESS" || file.uploadStatus === "PROCESSING") {
        return Response.json({ status: file.uploadStatus });
    }

    try {
        await processFile(file.id, user.id);
        return Response.json({ status: "SUCCESS" });
    } catch {
        // processFile has already recorded FAILED and logged the cause.
        return Response.json({ status: "FAILED" }, { status: 500 });
    }
};
