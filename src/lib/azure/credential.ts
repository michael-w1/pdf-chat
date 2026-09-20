import { DefaultAzureCredential } from "@azure/identity";
import type { TokenCredential } from "@azure/core-auth";

/**
 * Shared Entra ID credential.
 *
 * `DefaultAzureCredential` walks a chain of sources: environment variables, a
 * workload/managed identity, then the Azure CLI. That means the same code runs
 * locally after `az login` and in Container Apps under its managed identity,
 * with no secrets in either place.
 *
 * Every Azure client in this app prefers an API key when one is configured and
 * falls back to this credential otherwise. Keys are the quick path for local
 * setup; managed identity is what production should use.
 */
let cached: TokenCredential | undefined;

export function azureCredential(): TokenCredential {
    cached ??= new DefaultAzureCredential();
    return cached;
}

/** Read an environment variable, throwing a setup-shaped error when missing. */
export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `Missing required environment variable ${name}. See .env.example and AZURE_SETUP.md.`
        );
    }
    return value;
}
