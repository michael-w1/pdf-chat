import { describe, it, expect, vi } from "vitest";
import {
    UPLOAD_RATE_LIMIT_MAX,
    UPLOAD_RATE_LIMIT_WINDOW_MS,
    checkMessageRateLimit,
    checkRateLimit,
    checkUploadRateLimit,
} from "./rate-limit";

const NOW = new Date("2026-09-17T12:00:00Z").getTime();

describe("checkRateLimit", () => {
    it("allows a caller under the limit and reports remaining quota", async () => {
        const result = await checkRateLimit(async () => 3, {
            max: 5,
            windowMs: 60_000,
            now: NOW,
        });

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(2);
    });

    it("blocks a caller who has reached the limit", async () => {
        const result = await checkRateLimit(async () => 5, {
            max: 5,
            windowMs: 60_000,
            now: NOW,
        });

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.retryAfterSeconds).toBe(60);
    });

    it("never reports negative remaining quota", async () => {
        const result = await checkRateLimit(async () => 50, {
            max: 5,
            windowMs: 60_000,
        });
        expect(result.remaining).toBe(0);
    });

    it("counts only rows inside the window", async () => {
        const countSince = vi.fn<(since: Date) => Promise<number>>(async () => 0);

        await checkRateLimit(countSince, { windowMs: 10 * 60_000, max: 5, now: NOW });

        expect(countSince).toHaveBeenCalledTimes(1);
        expect(countSince).toHaveBeenCalledWith(new Date(NOW - 10 * 60_000));
    });
});

describe("checkMessageRateLimit", () => {
    it("applies explicit overrides", async () => {
        const result = await checkMessageRateLimit(async () => 5, {
            max: 5,
            windowMs: 60_000,
            now: NOW,
        });

        expect(result.allowed).toBe(false);
        expect(result.retryAfterSeconds).toBe(60);
    });

    it("defaults to a far looser limit than uploads", async () => {
        const result = await checkMessageRateLimit(async () => 6, { now: NOW });
        // Chat costs model tokens; uploads cost per-page analysis. Six actions
        // is fine for chat and already over the upload allowance.
        expect(result.allowed).toBe(true);
    });
});

describe("checkUploadRateLimit", () => {
    it("defaults to 5 uploads per hour", () => {
        expect(UPLOAD_RATE_LIMIT_MAX).toBe(5);
        expect(UPLOAD_RATE_LIMIT_WINDOW_MS).toBe(60 * 60 * 1000);
    });

    it("allows the fifth upload but blocks the sixth", async () => {
        const fifth = await checkUploadRateLimit(async () => 4, { now: NOW });
        expect(fifth.allowed).toBe(true);
        expect(fifth.remaining).toBe(1);

        const sixth = await checkUploadRateLimit(async () => 5, { now: NOW });
        expect(sixth.allowed).toBe(false);
        expect(sixth.remaining).toBe(0);
    });

    it("reports an hour of retry-after when blocked", async () => {
        const result = await checkUploadRateLimit(async () => 5, { now: NOW });
        expect(result.retryAfterSeconds).toBe(3600);
    });

    it("counts uploads over the past hour", async () => {
        const countSince = vi.fn<(since: Date) => Promise<number>>(async () => 0);

        await checkUploadRateLimit(countSince, { now: NOW });

        expect(countSince).toHaveBeenCalledWith(new Date(NOW - 60 * 60 * 1000));
    });
});
