import {
    AzureKeyCredential,
    SearchClient,
    SearchIndexClient,
    type SearchIndex,
} from "@azure/search-documents";
import { azureCredential, requireEnv } from "./credential";
import { EMBEDDING_DIMENSIONS } from "./openai";

/** One indexed chunk of a PDF. */
export type ChunkDocument = {
    /** Stable key: safe characters only, derived from file id and chunk number. */
    id: string;
    fileId: string;
    userId: string;
    page: number;
    content: string;
    contentVector: number[];
};

/** A retrieved chunk, with both ranking scores exposed for debugging. */
export type RetrievedChunk = {
    content: string;
    page: number;
    /** Fused keyword + vector score. */
    score: number;
    /** Semantic reranker score, present only when reranking ran. */
    rerankerScore?: number;
};

const SEMANTIC_CONFIG = "default-semantic";
const VECTOR_PROFILE = "default-vector-profile";
const HNSW_CONFIG = "default-hnsw";

const endpoint = () => requireEnv("AZURE_SEARCH_ENDPOINT");
export const indexName = () => process.env.AZURE_SEARCH_INDEX ?? "pdf-chunks";

function credential() {
    const key = process.env.AZURE_SEARCH_API_KEY;
    return key ? new AzureKeyCredential(key) : azureCredential();
}

let searchClient: SearchClient<ChunkDocument> | undefined;

function client(): SearchClient<ChunkDocument> {
    searchClient ??= new SearchClient<ChunkDocument>(endpoint(), indexName(), credential());
    return searchClient;
}

/** Search keys allow only letters, digits, underscore, dash and equals. */
export function buildChunkId(fileId: string, chunkIndex: number): string {
    return `${fileId}-${chunkIndex}`;
}

/**
 * The index definition, kept in code rather than clicked together in the
 * portal so it can be recreated and reviewed. Run `npm run azure:setup`.
 */
export function indexDefinition(): SearchIndex {
    return {
        name: indexName(),
        fields: [
            { name: "id", type: "Edm.String", key: true, filterable: true },
            { name: "fileId", type: "Edm.String", filterable: true },
            { name: "userId", type: "Edm.String", filterable: true },
            { name: "page", type: "Edm.Int32", filterable: true, sortable: true },
            {
                name: "content",
                type: "Edm.String",
                searchable: true,
                analyzerName: "en.microsoft",
            },
            {
                name: "contentVector",
                type: "Collection(Edm.Single)",
                searchable: true,
                vectorSearchDimensions: EMBEDDING_DIMENSIONS,
                vectorSearchProfileName: VECTOR_PROFILE,
            },
        ],
        vectorSearch: {
            algorithms: [{ name: HNSW_CONFIG, kind: "hnsw" }],
            profiles: [{ name: VECTOR_PROFILE, algorithmConfigurationName: HNSW_CONFIG }],
        },
        semanticSearch: {
            configurations: [
                {
                    name: SEMANTIC_CONFIG,
                    prioritizedFields: { contentFields: [{ name: "content" }] },
                },
            ],
        },
    };
}

/** Create the index, or update it in place if it already exists. */
export async function ensureIndex(): Promise<void> {
    const indexClient = new SearchIndexClient(endpoint(), credential());
    await indexClient.createOrUpdateIndex(indexDefinition());
}

/** Upload chunks. Batched because the service caps documents per request. */
export async function upsertChunks(chunks: ChunkDocument[]): Promise<void> {
    const BATCH = 100;
    for (let i = 0; i < chunks.length; i += BATCH) {
        await client().mergeOrUploadDocuments(chunks.slice(i, i + BATCH));
    }
}

/**
 * Hybrid retrieval: BM25 keyword scoring and vector similarity run together,
 * their rankings are fused, and the semantic reranker reorders what survives.
 *
 * `fileId` and `userId` are required rather than optional. Azure AI Search has
 * no namespace concept, so isolation depends entirely on this filter being
 * present. Making it part of the signature is what stops a future caller from
 * forgetting it and retrieving another user's documents.
 */
export async function hybridSearch(params: {
    query: string;
    queryVector: number[];
    fileId: string;
    userId: string;
    top: number;
}): Promise<RetrievedChunk[]> {
    const { query, queryVector, fileId, userId, top } = params;

    const results = await client().search(query, {
        top,
        filter: `fileId eq '${escapeOData(fileId)}' and userId eq '${escapeOData(userId)}'`,
        queryType: "semantic",
        semanticSearchOptions: { configurationName: SEMANTIC_CONFIG },
        vectorSearchOptions: {
            queries: [
                {
                    kind: "vector",
                    vector: queryVector,
                    fields: ["contentVector"],
                    // Over-fetch from the vector side so the reranker has
                    // more candidates than we ultimately keep.
                    kNearestNeighborsCount: Math.max(top * 4, 20),
                },
            ],
        },
        select: ["content", "page"],
    });

    const chunks: RetrievedChunk[] = [];
    for await (const result of results.results) {
        chunks.push({
            content: result.document.content,
            page: result.document.page,
            score: result.score,
            rerankerScore: result.rerankerScore,
        });
    }
    return chunks;
}

/** Remove every chunk belonging to a file. Used when a file is deleted. */
export async function deleteChunksForFile(fileId: string): Promise<void> {
    const found = await client().search("*", {
        filter: `fileId eq '${escapeOData(fileId)}'`,
        select: ["id"],
        top: 1000,
    });

    const ids: { id: string }[] = [];
    for await (const result of found.results) {
        ids.push({ id: result.document.id });
    }

    if (ids.length > 0) {
        await client().deleteDocuments(ids as ChunkDocument[]);
    }
}

/** Escape single quotes for an OData string literal. */
function escapeOData(value: string): string {
    return value.replace(/'/g, "''");
}
