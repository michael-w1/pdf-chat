/**
 * Per-user rate limit for the chat endpoint. Uses the messages already
 * stored in the database as the counter, so it works across serverless
 * instances without extra infrastructure.
 */

export const RATE_LIMIT_MAX_MESSAGES = Number(process.env.MESSAGE_RATE_LIMIT ?? 20);
export const RATE_LIMIT_WINDOW_MS =
    Number(process.env.MESSAGE_RATE_WINDOW_SECONDS ?? 10 * 60) * 1000;

export type RateLimitResult = {
    allowed: boolean;
    /** Messages the user may still send in the current window. */
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
 * @param countSince Returns how many messages the user sent at or after `since`.
 */
export async function checkMessageRateLimit(
    countSince: (since: Date) => Promise<number>,
    options: Options = {}
): Promise<RateLimitResult> {
    const max = options.max ?? RATE_LIMIT_MAX_MESSAGES;
    const windowMs = options.windowMs ?? RATE_LIMIT_WINDOW_MS;
    const now = options.now ?? Date.now();

    const count = await countSince(new Date(now - windowMs));

    return {
        allowed: count < max,
        remaining: Math.max(0, max - count),
        retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
}
