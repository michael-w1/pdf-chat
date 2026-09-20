import { describe, it, expect, vi } from "vitest";
import { checkMessageRateLimit } from "./rate-limit";

const NOW = new Date("2026-09-17T12:00:00Z").getTime();

describe("checkMessageRateLimit", () => {
    it("allows a user under the limit and reports remaining quota", async () => {
        const result = await checkMessageRateLimit(async () => 3, {
            max: 5,
            windowMs: 60_000,
            now: NOW,
        });

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(2);
    });

    it("blocks a user who has reached the limit", async () => {
        const result = await checkMessageRateLimit(async () => 5, {
            max: 5,
            windowMs: 60_000,
            now: NOW,
        });

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.retryAfterSeconds).toBe(60);
    });

    it("never reports negative remaining quota", async () => {
        const result = await checkMessageRateLimit(async () => 50, { max: 5 });
        expect(result.remaining).toBe(0);
    });

    it("counts only messages inside the window", async () => {
        const countSince = vi.fn<(since: Date) => Promise<number>>(async () => 0);

        await checkMessageRateLimit(countSince, { windowMs: 10 * 60_000, now: NOW });

        expect(countSince).toHaveBeenCalledTimes(1);
        expect(countSince).toHaveBeenCalledWith(new Date(NOW - 10 * 60_000));
    });
});
