/** Response header on /api/message carrying the retrieved page numbers, comma separated. */
export const SOURCE_PAGES_HEADER = "X-Source-Pages";

/** Parse the header value back into a sorted list of distinct page numbers. */
export function parseSourcePages(value: string | null | undefined): number[] {
    if (!value) return [];
    return [
        ...new Set(
            value
                .split(",")
                .map((s) => Number(s.trim()))
                .filter((n) => Number.isInteger(n) && n > 0)
        ),
    ].sort((a, b) => a - b);
}
