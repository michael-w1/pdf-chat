import {
    BlobSASPermissions,
    BlobServiceClient,
    SASProtocol,
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { azureCredential, requireEnv } from "./credential";

/** Largest PDF accepted, in bytes. Enforced server-side after upload. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

/** How long an upload SAS stays valid. Short, because it is write-capable. */
const UPLOAD_SAS_MINUTES = 15;
/** How long a read SAS stays valid. Covers one viewing session. */
const READ_SAS_MINUTES = 60;

const accountName = () => requireEnv("AZURE_STORAGE_ACCOUNT_NAME");
const containerName = () => process.env.AZURE_STORAGE_CONTAINER ?? "pdfs";

/**
 * An account key short-circuits SAS signing and is the simplest way to get
 * running locally. When it is absent we sign with a user delegation key, which
 * works under managed identity and leaves no long-lived secret anywhere.
 */
const accountKey = () => process.env.AZURE_STORAGE_ACCOUNT_KEY;

let serviceClient: BlobServiceClient | undefined;

function blobService(): BlobServiceClient {
    if (serviceClient) return serviceClient;

    const url = `https://${accountName()}.blob.core.windows.net`;
    const key = accountKey();

    serviceClient = key
        ? new BlobServiceClient(url, new StorageSharedKeyCredential(accountName(), key))
        : new BlobServiceClient(url, azureCredential());

    return serviceClient;
}

function blobClient(blobName: string) {
    return blobService().getContainerClient(containerName()).getBlockBlobClient(blobName);
}

/** Build the blob path for a user's upload. Namespacing by user aids auditing. */
export function buildBlobName(userId: string, fileId: string): string {
    return `${userId}/${fileId}.pdf`;
}

async function signedUrl(
    blobName: string,
    permissions: BlobSASPermissions,
    minutes: number
): Promise<string> {
    const startsOn = new Date(Date.now() - 5 * 60 * 1000); // clock skew allowance
    const expiresOn = new Date(Date.now() + minutes * 60 * 1000);

    const values = {
        containerName: containerName(),
        blobName,
        permissions,
        startsOn,
        expiresOn,
        protocol: SASProtocol.Https,
    };

    const key = accountKey();
    const sas = key
        ? generateBlobSASQueryParameters(
              values,
              new StorageSharedKeyCredential(accountName(), key)
          )
        : generateBlobSASQueryParameters(
              values,
              await blobService().getUserDelegationKey(startsOn, expiresOn),
              accountName()
          );

    return `${blobClient(blobName).url}?${sas.toString()}`;
}

/**
 * A write-only URL scoped to exactly one blob name chosen by the server. The
 * browser can create that blob and nothing else, and cannot read it back.
 */
export function createUploadUrl(blobName: string): Promise<string> {
    return signedUrl(blobName, BlobSASPermissions.from({ create: true, write: true }), UPLOAD_SAS_MINUTES);
}

/** A read-only URL for the PDF viewer. Minted per page load, never stored. */
export function createReadUrl(blobName: string): Promise<string> {
    return signedUrl(blobName, BlobSASPermissions.from({ read: true }), READ_SAS_MINUTES);
}

/**
 * Confirm the client actually uploaded what it claimed. A SAS token cannot cap
 * blob size, so the size check has to happen here, after the bytes land.
 */
export async function verifyUploadedBlob(
    blobName: string
): Promise<{ ok: true; size: number } | { ok: false; reason: string }> {
    const client = blobClient(blobName);

    if (!(await client.exists())) {
        return { ok: false, reason: "Upload was never completed" };
    }

    const { contentLength = 0, contentType } = await client.getProperties();

    if (contentLength === 0) {
        return { ok: false, reason: "Uploaded file is empty" };
    }
    if (contentLength > MAX_FILE_BYTES) {
        return { ok: false, reason: "File exceeds the 4 MB limit" };
    }
    if (contentType && !contentType.includes("pdf")) {
        return { ok: false, reason: "Uploaded file is not a PDF" };
    }

    return { ok: true, size: contentLength };
}

/** Download a blob into memory for processing. */
export async function downloadBlob(blobName: string): Promise<Buffer> {
    return blobClient(blobName).downloadToBuffer();
}

/** Remove a blob. Safe to call when it is already gone. */
export async function deleteBlob(blobName: string): Promise<void> {
    await blobClient(blobName).deleteIfExists();
}

/** Create the container if it does not exist. Private access, never public. */
export async function ensureContainer(): Promise<void> {
    await blobService().getContainerClient(containerName()).createIfNotExists();
}
