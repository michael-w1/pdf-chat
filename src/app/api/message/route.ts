import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { NextRequest } from "next/server";
import db from "@/lib/prisma";
import { checkMessageRateLimit } from "@/lib/rate-limit";
import { hybridSearch } from "@/lib/azure/search";
import { chatModel, embedText } from "@/lib/azure/openai";
import { streamText, type ModelMessage } from "ai";
import { currentUser } from "@clerk/nextjs/server";
import { SOURCE_PAGES_HEADER } from "@/config/chat";

// Number of prior messages passed to the model as conversation history.
const HISTORY_LIMIT = 6;
// Number of document chunks retrieved from the index per question.
const CONTEXT_CHUNKS = 4;

export const POST = async (req: NextRequest) => {
    const user = await currentUser();
    if (!user?.id) return new Response("Unauthorized", { status: 401 });
    const userId = user.id;

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    const parsed = SendMessageValidator.safeParse(body);
    if (!parsed.success) {
        return new Response("Invalid request", { status: 400 });
    }
    const { fileId, message } = parsed.data;

    const file = await db.file.findFirst({
        where: { id: fileId, userId },
    });
    if (!file) return new Response("Not Found", { status: 404 });

    // Every call costs model tokens, so cap how fast a single user can send.
    const rateLimit = await checkMessageRateLimit((since) =>
        db.message.count({
            where: { userId, isUserMessage: true, createdAt: { gte: since } },
        })
    );
    if (!rateLimit.allowed) {
        return new Response("Too many messages. Please wait and try again.", {
            status: 429,
            headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        });
    }

    // Load history *before* inserting the new message so the current
    // question is not duplicated. Fetch the most recent messages, then
    // restore chronological order.
    const prevMessages = await db.message.findMany({
        where: { fileId },
        orderBy: { createdAt: "desc" },
        take: HISTORY_LIMIT,
    });
    prevMessages.reverse();

    await db.message.create({
        data: {
            text: message,
            isUserMessage: true,
            userId,
            fileId,
        },
    });

    // Hybrid retrieval: the question is matched both as keywords and as a
    // vector, the rankings are fused, and the semantic reranker orders the
    // survivors. The fileId and userId filter is what isolates this user's
    // document, since the index is shared across all files.
    const results = await hybridSearch({
        query: message,
        queryVector: await embedText(message),
        fileId,
        userId,
        top: CONTEXT_CHUNKS,
    });

    // Distinct, sorted page numbers behind this answer. Stored with the
    // message and sent ahead of the stream so the UI can render citations.
    const sourcePages = [
        ...new Set(results.map((r) => r.page).filter((p) => Number.isInteger(p) && p > 0)),
    ].sort((a, b) => a - b);

    const context = results
        .map((r) => `[Page ${r.page}]\n${r.content}`)
        .join("\n\n");

    const history: ModelMessage[] = prevMessages.map((msg) => ({
        role: msg.isUserMessage ? "user" : "assistant",
        content: msg.text,
    }));

    const result = streamText({
        model: chatModel(),
        temperature: 0,
        system: `You are a helpful assistant that answers questions about a PDF document.
Use the document excerpts below (and the previous conversation if relevant) to answer the user's question in markdown format.
The excerpts are markdown, so tables in them are real tables. Read them carefully before answering.
When you rely on an excerpt, mention its page number.
If the answer is not in the excerpts or the conversation, say that you don't know. Do not make up an answer.

DOCUMENT EXCERPTS:
${context}`,
        messages: [...history, { role: "user", content: message }],

        async onFinish({ text }) {
            try {
                await db.message.create({
                    data: {
                        text,
                        isUserMessage: false,
                        fileId,
                        userId,
                        sourcePages,
                    },
                });
            } catch (error) {
                console.error("Failed to store assistant message in DB:", error);
            }
        },
    });

    return result.toTextStreamResponse({
        headers: { [SOURCE_PAGES_HEADER]: sourcePages.join(",") },
    });
};
