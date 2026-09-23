/**
 * Per-user rate limits, counted from rows already in the database rather than
 * from an in-memory counter, so the limit holds across serverless instances
 * and container replicas without extra infrastructure.
 *
 * Two limits exist, for two different costs. Chat spends model tokens, which
 * are cheap. Uploads spend document analysis, billed per page, which is the
 * most expensive operation in the app, so its limit is much tighter.
 */

export const MESSAGE_RATE_LIMIT_MAX = Number(process.env.MESSAGE_RATE_LIMIT ?? 20);
export const MESSAGE_RATE_LIMIT_WINDOW_MS =
    Number(process.env.MESSAGE_RATE_WINDOW_SECONDS ?? 10 * 60) * 1000;

export const UPLOAD_RATE_LIMIT_MAX = Number(process.env.UPLOAD_RATE_LIMIT ?? 5);
export const UPLOAD_RATE_LIMIT_WINDOW_MS =
    Number(process.env.UPLOAD_RATE_WINDOW_SECONDS ?? 60 * 60) * 1000;

export type RateLimitResult = {
    allowed: boolean;
    /** How many more actions the user may take in the current window. */
    remaining: number;
    /** Seconds until the window has fully rolled over. */
    retryAfterSeconds: number;
};

type Options = {
    max?: number;
    windowMs?: number;
    now?: number;
};

/**
 * @param countSince Returns how many qualifying rows the user created at or
 *                   after `since`.
 */
export async function checkRateLimit(
    countSince: (since: Date) => Promise<number>,
    limits: { max: number; windowMs: number; now?: number }
): Promise<RateLimitResult> {
    const { max, windowMs } = limits;
    const now = limits.now ?? Date.now();

    const count = await countSince(new Date(now - windowMs));

    return {
        allowed: count < max,
        remaining: Math.max(0, max - count),
        retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
}

/** Chat messages. Defaults to 20 per 10 minutes. */
export function checkMessageRateLimit(
    countSince: (since: Date) => Promise<number>,
    options: Options = {}
): Promise<RateLimitResult> {
    return checkRateLimit(countSince, {
        max: options.max ?? MESSAGE_RATE_LIMIT_MAX,
        windowMs: options.windowMs ?? MESSAGE_RATE_LIMIT_WINDOW_MS,
        now: options.now,
    });
}

/**
 * Document uploads. Defaults to 5 per hour, because each one triggers
 * layout analysis billed per page plus embedding of every chunk.
 */
export function checkUploadRateLimit(
    countSince: (since: Date) => Promise<number>,
    options: Options = {}
): Promise<RateLimitResult> {
    return checkRateLimit(countSince, {
        max: options.max ?? UPLOAD_RATE_LIMIT_MAX,
        windowMs: options.windowMs ?? UPLOAD_RATE_LIMIT_WINDOW_MS,
        now: options.now,
    });
}
