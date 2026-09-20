/**
 * Create the Azure resources this app owns: the blob container and the search
 * index. Both are idempotent, so this is safe to re-run after changing the
 * index definition in src/lib/azure/search.ts.
 *
 *   npm run azure:setup
 */
import "dotenv/config";
import { ensureContainer } from "../src/lib/azure/blob";
import { ensureIndex, indexName } from "../src/lib/azure/search";
import { EMBEDDING_DIMENSIONS } from "../src/lib/azure/openai";

async function main() {
    process.stdout.write("Creating blob container if missing... ");
    await ensureContainer();
    console.log("done");

    process.stdout.write(
        `Creating search index "${indexName()}" (${EMBEDDING_DIMENSIONS} dimensions)... `
    );
    await ensureIndex();
    console.log("done");

    console.log("\nAzure resources are ready.");
}

main().catch((err) => {
    console.error("\nSetup failed:", err instanceof Error ? err.message : err);
    process.exit(1);
});
