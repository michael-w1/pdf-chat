/**
 * Upload a file straight to Azure Blob Storage using a server-issued SAS URL.
 *
 * `XMLHttpRequest` rather than `fetch` because it reports upload progress,
 * which `fetch` still cannot do. Using the raw REST call also keeps the Azure
 * storage SDK out of the browser bundle entirely.
 */
export function uploadToBlob(params: {
    url: string;
    file: File;
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
}): Promise<void> {
    const { url, file, onProgress, signal } = params;

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url, true);

        // Required by the Blob Storage REST API for a single-shot block upload.
        xhr.setRequestHeader("x-ms-blob-type", "BlockBlob");
        xhr.setRequestHeader("Content-Type", file.type || "application/pdf");

        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            onProgress?.(Math.round((event.loaded / event.total) * 100));
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress?.(100);
                resolve();
            } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
            }
        };

        xhr.onerror = () =>
            reject(new Error("Upload failed. Check the storage account's CORS rules."));
        xhr.onabort = () => reject(new Error("Upload cancelled"));

        signal?.addEventListener("abort", () => xhr.abort(), { once: true });

        xhr.send(file);
    });
}
