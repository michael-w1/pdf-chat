import { createAzure } from "@ai-sdk/azure";
import { embedMany } from "ai";
import { requireEnv } from "./credential";

/**
 * Azure OpenAI is addressed by *deployment name*, not model name. The
 * deployment is what you create in the portal or with the CLI, and it maps to
 * an underlying model such as gpt-4o-mini. Getting these confused is the most
 * common first-time error.
 */
export const CHAT_DEPLOYMENT = () => requireEnv("AZURE_OPENAI_CHAT_DEPLOYMENT");
export const EMBEDDING_DEPLOYMENT = () => requireEnv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT");

/** Must match the `vectorSearchDimensions` of the search index. */
export const EMBEDDING_DIMENSIONS = Number(
    process.env.AZURE_OPENAI_EMBEDDING_DIMENSIONS ?? 1536
);

let provider: ReturnType<typeof createAzure> | undefined;

function azure() {
    provider ??= createAzure({
        resourceName: requireEnv("AZURE_OPENAI_RESOURCE_NAME"),
        apiKey: requireEnv("AZURE_OPENAI_API_KEY"),
    });
    return provider;
}

/** Chat model used to answer questions. */
export function chatModel() {
    return azure()(CHAT_DEPLOYMENT());
}

/** Embed many strings in one call, preserving input order. */
export async function embedTexts(values: string[]): Promise<number[][]> {
    if (values.length === 0) return [];

    const { embeddings } = await embedMany({
        model: azure().textEmbeddingModel(EMBEDDING_DEPLOYMENT()),
        values,
    });
    return embeddings;
}

/** Embed a single string, for query-time vector search. */
export async function embedText(value: string): Promise<number[]> {
    const [embedding] = await embedTexts([value]);
    if (!embedding) throw new Error("Embedding request returned no vectors");
    return embedding;
}
